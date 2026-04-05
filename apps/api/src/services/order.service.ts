import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { ORDER_STATUS_TRANSITIONS, OrderStatus } from '@iventia/shared'
import { determinePricingTier, getPriceForTier, calculateLineTotal, calculateOrderTotals } from './pricing.service'
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
  isCreditNote?: boolean
  originalOrderId?: string
  createdById: string
  lineItems: Array<{
    resourceId: string
    quantity: number
    discountPct?: number
    observations?: string
    sortOrder?: number
  }>
}

export async function createOrder(input: CreateOrderInput) {
  const pricingTier = await determinePricingTier(input.priceListId)

  // Validate price list items exist
  const resourceIds = input.lineItems.map((li) => li.resourceId)
  const priceListItems = await prisma.priceListItem.findMany({
    where: {
      priceListId: input.priceListId,
      resourceId: { in: resourceIds },
      isActive: true,
    },
    include: { resource: true },
  })

  if (priceListItems.length !== resourceIds.length) {
    throw new AppError(400, 'INVALID_RESOURCES', 'Some resources are not in the price list')
  }

  const itemMap = new Map(priceListItems.map((i) => [i.resourceId, i]))

  const lineItemData = input.lineItems.map((li, idx) => {
    const plItem = itemMap.get(li.resourceId)!
    const unitPrice = getPriceForTier(plItem, pricingTier)
    const quantity = new Decimal(li.quantity)
    const discountPct = new Decimal(li.discountPct ?? 0)
    const lineTotal = calculateLineTotal(unitPrice, quantity, discountPct)

    // Credit notes: invert amounts
    const multiplier = input.isCreditNote ? new Decimal(-1) : new Decimal(1)

    return {
      resourceId: li.resourceId,
      description: plItem.resource.name,
      pricingTier,
      unitPrice: unitPrice.mul(multiplier),
      quantity,
      discountPct,
      lineTotal: lineTotal.mul(multiplier),
      observations: li.observations,
      sortOrder: li.sortOrder ?? idx,
    }
  })

  const totals = calculateOrderTotals(
    lineItemData.map((li) => ({ lineTotal: li.lineTotal })),
    new Decimal(0), // order-level discount starts at 0
    new Decimal(16)  // 16% IVA default
  )

  const orderNumber = await generateOrderNumber(input.tenantId)

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        tenantId: input.tenantId,
        orderNumber,
        eventId: input.eventId,
        clientId: input.clientId,
        billingClientId: input.billingClientId,
        standId: input.standId,
        priceListId: input.priceListId,
        pricingTier,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        prospectedTotal: totals.total,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes,
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
        toStatus: 'QUOTED',
        changedById: input.createdById,
        notes: 'Order created',
      },
    })

    return order
  })
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

  // Extra validation: can't mark PAID if paidAmount < total
  if (toStatus === 'PAID') {
    const payments = await prisma.orderPayment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    })
    const paidAmount = payments._sum.amount ?? new Decimal(0)
    if (paidAmount.lt(order.total)) {
      throw new AppError(400, 'INSUFFICIENT_PAYMENT', 'Order total not fully paid')
    }
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

  if (!['CONFIRMED', 'IN_PAYMENT'].includes(order.status)) {
    throw new AppError(400, 'INVALID_ORDER_STATUS', 'Payments can only be added to confirmed orders')
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
    const paidAmount = payments._sum.amount ?? new Decimal(0)
    const newPaidAmount = paidAmount

    const newStatus = newPaidAmount.gte(order.total) ? 'PAID' : 'IN_PAYMENT'

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { paidAmount: newPaidAmount, status: newStatus },
    })

    if (newStatus !== order.status) {
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: newStatus,
          changedById: userId,
          notes: 'Status updated after payment',
        },
      })
    }

    return updated
  })
}
