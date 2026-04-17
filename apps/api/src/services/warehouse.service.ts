import { Decimal } from 'decimal.js'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from './audit.service'

export interface CreateWarehouseInput {
  tenantId: string
  code: string
  name: string
  description?: string
  address?: string
  managerId?: string
  capacity?: number
  specialConditions?: Record<string, any>
  createdById: string
}

export interface CreateInventoryMovementInput {
  tenantId: string
  inventoryId: string
  warehouseId: string
  resourceId: string
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'LOSS' | 'RETURN'
  quantity: Decimal
  source?: string
  sourceId?: string
  condition?: string
  notes?: string
  recordedById: string
}

export async function createWarehouse(input: CreateWarehouseInput) {
  // Check for duplicate code
  const existing = await prisma.warehouse.findFirst({
    where: { tenantId: input.tenantId, code: input.code },
  })

  if (existing) {
    throw new AppError(400, 'DUPLICATE_CODE', 'Warehouse code already exists')
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
      address: input.address,
      managerId: input.managerId,
      capacity: input.capacity,
      specialConditions: input.specialConditions || {},
    },
  })

  await auditService.log(input.tenantId, input.createdById, 'Warehouse', warehouse.id, 'CREATE', null, {
    code: warehouse.code,
    name: warehouse.name,
  })

  return warehouse
}

export async function getWarehouse(id: string, tenantId: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, tenantId },
    include: {
      manager: { select: { firstName: true, lastName: true } },
      _count: { select: { inventory: true, movements: true } },
    },
  })

  if (!warehouse) {
    throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse not found')
  }

  return warehouse
}

