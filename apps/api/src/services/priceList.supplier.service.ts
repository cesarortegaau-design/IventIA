import { Decimal } from 'decimal.js'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from './audit.service'

export interface CreateSupplierPriceListInput {
  tenantId: string
  supplierId: string
  name: string
  description?: string
  validFrom: Date
  validTo?: Date
  minOrderQty?: Decimal
  maxOrderQty?: Decimal
  volumeDiscountRules?: Array<{ minQty: number; discountPct: number }>
  creditDays?: number
  currency?: string
  profitMarginSuggestion?: Decimal
  createdById: string
}

async function generatePriceListCode(tenantId: string, supplierId: string, year: number): Promise<string> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
    select: { code: true },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  const lastPriceList = await prisma.supplierPriceList.findFirst({
    where: {
      tenantId,
      code: { startsWith: `PLST-${supplier.code}-${year}-` },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  const nextNumber = lastPriceList
    ? parseInt(lastPriceList.code.split('-')[3]) + 1
    : 1

  return `PLST-${supplier.code}-${year}-${String(nextNumber).padStart(3, '0')}`
}

export async function createSupplierPriceList(input: CreateSupplierPriceListInput) {
  // Validate supplier exists
  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, tenantId: input.tenantId },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  // Validate dates
  if (input.validTo && input.validFrom >= input.validTo) {
    throw new AppError(400, 'INVALID_DATES', 'validFrom must be before validTo')
  }

  const year = new Date().getFullYear()
  const code = await generatePriceListCode(input.tenantId, input.supplierId, year)

  const priceList = await prisma.supplierPriceList.create({
    data: {
      tenantId: input.tenantId,
      supplierId: input.supplierId,
      code,
      name: input.name,
      description: input.description,
      validFrom: input.validFrom,
      validTo: input.validTo,
      minOrderQty: input.minOrderQty,
      maxOrderQty: input.maxOrderQty,
      volumeDiscountRules: input.volumeDiscountRules || [],
      creditDays: input.creditDays || 30,
      currency: input.currency || 'MXN',
      profitMarginSuggestion: input.profitMarginSuggestion,
    },
    include: { supplier: { select: { name: true, code: true } } },
  })

  await auditService.log(input.tenantId, input.createdById, 'SupplierPriceList', priceList.id, 'CREATE', null, {
    code: priceList.code,
    supplierId: input.supplierId,
    name: input.name,
  })

  return priceList
}

export async function updateSupplierPriceList(
  id: string,
  tenantId: string,
  data: Partial<CreateSupplierPriceListInput>,
  userId: string
) {
  const priceList = await prisma.supplierPriceList.findFirst({
    where: { id, tenantId },
  })

  if (!priceList) {
    throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')
  }

  const updated = await prisma.supplierPriceList.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      validFrom: data.validFrom,
      validTo: data.validTo,
      minOrderQty: data.minOrderQty,
      maxOrderQty: data.maxOrderQty,
      volumeDiscountRules: data.volumeDiscountRules,
      creditDays: data.creditDays,
      currency: data.currency,
      profitMarginSuggestion: data.profitMarginSuggestion,
    },
    include: { supplier: { select: { name: true, code: true } }, _count: { select: { items: true } } },
  })

  await auditService.log(tenantId, userId, 'SupplierPriceList', id, 'UPDATE', priceList, { ...data })

  return updated
}

