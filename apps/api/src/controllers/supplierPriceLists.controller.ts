import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import * as priceListService from '../services/priceList.supplier.service'
import { AppError } from '../middleware/errorHandler'

const toDate = z.union([z.string().datetime(), z.string().min(10)]).transform((v) => new Date(v))
const toDecimal = z.union([z.string(), z.number()]).transform((v) => new Decimal(String(v)))

const createPriceListSchema = z.object({
  supplierId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  validFrom: toDate,
  validTo: toDate.optional().nullable(),
  minOrderQty: toDecimal.optional().nullable(),
  maxOrderQty: toDecimal.optional().nullable(),
  volumeDiscountRules: z.array(z.object({ minQty: z.number(), discountPct: z.number() })).optional(),
  creditDays: z.number().int().min(0).optional().nullable(),
  currency: z.string().optional(),
  profitMarginSuggestion: toDecimal.optional().nullable(),
})

const updatePriceListSchema = createPriceListSchema.omit({ supplierId: true }).partial()

const priceListItemSchema = z.object({
  resourceId: z.string().min(1),
  supplierSku: z.string().optional(),
  unitPrice: z.string().transform((v) => new Decimal(v)),
  availabilityStatus: z.enum(['AVAILABLE', 'BY_ORDER', 'DISCONTINUED', 'TEMPORARILY_OUT']).optional(),
  estimatedAvailable: z.string().transform((v) => new Decimal(v)).optional(),
  deliveryTimeDays: z.number().int().positive().optional(),
})

export async function listSupplierPriceLists(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId, isActive, pageSize = 20, page = 1 } = req.query

    const priceLists = await priceListService.listSupplierPriceLists(req.user!.tenantId, {
      supplierId: supplierId as string,
      isActive: isActive ? isActive === 'true' : undefined,
      pageSize: Number(pageSize),
      page: Number(page),
    })

    res.json({ success: true, data: priceLists.data, meta: priceLists.meta })
  } catch (err) {
    next(err)
  }
}

export async function getSupplierPriceList(req: Request, res: Response, next: NextFunction) {
  try {
    const departmentIds = req.query.departmentIds
      ? (req.query.departmentIds as string).split(',').filter(Boolean)
      : undefined
    const priceList = await priceListService.getSupplierPriceList(req.params.id, req.user!.tenantId, departmentIds)
    res.json({ success: true, data: priceList })
  } catch (err) {
    next(err)
  }
}

export async function createSupplierPriceList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createPriceListSchema.parse(req.body)

    const priceList = await priceListService.createSupplierPriceList({
      tenantId: req.user!.tenantId,
      ...data,
      createdById: req.user!.userId,
    })

    res.status(201).json({ success: true, data: priceList })
  } catch (err) {
    next(err)
  }
}

export async function updateSupplierPriceList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updatePriceListSchema.parse(req.body)

    const priceList = await priceListService.updateSupplierPriceList(req.params.id, req.user!.tenantId, data, req.user!.userId)

    res.json({ success: true, data: priceList })
  } catch (err) {
    next(err)
  }
}

export async function addPriceListItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceListItemSchema.parse(req.body)

    const item = await priceListService.addPriceListItem(req.params.id, req.user!.tenantId, data, req.user!.userId)

    res.status(201).json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function updatePriceListItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceListItemSchema.partial().parse(req.body)

    const item = await priceListService.updatePriceListItem(req.params.itemId, req.user!.tenantId, data, req.user!.userId)

    res.json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function removePriceListItem(req: Request, res: Response, next: NextFunction) {
  try {
    await priceListService.removePriceListItem(req.params.itemId, req.user!.tenantId, req.user!.userId)

    res.json({ success: true, message: 'Item removed' })
  } catch (err) {
    next(err)
  }
}