export async function listWarehouses(tenantId: string, pageSize = 20, page = 1) {
  const skip = (page - 1) * pageSize

  const [warehouses, total] = await Promise.all([
    prisma.warehouse.findMany({
      where: { tenantId },
      skip,
      take: pageSize,
      include: {
        manager: { select: { firstName: true, lastName: true } },
        _count: { select: { inventory: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.warehouse.count({ where: { tenantId } }),
  ])

  return {
    data: warehouses,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export interface CreateResourceInventoryInput {
  tenantId: string
  resourceId: string
  warehouseId: string
  quantityTotal?: Decimal
  minLevel?: Decimal
  maxLevel?: Decimal
  location?: string
  createdById: string
}

export async function initializeResourceInventory(input: CreateResourceInventoryInput) {
  // Verify resource exists
  const resource = await prisma.resource.findFirst({
    where: { id: input.resourceId, tenantId: input.tenantId },
  })

  if (!resource) {
    throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')
  }

  // Verify warehouse exists
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: input.warehouseId, tenantId: input.tenantId },
  })

  if (!warehouse) {
    throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse not found')
  }

  // Check for duplicates
  const existing = await prisma.resourceInventory.findFirst({
    where: {
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      warehouseId: input.warehouseId,
    },
  })

  if (existing) {
    throw new AppError(400, 'DUPLICATE_INVENTORY', 'Inventory already exists for this resource in this warehouse')
  }

  const inventory = await prisma.resourceInventory.create({
    data: {
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      warehouseId: input.warehouseId,
      quantityTotal: input.quantityTotal || new Decimal(0),
      quantityReserved: new Decimal(0),
      minLevel: input.minLevel || new Decimal(0),
      maxLevel: input.maxLevel,
      location: input.location,
    },
    include: {
      resource: { select: { code: true, name: true, unit: true } },
      warehouse: { select: { code: true, name: true } },
    },
  })

  await auditService.log(input.tenantId, input.createdById, 'ResourceInventory', inventory.id, 'CREATE', null, {
    resourceId: input.resourceId,
    warehouseId: input.warehouseId,
  })

  return inventory
}

export async function getResourceInventory(id: string, tenantId: string) {
  const inventory = await prisma.resourceInventory.findFirst({
    where: { id, tenantId },
    include: {
      resource: { select: { id: true, code: true, name: true, unit: true } },
      warehouse: { select: { id: true, code: true, name: true } },
    },
  })

  if (!inventory) {
    throw new AppError(404, 'INVENTORY_NOT_FOUND', 'Inventory not found')
  }

  return inventory
}

export async function getWarehouseInventory(warehouseId: string, tenantId: string, pageSize = 50, page = 1, organizationIds?: string[] | null) {
  const skip = (page - 1) * pageSize

  // Verify warehouse exists
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, tenantId },
  })

  if (!warehouse) {
    throw new AppError(404, 'WAREHOUSE_NOT_FOUND', 'Warehouse not found')
  }

  // Build resource filter by organization (via department → departmentOrgs)
  const resourceWhere: any = {}
  if (organizationIds !== null && organizationIds !== undefined) {
    resourceWhere.department = { departmentOrgs: { some: { organizationId: { in: organizationIds } } } }
  }

  const inventoryWhere: any = { warehouseId, tenantId }
  if (Object.keys(resourceWhere).length > 0) {
    inventoryWhere.resource = resourceWhere
  }

  const [inventory, total] = await Promise.all([
    prisma.resourceInventory.findMany({
      where: inventoryWhere,
      skip,
      take: pageSize,
      include: {
        resource: { select: { code: true, name: true, unit: true } },
      },
      orderBy: { resource: { name: 'asc' } },
    }),
    prisma.resourceInventory.count({ where: inventoryWhere }),
  ])

  return {
    data: inventory,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function registerReception(
  purchaseOrderId: string,
  tenantId: string,
  items: Array<{
    lineItemId: string
    receivedQty: Decimal
    warehouseId: string
    condition?: string
    location?: string
    notes?: string
  }>,
  userId: string
) {
  // Verify PO exists
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, tenantId },
    include: { lineItems: true, supplier: { select: { name: true } } },
  })

  if (!po) {
    throw new AppError(404, 'PURCHASE_ORDER_NOT_FOUND', 'Purchase order not found')
  }

  if (po.status === 'DRAFT') {
    throw new AppError(400, 'INVALID_STATUS', 'Cannot receive items for draft purchase orders')
  }

  // Process reception in transaction
  const updated = await prisma.$transaction(async (tx) => {
    let totalReceived = 0
    let totalOrdered = 0

    // Process each line item
    for (const item of items) {
      const lineItem = po.lineItems.find((li) => li.id === item.lineItemId)
      if (!lineItem) {
        throw new AppError(404, 'LINE_ITEM_NOT_FOUND', `Line item ${item.lineItemId} not found`)
      }

      totalOrdered += Number(lineItem.quantity)

      // Initialize or update inventory
      let inventory = await tx.resourceInventory.findFirst({
        where: {
          tenantId,
          resourceId: lineItem.resourceId,
          warehouseId: item.warehouseId,
        },
      })

      if (!inventory) {
        inventory = await tx.resourceInventory.create({
          data: {
            tenantId,
            resourceId: lineItem.resourceId,
            warehouseId: item.warehouseId,
            quantityTotal: item.receivedQty,
            quantityReserved: new Decimal(0),
            location: item.location,
          },
        })
      } else {
        inventory = await tx.resourceInventory.update({
          where: { id: inventory.id },
          data: {
            quantityTotal: inventory.quantityTotal.plus(item.receivedQty),
            location: item.location || inventory.location,
            lastMovement: new Date(),
          },
        })
      }

      // Create movement record
      await tx.inventoryMovement.create({
        data: {
          tenantId,
          inventoryId: inventory.id,
          warehouseId: item.warehouseId,
          resourceId: lineItem.resourceId,
          type: 'ENTRY',
          quantity: item.receivedQty,
          source: 'PURCHASE_ORDER',
          sourceId: purchaseOrderId,
          balanceBefore: inventory.quantityTotal.minus(item.receivedQty),
          balanceAfter: inventory.quantityTotal,
          condition: item.condition || 'GOOD',
          notes: item.notes,
          recordedById: userId,
        },
      })

      // Update line item received quantity
      await tx.purchaseOrderLineItem.update({
        where: { id: item.lineItemId },
        data: {
          receivedQty: item.receivedQty,
        },
      })

      totalReceived += Number(item.receivedQty)
    }

    // Determine new PO status
    let newStatus = 'RECEIVED'
    if (totalReceived < totalOrdered) {
      newStatus = 'PARTIALLY_RECEIVED'
    }

    // Update PO status
    const updatedPO = await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: newStatus as any },
    })

    // Create status history
    await tx.purchaseOrderStatusHistory.create({
      data: {
        poId: purchaseOrderId,
        fromStatus: po.status as any,
        toStatus: newStatus as any,
        changedById: userId,
        notes: `Received ${totalReceived} of ${totalOrdered} units`,
      },
    })

    return updatedPO
  })

  await auditService.log(tenantId, userId, 'PurchaseOrder', purchaseOrderId, 'UPDATE', { status: po.status }, { status: updated.status })

  return updated
}

