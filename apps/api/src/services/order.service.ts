import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { ORDER_STATUS_TRANSITIONS, OrderStatus } from '@iventia/shared'
import { determinePricingTier, getPriceForTier, calculateLineTotal, calculateOrderTotals, calculateTimeUnitValue } from './pricing.service'
import { auditService } from './audit.service'
import Decimal from 'decimal.js'

// Generate sequential order number: ORD-YYYY-NNNN
export async function generateOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ORD-${year}-`
  const last = await prisma.order.findFirst({
    where: { tenantId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  })
  const lastNum = last ? parseInt(last.orderNumber.replace(prefix, ''), 10) : 0
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
}

export interface CreateOrderInput {
  tenantId: string
  eventId: string
  clientId: string
  billingClientId?: string
  standId?: string
  priceListId: string
  startDate?: Date
  endDate?: Date
  notes?: string
  departamento?: string
  organizacionId?: string
  isCreditNote?: boolean
  originalOrderId?: string
  createdById: string
  initialStatus?: 'QUOTED' | 'CONFIRMED' | 'CREDIT_NOTE'
  lineItems: Array<{
    resourceId: string
    quantity: number
    discountPct?: number
    observations?: string
    sortOrder?: number
    deliveryDate?: Date
  }>
}

export async function createOrder(input: CreateOrderInput) {
  const pricingTier = await determinePricingTier(input.priceListId)

  // Validate price list items exist (use unique IDs — same resource can appear multiple times when checkDuplicate=false)
  const resourceIds = input.lineItems.map((li) => li.resourceId)
  const uniqueResourceIds = [...new Set(resourceIds)]
  const priceListItems = await prisma.priceListItem.findMany({
    where: {
      priceListId: input.priceListId,
      resourceId: { in: uniqueResourceIds },
      isActive: true,
    },
    include: { resource: true },
  })

  if (priceListItems.length !== uniqueResourceIds.length) {
    throw new AppError(400, 'INVALID_RESOURCES', 'Some resources are not in the price list')
  }

  const itemMap = new Map(priceListItems.map((i) => [i.resourceId, i]))

  const lineItemData = input.lineItems.map((li, idx) => {
    const plItem = itemMap.get(li.resourceId)!
    const unitPrice = getPriceForTier(plItem, pricingTier)
    const quantity = new Decimal(li.quantity)
    const discountPct = new Decimal(li.discountPct ?? 0)
    const timeUnitValue = calculateTimeUnitValue(
      (plItem as any).timeUnit,
      (plItem.resource as any).factor ?? 1,
      input.startDate,
      input.endDate
    )
    const lineTotal = calculateLineTotal(unitPrice, quantity, discountPct, timeUnitValue)

    return {
      resourceId: li.resourceId,
      description: plItem.resource.name,
      pricingTier,
      unitPrice,
      quantity,
      discountPct,
      lineTotal,
      timeUnit: (plItem as any).timeUnit ?? null,
      observations: li.observations,
      sortOrder: li.sortOrder ?? idx,
      deliveryDate: li.deliveryDate,
    }
  })

  const totals = calculateOrderTotals(
    lineItemData.map((li) => ({ lineTotal: li.lineTotal })),
    new Decimal(0), // order-level discount starts at 0
    new Decimal(16)  // 16% IVA default
  )

  const orderNumber = await generateOrderNumber(input.tenantId)

  const status = input.initialStatus ?? 'QUOTED'

  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        tenantId: input.tenantId,
        orderNumber,
        eventId: input.eventId,
        clientId: input.clientId,
        billingClientId: input.billingClientId,
        standId: input.standId,
        priceListId: input.priceListId,
        status,
        paymentStatus: 'PENDING',
        pricingTier,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        prospectedTotal: totals.total,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes,
        departamento: input.departamento,
        organizacionId: input.organizacionId,
        isCreditNote: input.isCreditNote ?? false,
        originalOrderId: input.originalOrderId,
        createdById: input.createdById,
        lineItems: { create: lineItemData },
      },
      include: { lineItems: true, client: true, event: true, stand: true, priceList: true },
    })

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: status,
        changedById: input.createdById,
        notes: 'Order created',
      },
    })

    return order
  })

  // Audit the order creation
  await auditService.log(input.tenantId, input.createdById, 'Order', order.id, 'CREATE', null, {
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    lineItemsCount: order.lineItems.length,
  })

  return order
}

export async function transitionOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  userId: string,
  notes?: string
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus]
  if (!allowedTransitions.includes(toStatus)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${order.status} to ${toStatus}`
    )
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus, updatedAt: new Date() },
    })

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        changedById: userId,
        notes,
      },
    })

    return updated
  })

  // Audit the status change
  await auditService.log(order.tenantId, userId, 'Order', orderId, 'UPDATE',
    { status: order.status },
    { status: toStatus },
  )

  return result
}

export async function addPayment(
  orderId: string,
  userId: string,
  payment: {
    method: string
    amount: number
    paymentDate: Date
    reference?: string
    notes?: string
  }
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  // Payments allowed on CONFIRMED (if not linked to contract) and EXECUTED (if balance > 0)
  if (order.status === 'CONFIRMED') {
    if (order.contractId) {
      throw new AppError(400, 'ORDER_HAS_CONTRACT', 'No se pueden registrar pagos directos en órdenes vinculadas a un contrato')
    }
  } else if (order.status === 'EXECUTED') {
    if (new Decimal(order.paidAmount).gte(order.total)) {
      throw new AppError(400, 'ORDER_FULLY_PAID', 'La orden ya está completamente pagada')
    }
  } else {
    throw new AppError(400, 'INVALID_ORDER_STATUS', 'Solo se pueden agregar pagos a órdenes confirmadas o ejecutadas')
  }

  return prisma.$transaction(async (tx) => {
    await tx.orderPayment.create({
      data: {
        orderId,
        method: payment.method as any,
        amount: new Decimal(payment.amount),
        paymentDate: payment.paymentDate,
        reference: payment.reference,
        notes: payment.notes,
        recordedById: userId,
      },
    })

    const payments = await tx.orderPayment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    })
    const newPaidAmount = payments._sum.amount ?? new Decimal(0)

    const newPaymentStatus = newPaidAmount.gte(order.total) ? 'PAID' : 'IN_PAYMENT'

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { paidAmount: newPaidAmount, paymentStatus: newPaymentStatus },
    })

    return updated
  })
}

// Update payment status (used by accounting approval)
export async function updatePaymentStatus(
  orderId: string,
  userId: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  const newPaymentStatus = new Decimal(order.paidAmount).gte(order.total) ? 'PAID' : 'IN_PAYMENT'

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: newPaymentStatus },
  })

  await auditService.log(order.tenantId, userId, 'Order', orderId, 'UPDATE',
    { paymentStatus: order.paymentStatus },
    { paymentStatus: newPaymentStatus },
  )

  return updated
}
