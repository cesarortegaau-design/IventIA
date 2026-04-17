import { apiClient } from './client'

export interface Supplier {
  id: string
  tenantId: string
  code: string
  name: string
  description?: string
  type: 'DISTRIBUTOR' | 'MANUFACTURER' | 'WHOLESALER' | 'SERVICES'
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  rfc?: string
  taxId?: string
  fiscalRegime?: string
  legalName?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  paymentTerms?: string
  averageDeliveryDays?: number
  currencyCode?: string
  createdAt: string
  updatedAt: string
  contacts?: SupplierContact[]
}

export interface SupplierContact {
  id: string
  supplierId: string
  name: string
  role?: string
  email?: string
  phone?: string
  whatsapp?: string
  isActive: boolean
  isPrimary: boolean
}

export interface CreateSupplierInput {
  name: string
  description?: string
  type: 'DISTRIBUTOR' | 'MANUFACTURER' | 'WHOLESALER' | 'SERVICES'
  rfc?: string
  taxId?: string
  fiscalRegime?: string
  legalName?: string
  email?: string
  phone?: string
  whatsapp?: string
  website?: string
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  paymentTerms?: string
  averageDeliveryDays?: number | string
  currencyCode?: string
}

function mapToApi(data: Record<string, any>, stripStatus = false) {
  const { street, city, state, zip, country, paymentTerms, averageDeliveryDays, status, ...rest } = data
  return {
    ...rest,
    ...(!stripStatus && status !== undefined && { status }),
    ...(street !== undefined && { addressStreet: street }),
    ...(city !== undefined && { addressCity: city }),
    ...(state !== undefined && { addressState: state }),
    ...(zip !== undefined && { addressZip: zip }),
    ...(country !== undefined && { addressCountry: country }),
    ...(paymentTerms !== undefined && { defaultPaymentTerms: paymentTerms }),
    ...(averageDeliveryDays !== undefined && { averageDeliveryDays: Number(averageDeliveryDays) || undefined }),
  }
}

export const suppliersApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string; search?: string; type?: string }) =>
    apiClient.get('/suppliers', { params }),

  get: (id: string) =>
    apiClient.get(`/suppliers/${id}`),

  create: (data: CreateSupplierInput) =>
    apiClient.post('/suppliers', mapToApi(data, true)),

  update: (id: string, data: Partial<CreateSupplierInput>) =>
    apiClient.patch(`/suppliers/${id}`, mapToApi(data)),

  toggleStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED') =>
    apiClient.patch(`/suppliers/${id}/status`, { status }),

  addContact: (supplierId: string, data: { name: string; role?: string; email?: string; phone?: string; whatsapp?: string; isPrimary?: boolean }) =>
    apiClient.post(`/suppliers/${supplierId}/contacts`, data),

  updateContact: (supplierId: string, contactId: string, data: Partial<SupplierContact>) =>
    apiClient.patch(`/suppliers/${supplierId}/contacts/${contactId}`, data),

  removeContact: (supplierId: string, contactId: string) =>
    apiClient.delete(`/suppliers/${supplierId}/contacts/${contactId}`),
}
