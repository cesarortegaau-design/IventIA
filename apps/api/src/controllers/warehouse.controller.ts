import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { Decimal } from 'decimal.js'
import * as warehouseService from '../services/warehouse.service'
import { AppError } from '../middleware/errorHandler'

const createWarehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  managerId: z.string().optional(),
  capacity: z.number().int().min(0).optional().nullable(),
  specialConditions: z.record(z.any()).optional(),
})

const toDecimal = z.union([z.string(), z.number()]).transform((v) => new Decimal(String(v)))

const initializeInventorySchema = z.object({
  resourceId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantityTotal: toDecimal.optional(),
  minLevel: toDecimal.optional(),
  maxLevel: toDecimal.optional(),
  location: z.string().optional(),
})

const receptionSchema = z.object({
  purchaseOrderId: z.string().min(1),
  items: z.array(
    z.object({
      lineItemId: z.string().min(1),
      receivedQty: toDecimal,
      warehouseId: z.string().min(1),
      condition: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
})

const adjustmentSchema = z.object({
  quantity: toDecimal,
  type: z.enum(['ADJUSTMENT', 'LOSS', 'RETURN']),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

const transferSchema = z.object({
  sourceWarehouseId: z.string().min(1),
  destinationWarehouseId: z.string().min(1),
  resourceId: z.string().min(1),
  quantity: toDecimal,
  notes: z.string().optional(),
})

export async function listWarehouses(req: Request, res: Response, next: NextFunction) {
  try {
    const { pageSize = 20, page = 1 } = req.query

    const warehouses = await warehouseService.listWarehouses(req.user!.tenantId, Number(pageSize), Number(page))

    res.json({ success: true, data: warehouses.data, meta: warehouses.meta })
  } catch (err) {
    next(err)
  }
}

export async function getWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const warehouse = await warehouseService.getWarehouse(req.params.id, req.user!.tenantId)
    res.json({ success: true, data: warehouse })
  } catch (err) {
    next(err)
  }
}

export async function createWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createWarehouseSchema.parse(req.body)

    const warehouse = await warehouseService.createWarehouse({
      tenantId: req.user!.tenantId,
      ...data,
      createdById: req.user!.userId,
    })

    res.status(201).json({ success: true, data: warehouse })
  } catch (err) {
    next(err)
  }
}

export async function getWarehouseInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const { pageSize = 50, page = 1 } = req.query
    const { getUserOrgIds } = await import('../middleware/departmentScope')
    const orgIds = await getUserOrgIds(req)

    const inventory = await warehouseService.getWarehouseInventory(req.params.id, req.user!.tenantId, Number(pageSize), Number(page), orgIds)

    res.json({ success: true, data: inventory.data, meta: inventory.meta })
  } catch (err) {
    next(err)
  }
}

export async function initializeResourceInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = initializeInventorySchema.parse(req.body)

    const inventory = await warehouseService.initializeResourceInventory({
      tenantId: req.user!.tenantId,
      ...data,
      createdById: req.user!.userId,
    })

    res.status(201).json({ success: true, data: inventory })
  } catch (err) {
    next(err)
  }
}

export async function getResourceInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const inventory = await warehouseService.getResourceInventory(req.params.inventoryId, req.user!.tenantId)
    res.json({ success: true, data: inventory })
  } catch (err) {
    next(err)
  }
}

export async function registerReception(req: Request, res: Response, next: NextFunction) {
  try {
    const { purchaseOrderId, items } = receptionSchema.parse(req.body)

    const po = await warehouseService.registerReception(purchaseOrderId, req.user!.tenantId, items, req.user!.userId)

    res.json({ success: true, data: po })
  } catch (err) {
    next(err)
  }
}

export async function getInventoryMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const { warehouseId, resourceId, type, pageSize = 50, page = 1 } = req.query

    const movements = await warehouseService.getInventoryMovements(req.user!.tenantId, {
      warehouseId: warehouseId as string,
      resourceId: resourceId as string,
      type: type as string,
      pageSize: Number(pageSize),
      page: Number(page),
    })

    res.json({ success: true, data: movements.data, meta: movements.meta })
  } catch (err) {
    next(err)
  }
}

export async function adjustInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const { quantity, type, reason, notes } = adjustmentSchema.parse(req.body)

    const inventory = await warehouseService.adjustInventory(
      req.params.inventoryId,
      req.user!.tenantId,
      { quantity, type, reason, notes },
      req.user!.userId
    )

    res.json({ success: true, data: inventory })
  } catch (err) {
    next(err)
  }
}

export async function transferInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = transferSchema.parse(req.body)

    const result = await warehouseService.transferInventory(
      req.user!.tenantId,
      data,
      req.user!.userId
    )

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}
