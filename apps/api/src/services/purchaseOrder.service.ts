import { Decimal } from 'decimal.js'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from './audit.service'

export interface CreatePurchaseOrderInput {
  tenantId: string
  supplierId: string
  priceListId?: string
  originOrderId?: string
  requiredDeliveryDate: Date
  deliveryLocation?: string
  contactId?: string
  description?: string
  notes?: string
  lineItems: Array<{
    resourceId: string
    quantity: Decimal
    unitPrice?: Decimal
    description?: string
    supplierSku?: string
    deliveryTimeDays?: number
    notes?: string
  }>
  organizacionId?: string
  createdById: string
  taxRate?: Decimal
  currency?: string
}

async function generatePONumber(tenantId: string, year: number): Promise<string> {
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      tenantId,
      orderNumber: { startsWith: `OC-${year}-` },
    },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  })

  const nextNumber = lastPO
    ? parseInt(lastPO.orderNumber.split('-')[2]) + 1
    : 1

  return `OC-${year}-${String(nextNumber).padStart(4, '0')}`
}

function calculateLineTotal(quantity: Decimal, unitPrice: Decimal): Decimal {
  return new Decimal(quantity).times(new Decimal(unitPrice))
}

function calculateOrderTotals(lineItems: Array<{ lineTotal: Decimal }>, taxRate: Decimal) {
  const subtotal = lineItems.reduce((sum, item) => sum.plus(item.lineTotal), new Decimal(0))
  const tax = subtotal.times(taxRate.dividedBy(100))
  const total = subtotal.plus(tax)

  return {
    subtotal,
    taxAmount: tax,
    total,
  }
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  // Validate supplier exists
  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, tenantId: input.tenantId },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  // Validate price list if provided
  if (input.priceListId) {
    const priceList = await prisma.supplierPriceList.findFirst({
      where: { id: input.priceListId, supplierId: input.supplierId, tenantId: input.tenantId },
    })

    if (!priceList) {
      throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found or does not belong to supplier')
    }
  }

  // Validate origin order if provided
  if (input.originOrderId) {
    const order = await prisma.order.findFirst({
      where: { id: input.originOrderId, tenantId: input.tenantId },
    })

    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Service order not found')
    }
  }

  // Validate contact if provided
  if (input.contactId) {
    const contact = await prisma.supplierContact.findFirst({
      where: { id: input.contactId, supplierId: input.supplierId },
    })

    if (!contact) {
      throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact not found')
    }
  }

  // Validate all resources exist
  const resourceIds = input.lineItems.map((li) => li.resourceId)
  const resources = await prisma.resource.findMany({
    where: { id: { in: resourceIds }, tenantId: input.tenantId },
  })

  if (resources.length !== resourceIds.length) {
    throw new AppError(400, 'INVALID_RESOURCES', 'Some resources not found')
  }

  const resourceMap = new Map(resources.map((r) => [r.id, r]))

  // Prepare line items
  const lineItemsData = input.lineItems.map((li, idx) => {
    const resource = resourceMap.get(li.resourceId)!
    const quantity = new Decimal(li.quantity)
    const unitPrice = li.unitPrice ? new Decimal(li.unitPrice) : new Decimal(0)
    const lineTotal = calculateLineTotal(quantity, unitPrice)

    return {
      resourceId: li.resourceId,
      description: li.description || resource.name,
      supplierSku: li.supplierSku,
      quantity,
      unitPrice,
      lineTotal,
      deliveryTimeDays: li.deliveryTimeDays || supplier.averageDeliveryDays || 5,
      notes: li.notes,
      sortOrder: idx,
    }
  })

  // Calculate totals
  const taxRate = input.taxRate || new Decimal(16)
  const totals = calculateOrderTotals(
    lineItemsData.map((li) => ({ lineTotal: li.lineTotal })),
    taxRate
  )

  // Generate order number
  const year = new Date().getFullYear()
  const orderNumber = await generatePONumber(input.tenantId, year)

  // Create PO in transaction
  const po = await prisma.$transaction(async (tx) => {
    const newPO = await tx.purchaseOrder.create({
      data: {
        tenantId: input.tenantId,
        supplierId: input.supplierId,
        priceListId: input.priceListId,
        orderNumber,
        originOrderId: input.originOrderId,
        requiredDeliveryDate: input.requiredDeliveryDate,
        deliveryLocation: input.deliveryLocation,
        contactId: input.contactId,
        description: input.description,
        notes: input.notes,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        currency: input.currency || supplier.currencyCode || 'MXN',
        organizacionId: input.organizacionId,
        status: 'DRAFT',
        createdById: input.createdById,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        supplier: { select: { name: true, code: true } },
        lineItems: true,
      },
    })

    // Create initial status history
    await tx.purchaseOrderStatusHistory.create({
      data: {
        poId: newPO.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        changedById: input.createdById,
        notes: 'Purchase order created',
      },
    })

    return newPO
  })

  await auditService.log(input.tenantId, input.createdById, 'PurchaseOrder', po.id, 'CREATE', null, {
    orderNumber: po.orderNumber,
    supplierId: input.supplierId,
    total: po.total.toString(),
    lineItemsCount: po.lineItems.length,
  })

  return po
}

