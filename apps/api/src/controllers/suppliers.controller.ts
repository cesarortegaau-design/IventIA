import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as supplierService from '../services/supplier.service'
import { AppError } from '../middleware/errorHandler'
import { checkApprovalGate } from '../services/approvalGate.service'

const createSupplierSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['DISTRIBUTOR', 'MANUFACTURER', 'WHOLESALER', 'SERVICES']),
  rfc: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  fiscalRegime: z.string().optional().nullable(),
  legalName: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  addressStreet: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().optional().nullable(),
  addressZip: z.string().optional().nullable(),
  addressCountry: z.string().optional().nullable(),
  defaultPaymentTerms: z.string().optional().nullable(),
  averageDeliveryDays: z.number().int().min(0).optional().nullable(),
  currencyCode: z.string().optional().nullable(),
})

const updateSupplierSchema = createSupplierSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
})

const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
})

export async function listSuppliers(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, search, type, pageSize = 20, page = 1 } = req.query

    const suppliers = await supplierService.listSuppliers(req.user!.tenantId, {
      status: status as string,
      search: search as string,
      type: type as string,
      pageSize: Number(pageSize),
      page: Number(page),
    })

    res.json({ success: true, data: suppliers.data, meta: suppliers.meta })
  } catch (err) {
    next(err)
  }
}

export async function getSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const supplier = await supplierService.getSupplier(req.params.id, req.user!.tenantId)
    res.json({ success: true, data: supplier })
  } catch (err) {
    next(err)
  }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSupplierSchema.parse(req.body)

    const supplier = await supplierService.createSupplier({
      tenantId: req.user!.tenantId,
      ...data,
      createdById: req.user!.userId,
    })

    res.status(201).json({ success: true, data: supplier })
  } catch (err) {
    next(err)
  }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSupplierSchema.parse(req.body)

    const supplier = await supplierService.updateSupplier(req.params.id, req.user!.tenantId, data, req.user!.userId)

    res.json({ success: true, data: supplier })
  } catch (err) {
    next(err)
  }
}

export async function toggleSupplierStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = z.object({ status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']) }).parse(req.body)

    const gate = await checkApprovalGate(req.user!.tenantId, req.user!.userId, 'SUPPLIER', req.params.id, status)
    if (gate.blocked) throw new AppError(422, 'APPROVAL_REQUIRED', gate.message)

    const supplier = await supplierService.toggleSupplierStatus(req.params.id, req.user!.tenantId, status, req.user!.userId)

    res.json({ success: true, data: supplier })
  } catch (err) {
    next(err)
  }
}

export async function addSupplierContact(req: Request, res: Response, next: NextFunction) {
  try {
    const data = contactSchema.parse(req.body)

    const contact = await supplierService.addSupplierContact(req.params.id, req.user!.tenantId, data, req.user!.userId)

    res.status(201).json({ success: true, data: contact })
  } catch (err) {
    next(err)
  }
}

export async function updateSupplierContact(req: Request, res: Response, next: NextFunction) {
  try {
    const data = contactSchema.partial().parse(req.body)

    const contact = await supplierService.updateSupplierContact(
      req.params.contactId,
      req.user!.tenantId,
      data,
      req.user!.userId
    )

    res.json({ success: true, data: contact })
  } catch (err) {
    next(err)
  }
}

export async function removeSupplierContact(req: Request, res: Response, next: NextFunction) {
  try {
    await supplierService.removeSupplierContact(req.params.contactId, req.user!.tenantId, req.user!.userId)

    res.json({ success: true, message: 'Contact removed' })
  } catch (err) {
    next(err)
  }
}