export async function getSupplierPriceList(id: string, tenantId: string, departmentIds?: string[]) {
  const itemWhere: any = { isActive: true }
  if (departmentIds?.length) {
    itemWhere.resource = { departmentId: { in: departmentIds } }
  }

  const priceList = await prisma.supplierPriceList.findFirst({
    where: { id, tenantId },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      items: {
        where: itemWhere,
        include: {
          resource: { select: { id: true, code: true, name: true, unit: true, department: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!priceList) {
    throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')
  }

  return priceList
}

export async function listSupplierPriceLists(
  tenantId: string,
  filters: { supplierId?: string; isActive?: boolean; pageSize?: number; page?: number } = {}
) {
  const pageSize = filters.pageSize || 20
  const page = filters.page || 1
  const skip = (page - 1) * pageSize

  const where: any = { tenantId }

  if (filters.supplierId) {
    where.supplierId = filters.supplierId
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive
  }

  const [priceLists, total] = await Promise.all([
    prisma.supplierPriceList.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        supplier: { select: { code: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplierPriceList.count({ where }),
  ])

  return {
    data: priceLists,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export interface CreatePriceListItemInput {
  resourceId: string
  supplierSku?: string
  unitPrice: Decimal
  availabilityStatus?: 'AVAILABLE' | 'BY_ORDER' | 'DISCONTINUED' | 'TEMPORARILY_OUT'
  estimatedAvailable?: Decimal
  deliveryTimeDays?: number
}

export async function addPriceListItem(priceListId: string, tenantId: string, data: CreatePriceListItemInput, userId: string) {
  // Verify price list exists and belongs to tenant
  const priceList = await prisma.supplierPriceList.findFirst({
    where: { id: priceListId, tenantId },
  })

  if (!priceList) {
    throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')
  }

  // Verify resource exists and belongs to tenant
  const resource = await prisma.resource.findFirst({
    where: { id: data.resourceId, tenantId },
  })

  if (!resource) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')
  }

  // Check for duplicates
  const existing = await prisma.supplierPriceListItem.findFirst({
    where: {
      priceListId,
      resourceId: data.resourceId,
    },
  })

  if (existing) {
    throw new AppError(400, 'DUPLICATE_ITEM', 'Resource already exists in this price list')
  }

  const item = await prisma.supplierPriceListItem.create({
    data: {
      priceListId,
      resourceId: data.resourceId,
      supplierSku: data.supplierSku,
      unitPrice: data.unitPrice,
      availabilityStatus: data.availabilityStatus || 'AVAILABLE',
      estimatedAvailable: data.estimatedAvailable,
      deliveryTimeDays: data.deliveryTimeDays || 5,
    },
    include: { resource: { select: { code: true, name: true } } },
  })

  await auditService.log(tenantId, userId, 'SupplierPriceListItem', item.id, 'CREATE', null, {
    priceListId,
    resourceId: data.resourceId,
    unitPrice: data.unitPrice.toString(),
  })

  return item
}

export async function updatePriceListItem(
  itemId: string,
  tenantId: string,
  data: Partial<CreatePriceListItemInput>,
  userId: string
) {
  const item = await prisma.supplierPriceListItem.findFirst({
    where: { id: itemId },
    include: { priceList: { select: { tenantId: true } } },
  })

  if (!item || item.priceList.tenantId !== tenantId) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Price list item not found')
  }

  const updated = await prisma.supplierPriceListItem.update({
    where: { id: itemId },
    data: {
      supplierSku: data.supplierSku,
      unitPrice: data.unitPrice,
      availabilityStatus: data.availabilityStatus,
      estimatedAvailable: data.estimatedAvailable,
      deliveryTimeDays: data.deliveryTimeDays,
    },
    include: { resource: { select: { code: true, name: true } } },
  })

  await auditService.log(tenantId, userId, 'SupplierPriceListItem', itemId, 'UPDATE', item, { ...data })

  return updated
}

export async function removePriceListItem(itemId: string, tenantId: string, userId: string) {
  const item = await prisma.supplierPriceListItem.findFirst({
    where: { id: itemId },
    include: { priceList: { select: { tenantId: true } } },
  })

  if (!item || item.priceList.tenantId !== tenantId) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'Price list item not found')
  }

  await prisma.supplierPriceListItem.delete({ where: { id: itemId } })

  await auditService.log(tenantId, userId, 'SupplierPriceListItem', itemId, 'DELETE', item, null)
}

export async function getPriceListItemBySupplierAndResource(supplierId: string, resourceId: string, tenantId: string) {
  const items = await prisma.supplierPriceListItem.findFirst({
    where: {
      priceList: { supplierId, tenantId, isActive: true },
      resourceId,
      isActive: true,
    },
    include: {
      priceList: { select: { id: true, supplier: { select: { id: true, name: true } } } },
      resource: { select: { code: true, name: true, unit: true } },
    },
  })

  return items
}
