import { apiClient } from './client'

export interface PurchaseOrderLineItem {
  id: string
  poId: string
  resourceId: string
  description: string
  supplierSku?: string
  quantity: string
  unitPrice: string
  lineTotal: string
  deliveryTimeDays?: number
  notes?: string
  receivedQty: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  resource?: {
    id: string
    code: string
    name: string
    unit: string
  }
}

export interface PurchaseOrderStatusHistory {
  id: string
  poId: string
  fromStatus: string
  toStatus: string
  changedById: string
  notes?: string
  createdAt: string
  changedBy?: {
    firstName: string
    lastName: string
  }
}

export interface PurchaseOrder {
  id: string
  tenantId: string
  supplierId: string
  priceListId: string
  orderNumber: string
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'INVOICED' | 'CANCELLED'
  originOrderId?: string
  requiredDeliveryDate?: string
  deliveryLocation?: string
  contactId?: string
  description?: string
  notes?: string
  subtotal: string
  taxRate: number
  taxAmount: string
  total: string
  currency: string
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  cancelledAt?: string
  createdById: string
  confirmedById?: string
  supplier?: {
    id: string
    code: string
    name: string
  }
  priceList?: {
    id: string
    code: string
    name: string
  }
  lineItems?: PurchaseOrderLineItem[]
  statusHistory?: PurchaseOrderStatusHistory[]
  createdBy?: {
    firstName: string
    lastName: string
  }
  confirmedBy?: {
    firstName: string
    lastName: string
  }
}

export interface CreatePurchaseOrderInput {
  supplierId: string
  priceListId: string
  originOrderId?: string
  requiredDeliveryDate?: string
  deliveryLocation?: string
  contactId?: string
  description?: string
  notes?: string
  taxRate?: number
  currency?: string
  lineItems: Array<{
    resourceId: string
    quantity: string
    unitPrice: string
    description?: string
    deliveryTimeDays?: number
    notes?: string
  }>
}

export interface UpdatePurchaseOrderInput {
  requiredDeliveryDate?: string
  deliveryLocation?: string
  contactId?: string
  description?: string
  notes?: string
  taxRate?: number
}

export const purchaseOrdersApi = {
  list: (params?: { supplierId?: string; status?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/purchase-orders', { params }),

  get: (id: string) =>
    apiClient.get(`/purchase-orders/${id}`),

  create: (data: CreatePurchaseOrderInput) =>
    apiClient.post('/purchase-orders', data),

  update: (id: string, data: UpdatePurchaseOrderInput) =>
    apiClient.patch(`/purchase-orders/${id}`, data),

  confirm: (id: string, notes?: string) =>
    apiClient.patch(`/purchase-orders/${id}/confirm`, { notes }),

  cancel: (id: string, notes?: string) =>
    apiClient.patch(`/purchase-orders/${id}/cancel`, { notes }),
}
