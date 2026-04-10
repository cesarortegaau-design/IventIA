import { apiClient } from './client'

export interface Warehouse {
  id: string
  tenantId: string
  code: string
  name: string
  description?: string
  address?: string
  managerId?: string
  capacity?: number
  specialConditions?: Record<string, any>
  createdAt: string
  updatedAt: string
  manager?: {
    firstName: string
    lastName: string
  }
  _count?: {
    inventory: number
    movements: number
  }
}

export interface ResourceInventory {
  id: string
  tenantId: string
  resourceId: string
  warehouseId: string
  quantityTotal: string
  quantityReserved: string
  minLevel: string
  maxLevel?: string
  lastMovement?: string
  location?: string
  lotNumber?: string
  serialNumber?: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
  resource?: {
    id: string
    code: string
    name: string
    unit: string
  }
  warehouse?: {
    id: string
    code: string
    name: string
  }
}

export interface InventoryMovement {
  id: string
  tenantId: string
  inventoryId: string
  warehouseId: string
  resourceId: string
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'LOSS' | 'RETURN'
  quantity: string
  source?: string
  sourceId?: string
  balanceBefore: string
  balanceAfter: string
  condition?: string
  notes?: string
  recordedById: string
  createdAt: string
  warehouse?: {
    code: string
    name: string
  }
  resource?: {
    code: string
    name: string
    unit: string
  }
  recordedBy?: {
    firstName: string
    lastName: string
  }
}

export interface CreateWarehouseInput {
  code: string
  name: string
  description?: string
  address?: string
  managerId?: string
  capacity?: number
  specialConditions?: Record<string, any>
}

export interface CreateResourceInventoryInput {
  resourceId: string
  warehouseId: string
  quantityTotal?: string
  minLevel?: string
  maxLevel?: string
  location?: string
}

export interface RegisterReceptionItem {
  lineItemId: string
  receivedQty: string
  warehouseId: string
  condition?: string
  location?: string
  notes?: string
}

export interface AdjustInventoryInput {
  quantity: string
  type: 'ADJUSTMENT' | 'LOSS' | 'RETURN'
  reason?: string
  notes?: string
}

export const warehouseApi = {
  // Warehouse management
  listWarehouses: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get('/warehouse', { params }),

  getWarehouse: (id: string) =>
    apiClient.get(`/warehouse/${id}`),

  createWarehouse: (data: CreateWarehouseInput) =>
    apiClient.post('/warehouse', data),

  // Warehouse inventory
  getWarehouseInventory: (warehouseId: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get(`/warehouse/${warehouseId}/inventory`, { params }),

  // Resource inventory
  initializeResourceInventory: (data: CreateResourceInventoryInput) =>
    apiClient.post('/warehouse/inventory', data),

  getResourceInventory: (inventoryId: string) =>
    apiClient.get(`/warehouse/inventory/${inventoryId}`),

  adjustInventory: (inventoryId: string, data: AdjustInventoryInput) =>
    apiClient.patch(`/warehouse/inventory/${inventoryId}/adjust`, data),

  // Reception & movements
  registerReception: (purchaseOrderId: string, items: RegisterReceptionItem[]) =>
    apiClient.post('/warehouse/reception', { purchaseOrderId, items }),

  getInventoryMovements: (params?: { warehouseId?: string; resourceId?: string; type?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/warehouse/movements', { params }),
}
