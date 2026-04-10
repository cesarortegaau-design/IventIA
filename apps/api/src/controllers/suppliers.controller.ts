import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as supplierService from '../services/supplier.service'
import { AppError } from '../middleware/errorHandler'

const createSupplierSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['DISTRIBUTOR', 'MANUFACTURER', 'WHOLESALER', 'SERVICES']),
  rfc: z.string().optional(),
  taxId: z.string().optional(),
  fiscalRegime: z.string().optional(),
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  addressCountry: z.string().optional(),
  defaultPaymentTerms: z.string().optional(),
  averageDeliveryDays: z.number().int().positive().optional(),
  currencyCode: z.string().optional(),
})

const updateSupplierSchema = createSupplierSchema.partial()

const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
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