export async function getInventoryMovements(
  tenantId: string,
  filters: { warehouseId?: string; resourceId?: string; type?: string; pageSize?: number; page?: number } = {}
) {
  const pageSize = filters.pageSize || 50
  const page = filters.page || 1
  const skip = (page - 1) * pageSize

  const where: any = { tenantId }

  if (filters.warehouseId) {
    where.warehouseId = filters.warehouseId
  }

  if (filters.resourceId) {
    where.resourceId = filters.resourceId
  }

  if (filters.type) {
    where.type = filters.type
  }

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        warehouse: { select: { code: true, name: true } },
        resource: { select: { code: true, name: true, unit: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryMovement.count({ where }),
  ])

  return {
    data: movements,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function transferInventory(
  tenantId: string,
  input: {
    sourceWarehouseId: string
    destinationWarehouseId: string
    resourceId: string
    quantity: Decimal
    notes?: string
  },
  userId: string
) {
  if (input.sourceWarehouseId === input.destinationWarehouseId) {
    throw new AppError(400, 'SAME_WAREHOUSE', 'El almacén origen y destino no pueden ser el mismo')
  }

  if (input.quantity.isNegative() || input.quantity.isZero()) {
    throw new AppError(400, 'INVALID_QUANTITY', 'La cantidad debe ser mayor a cero')
  }

  // Find source inventory
  const sourceInventory = await prisma.resourceInventory.findFirst({
    where: { tenantId, resourceId: input.resourceId, warehouseId: input.sourceWarehouseId },
    include: { resource: { select: { code: true, name: true, unit: true } } },
  })

  if (!sourceInventory) {
    throw new AppError(404, 'SOURCE_INVENTORY_NOT_FOUND', 'El recurso no existe en el almacén origen')
  }

  const available = sourceInventory.quantityTotal.minus(sourceInventory.quantityReserved)
  if (available.lessThan(input.quantity)) {
    throw new AppError(400, 'INSUFFICIENT_STOCK', `Stock disponible insuficiente (disponible: ${available})`)
  }

  const result = await prisma.$transaction(async (tx) => {
    // Decrement source
    const updatedSource = await tx.resourceInventory.update({
      where: { id: sourceInventory.id },
      data: {
        quantityTotal: sourceInventory.quantityTotal.minus(input.quantity),
        lastMovement: new Date(),
      },
    })

    // EXIT movement on source
    await tx.inventoryMovement.create({
      data: {
        tenantId,
        inventoryId: sourceInventory.id,
        warehouseId: input.sourceWarehouseId,
        resourceId: input.resourceId,
        type: 'TRANSFER_OUT',
        quantity: input.quantity.negated(),
        source: 'TRANSFER',
        sourceId: input.destinationWarehouseId,
        balanceBefore: sourceInventory.quantityTotal,
        balanceAfter: updatedSource.quantityTotal,
        notes: input.notes,
        recordedById: userId,
      },
    })

    // Find or create destination inventory
    let destInventory = await tx.resourceInventory.findFirst({
      where: { tenantId, resourceId: input.resourceId, warehouseId: input.destinationWarehouseId },
    })

    if (!destInventory) {
      destInventory = await tx.resourceInventory.create({
        data: {
          tenantId,
          resourceId: input.resourceId,
          warehouseId: input.destinationWarehouseId,
          quantityTotal: new Decimal(0),
          quantityReserved: new Decimal(0),
        },
      })
    }

    const destBefore = destInventory.quantityTotal
    const updatedDest = await tx.resourceInventory.update({
      where: { id: destInventory.id },
      data: {
        quantityTotal: destInventory.quantityTotal.plus(input.quantity),
        lastMovement: new Date(),
      },
    })

    // ENTRY movement on destination
    await tx.inventoryMovement.create({
      data: {
        tenantId,
        inventoryId: destInventory.id,
        warehouseId: input.destinationWarehouseId,
        resourceId: input.resourceId,
        type: 'TRANSFER_IN',
        quantity: input.quantity,
        source: 'TRANSFER',
        sourceId: input.sourceWarehouseId,
        balanceBefore: destBefore,
        balanceAfter: updatedDest.quantityTotal,
        notes: input.notes,
        recordedById: userId,
      },
    })

    return { source: updatedSource, destination: updatedDest }
  })

  await auditService.log(tenantId, userId, 'ResourceInventory', sourceInventory.id, 'TRANSFER', {
    sourceWarehouseId: input.sourceWarehouseId,
    quantity: input.quantity.toString(),
  }, {
    destinationWarehouseId: input.destinationWarehouseId,
    quantity: input.quantity.toString(),
  })

  return result
}

export async function adjustInventory(
  inventoryId: string,
  tenantId: string,
  adjustment: {
    quantity: Decimal
    type: 'ADJUSTMENT' | 'LOSS' | 'RETURN'
    reason?: string
    notes?: string
  },
  userId: string
) {
  const inventory = await prisma.resourceInventory.findFirst({
    where: { id: inventoryId, tenantId },
  })

  if (!inventory) {
    throw new AppError(404, 'INVENTORY_NOT_FOUND', 'Inventory not found')
  }

  const newQuantity = inventory.quantityTotal.plus(adjustment.quantity)

  if (newQuantity.isNegative()) {
    throw new AppError(400, 'INVALID_ADJUSTMENT', 'Adjustment would result in negative inventory')
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedInventory = await tx.resourceInventory.update({
      where: { id: inventoryId },
      data: {
        quantityTotal: newQuantity,
        lastMovement: new Date(),
      },
    })

    await tx.inventoryMovement.create({
      data: {
        tenantId,
        inventoryId,
        warehouseId: inventory.warehouseId,
        resourceId: inventory.resourceId,
        type: adjustment.type,
        quantity: adjustment.quantity,
        balanceBefore: inventory.quantityTotal,
        balanceAfter: newQuantity,
        notes: adjustment.notes || adjustment.reason,
        recordedById: userId,
      },
    })

    return updatedInventory
  })

  await auditService.log(
    tenantId,
    userId,
    'ResourceInventory',
    inventoryId,
    'UPDATE',
    { quantityTotal: inventory.quantityTotal.toString() },
    { quantityTotal: updated.quantityTotal.toString() }
  )

  return updated
}
