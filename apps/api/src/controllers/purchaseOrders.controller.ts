import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import * as poService from '../services/purchaseOrder.service'
import { AppError } from '../middleware/errorHandler'
import { getUserOrgIds } from '../middleware/departmentScope'

const toDate = z.union([z.string().datetime(), z.string().min(10)]).transform((v) => new Date(v))
const toDecimal = z.union([z.string(), z.number()]).transform((v) => new Decimal(String(v)))

const createPOSchema = z.object({
  supplierId: z.string().min(1),
  priceListId: z.string().optional(),
  originOrderId: z.string().optional(),
  requiredDeliveryDate: toDate,
  deliveryLocation: z.string().optional(),
  contactId: z.string().optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional(),
  organizacionId: z.string().uuid().optional(),
  taxRate: toDecimal.optional(),
  currency: z.string().optional(),
  lineItems: z.array(
    z.object({
      resourceId: z.string().min(1),
      quantity: toDecimal,
      unitPrice: toDecimal.optional(),
      description: z.string().optional().nullable(),
      supplierSku: z.string().optional(),
      deliveryTimeDays: z.number().int().min(0).optional().nullable(),
      notes: z.string().optional(),
    })
  ),
})

const updatePOSchema = z.object({
  requiredDeliveryDate: toDate.optional(),
  deliveryLocation: z.string().optional(),
  contactId: z.string().optional(),
  description: z.string().optional().nullable(),
  notes: z.string().optional(),
})

export async function listPurchaseOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId, status, pageSize = 20, page = 1 } = req.query

    const orgIds = await getUserOrgIds(req)
    const pos = await poService.listPurchaseOrders(req.user!.tenantId, {
      supplierId: supplierId as string,
      status: status as string,
      pageSize: Number(pageSize),
      page: Number(page),
      organizationIds: orgIds,
    })

    res.json({ success: true, data: pos.data, meta: pos.meta })
  } catch (err) {
    next(err)
  }
}

export async function getPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const po = await poService.getPurchaseOrder(req.params.id, req.user!.tenantId)

    // Org scope check: non-admin users can only see POs of their accessible organizations
    const orgIds = await getUserOrgIds(req)
    if (orgIds !== null && po) {
      if (po.organizacionId && !orgIds.includes(po.organizacionId)) {
        throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a esta orden de compra')
      }
    }

    res.json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createPOSchema.parse(req.body)

    // If linked to a service order, inherit its organizacionId
    let organizacionId = data.organizacionId
    if (!organizacionId && data.originOrderId) {
      const { prisma } = await import('../config/database')
      const originOrder = await prisma.order.findFirst({ where: { id: data.originOrderId }, select: { organizacionId: true } })
      organizacionId = originOrder?.organizacionId ?? undefined
    }

    const po = await poService.createPurchaseOrder({
      tenantId: req.user!.tenantId,
      ...data,
      organizacionId,
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