export async function updatePurchaseOrder(
  id: string,
  tenantId: string,
  data: Partial<{
    requiredDeliveryDate: Date
    deliveryLocation: string
    contactId: string
    description: string
    notes: string
  }>,
  userId: string
) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
  })

  if (!po) {
    throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found')
  }

  if (po.status !== 'DRAFT') {
    throw new AppError(400, 'INVALID_STATUS', 'Only draft purchase orders can be updated')
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data,
    include: {
      supplier: { select: { name: true, code: true } },
      lineItems: true,
    },
  })

  await auditService.log(tenantId, userId, 'PurchaseOrder', id, 'UPDATE', po, { ...data })

  return updated
}

export async function getPurchaseOrder(id: string, tenantId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: {
      supplier: { select: { id: true, name: true, code: true, email: true, phone: true } },
      priceList: { select: { id: true, code: true, name: true } },
      originOrder: { select: { id: true, orderNumber: true } },
      organizacion: { select: { id: true, clave: true, descripcion: true } },
      contact: { select: { id: true, name: true, role: true, email: true, phone: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      confirmedBy: { select: { firstName: true, lastName: true } },
      lineItems: {
        include: {
          resource: { select: { id: true, code: true, name: true, unit: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      statusHistory: { include: { changedBy: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!po) {
    throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found')
  }

  return po
}

export async function listPurchaseOrders(
  tenantId: string,
  filters: { supplierId?: string; status?: string; pageSize?: number; page?: number; organizationIds?: string[] | null } = {}
) {
  const pageSize = filters.pageSize || 20
  const page = filters.page || 1
  const skip = (page - 1) * pageSize

  const where: any = { tenantId }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId
  }

  if (filters.status) {
    where.status = filters.status
  }

  // Org-based scope
  if (filters.organizationIds !== null && filters.organizationIds !== undefined) {
    where.organizacionId = { in: filters.organizationIds }
  }

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        supplier: { select: { name: true, code: true } },
        originOrder: { select: { id: true, orderNumber: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return {
    data: pos,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function confirmPurchaseOrder(id: string, tenantId: string, userId: string, notes?: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
  })

  if (!po) {
    throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found')
  }

  if (po.status !== 'DRAFT') {
    throw new AppError(400, 'INVALID_STATUS', 'Only draft purchase orders can be confirmed')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const newPO = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedById: userId,
        confirmedAt: new Date(),
      },
      include: {
        supplier: { select: { name: true } },
        lineItems: true,
      },
    })

    await tx.purchaseOrderStatusHistory.create({
      data: {
        poId: id,
        fromStatus: 'DRAFT',
        toStatus: 'CONFIRMED',
        changedById: userId,
        notes: notes || 'Purchase order confirmed',
      },
    })

    return newPO
  })

  await auditService.log(tenantId, userId, 'PurchaseOrder', id, 'UPDATE', { status: po.status }, { status: updated.status })

  return updated
}

export async function cancelPurchaseOrder(id: string, tenantId: string, userId: string, notes?: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId },
  })

  if (!po) {
    throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found')
  }

  if (['INVOICED', 'CANCELLED'].includes(po.status)) {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot cancel purchase orders in this status')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const newPO = await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    await tx.purchaseOrderStatusHistory.create({
      data: {
        poId: id,
        fromStatus: po.status as any,
        toStatus: 'CANCELLED',
        changedById: userId,
        notes: notes || 'Purchase order cancelled',
      },
    })

    return newPO
  })

  await auditService.log(tenantId, userId, 'PurchaseOrder', id, 'UPDATE', { status: po.status }, { status: updated.status })

  return updated
}
