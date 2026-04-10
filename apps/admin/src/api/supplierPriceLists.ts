import { apiClient } from './client'

export interface SupplierPriceListItem {
  id: string
  priceListId: string
  resourceId: string
  supplierSku?: string
  unitPrice: string
  unit?: string
  availabilityStatus: 'AVAILABLE' | 'BY_ORDER' | 'DISCONTINUED' | 'TEMPORARILY_OUT'
  estimatedAvailable?: number
  deliveryTimeDays?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  resource?: {
    id: string
    code: string
    name: string
    unit: string
  }
}

export interface SupplierPriceList {
  id: string
  tenantId: string
  supplierId: string
  code: string
  name: string
  description?: string
  validFrom: string
  validTo: string
  minOrderQty?: number
  maxOrderQty?: number
  volumeDiscountRules?: Array<{ minQty: number; discountPct: number }>
  creditDays?: number
  currency: string
  profitMarginSuggestion?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  supplier?: {
    id: string
    code: string
    name: string
  }
  items?: SupplierPriceListItem[]
}

export interface CreateSupplierPriceListInput {
  supplierId: string
  name: string
  description?: string
  validFrom: string
  validTo: string
  minOrderQty?: number
  maxOrderQty?: number
  volumeDiscountRules?: Array<{ minQty: number; discountPct: number }>
  creditDays?: number
  currency?: string
  profitMarginSuggestion?: number
  isActive?: boolean
}

export interface AddPriceListItemInput {
  resourceId: string
  supplierSku?: string
  unitPrice: string
  availabilityStatus?: 'AVAILABLE' | 'BY_ORDER' | 'DISCONTINUED' | 'TEMPORARILY_OUT'
  estimatedAvailable?: number
  deliveryTimeDays?: number
  isActive?: boolean
}

export const supplierPriceListsApi = {
  list: (params?: { supplierId?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    apiClient.get('/supplier-price-lists', { params }),

  get: (id: string) =>
    apiClient.get(`/supplier-price-lists/${id}`),

  create: (data: CreateSupplierPriceListInput) =>
    apiClient.post('/supplier-price-lists', data),

  update: (id: string, data: Partial<CreateSupplierPriceListInput>) =>
    apiClient.patch(`/supplier-price-lists/${id}`, data),

  addItem: (priceListId: string, data: AddPriceListItemInput) =>
    apiClient.post(`/supplier-price-lists/${priceListId}/items`, data),

  updateItem: (priceListId: string, itemId: string, data: Partial<AddPriceListItemInput>) =>
    apiClient.patch(`/supplier-price-lists/${priceListId}/items/${itemId}`, data),

  removeItem: (priceListId: string, itemId: string) =>
    apiClient.delete(`/supplier-price-lists/${priceListId}/items/${itemId}`),
}
