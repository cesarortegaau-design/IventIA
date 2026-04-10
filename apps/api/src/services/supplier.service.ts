import { Decimal } from 'decimal.js'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import * as auditService from './audit.service'

export interface CreateSupplierInput {
  tenantId: string
  name: string
  description?: string
  type: 'DISTRIBUTOR' | 'MANUFACTURER' | 'WHOLESALER' | 'SERVICES'
  rfc?: string
  taxId?: string
  fiscalRegime?: string
  legalName?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
  addressCountry?: string
  defaultPaymentTerms?: string
  averageDeliveryDays?: number
  currencyCode?: string
  createdById: string
}

export interface UpdateSupplierInput {
  name?: string
  description?: string
  type?: string
  rfc?: string
  taxId?: string
  fiscalRegime?: string
  legalName?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
  addressCountry?: string
  defaultPaymentTerms?: string
  averageDeliveryDays?: number
  currencyCode?: string
}

async function generateSupplierCode(tenantId: string, year: number): Promise<string> {
  const currentYear = year
  const lastSupplier = await prisma.supplier.findFirst({
    where: {
      tenantId,
      code: { startsWith: `PROV-${currentYear}-` },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  })

  const nextNumber = lastSupplier
    ? parseInt(lastSupplier.code.split('-')[2]) + 1
    : 1

  return `PROV-${currentYear}-${String(nextNumber).padStart(3, '0')}`
}

export async function createSupplier(input: CreateSupplierInput) {
  const year = new Date().getFullYear()
  const code = await generateSupplierCode(input.tenantId, year)

  // Check if email is unique if provided
  if (input.email) {
    const existing = await prisma.supplier.findFirst({
      where: { email: input.email, tenantId: input.tenantId },
    })
    if (existing) {
      throw new AppError(400, 'DUPLICATE_EMAIL', 'Email already registered for a supplier')
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      tenantId: input.tenantId,
      code,
      name: input.name,
      description: input.description,
      type: input.type,
      rfc: input.rfc,
      taxId: input.taxId,
      fiscalRegime: input.fiscalRegime,
      legalName: input.legalName,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      website: input.website,
      addressStreet: input.addressStreet,
      addressCity: input.addressCity,
      addressState: input.addressState,
      addressZip: input.addressZip,
      addressCountry: input.addressCountry || 'MX',
      defaultPaymentTerms: input.defaultPaymentTerms,
      averageDeliveryDays: input.averageDeliveryDays || 5,
      currencyCode: input.currencyCode || 'MXN',
      createdById: input.createdById,
    },
    include: { contacts: true, createdBy: { select: { firstName: true, lastName: true } } },
  })

  await auditService.log(input.tenantId, input.createdById, 'Supplier', supplier.id, 'CREATE', null, {
    code: supplier.code,
    name: supplier.name,
    type: supplier.type,
  })

  return supplier
}

export async function updateSupplier(id: string, tenantId: string, data: UpdateSupplierInput, userId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  // Check email uniqueness if updating
  if (data.email && data.email !== supplier.email) {
    const existing = await prisma.supplier.findFirst({
      where: { email: data.email, tenantId, id: { not: id } },
    })
    if (existing) {
      throw new AppError(400, 'DUPLICATE_EMAIL', 'Email already registered for another supplier')
    }
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data,
    include: { contacts: true, createdBy: { select: { firstName: true, lastName: true } } },
  })

  await auditService.log(tenantId, userId, 'Supplier', id, 'UPDATE', supplier, { ...data })

  return updated
}

export async function getSupplier(id: string, tenantId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId },
    include: {
      contacts: { where: { isActive: true } },
      priceLists: { where: { isActive: true }, select: { id: true, code: true, name: true, validFrom: true, validTo: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  return supplier
}

export async function listSuppliers(tenantId: string, filters: { status?: string; search?: string; type?: string; pageSize?: number; page?: number } = {}) {
  const pageSize = filters.pageSize || 20
  const page = filters.page || 1
  const skip = (page - 1) * pageSize

  const where: any = { tenantId }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.type) {
    where.type = filters.type
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { code: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        _count: { select: { contacts: true, priceLists: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.count({ where }),
  ])

  return {
    data: suppliers,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function toggleSupplierStatus(id: string, tenantId: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED', userId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: { status },
    include: { contacts: true },
  })

  await auditService.log(tenantId, userId, 'Supplier', id, 'UPDATE', { status: supplier.status }, { status: updated.status })

  return updated
}

export async function addSupplierContact(
  supplierId: string,
  tenantId: string,
  data: { name: string; role: string; email?: string; phone?: string; whatsapp?: string; isPrimary?: boolean },
  userId: string
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
  })

  if (!supplier) {
    throw new AppError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found')
  }

  const contact = await prisma.supplierContact.create({
    data: {
      supplierId,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      isPrimary: data.isPrimary || false,
    },
  })

  await auditService.log(tenantId, userId, 'SupplierContact', contact.id, 'CREATE', null, {
    supplierId,
    name: data.name,
    role: data.role,
  })

  return contact
}

export async function updateSupplierContact(
  contactId: string,
  tenantId: string,
  data: Partial<{ name: string; role: string; email?: string; phone?: string; whatsapp?: string; isPrimary?: boolean }>,
  userId: string
) {
  const contact = await prisma.supplierContact.findFirst({
    where: { id: contactId },
    include: { supplier: { select: { tenantId: true } } },
  })

  if (!contact || contact.supplier.tenantId !== tenantId) {
    throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact not found')
  }

  const updated = await prisma.supplierContact.update({
    where: { id: contactId },
    data,
  })

  await auditService.log(tenantId, userId, 'SupplierContact', contactId, 'UPDATE', contact, { ...data })

  return updated
}

export async function removeSupplierContact(contactId: string, tenantId: string, userId: string) {
  const contact = await prisma.supplierContact.findFirst({
    where: { id: contactId },
    include: { supplier: { select: { tenantId: true } } },
  })

  if (!contact || contact.supplier.tenantId !== tenantId) {
    throw new AppError(404, 'CONTACT_NOT_FOUND', 'Contact not found')
  }

  await prisma.supplierContact.delete({ where: { id: contactId } })

  await auditService.log(tenantId, userId, 'SupplierContact', contactId, 'DELETE', contact, null)
}
