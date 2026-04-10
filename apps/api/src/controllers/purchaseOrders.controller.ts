import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import * as poService from '../services/purchaseOrder.service'
import { AppError } from '../middleware/errorHandler'

const createPOSchema = z.object({
  supplierId: z.string().min(1),
  priceListId: z.string().optional(),
  originOrderId: z.string().optional(),
  requiredDeliveryDate: z.string().datetime().transform((v) => new Date(v)),
  deliveryLocation: z.string().optional(),
  contactId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.string().transform((v) => new Decimal(v)).optional(),
  currency: z.string().optional(),
  lineItems: z.array(
    z.object({
      resourceId: z.string().min(1),
      quantity: z.string().transform((v) => new Decimal(v)),
      unitPrice: z.string().transform((v) => new Decimal(v)).optional(),
      supplierSku: z.string().optional(),
      deliveryTimeDays: z.number().int().positive().optional(),
      notes: z.string().optional(),
    })
  ),
})

const updatePOSchema = z.object({
  requiredDeliveryDate: z.string().datetime().transform((v) => new Date(v)).optional(),
  deliveryLocation: z.string().optional(),
  contactId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

export async function listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId, status, pageSize = 20, page = 1 } = req.query

    const pos = await poService.listPurchaseOrders(req.user!.tenantId, {
      supplierId: supplierId as string,
      status: status as string,
      pageSize: Number(pageSize),
      page: Number(page),
    })

    res.json({ success: true, data: pos.data, meta: pos.meta })
  } catch (err) {
    next(err)
  }
}

export async function getPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const po = await poService.getPurchaseOrder(req.params.id, req.user!.tenantId)
    res.json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createPOSchema.parse(req.body)

    const po = await poService.createPurchaseOrder({
      tenantId: req.user!.tenantId,
      ...data,
      createdById: req.user!.userId,
    })

    res.status(201).json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}

export async function updatePurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updatePOSchema.parse(req.body)

    const po = await poService.updatePurchaseOrder(req.params.id, req.user!.tenantId, data, req.user!.userId)

    res.json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}

export async function confirmPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body)

    const po = await poService.confirmPurchaseOrder(req.params.id, req.user!.tenantId, req.user!.userId, notes)

    res.json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}

export async function cancelPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body)

    const po = await poService.cancelPurchaseOrder(req.params.id, req.user!.tenantId, req.user!.userId, notes)

    res.json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}
