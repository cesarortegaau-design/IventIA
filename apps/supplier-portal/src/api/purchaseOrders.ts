import { apiClient } from './client'

export const purchaseOrdersApi = {
  list: () => apiClient.get('/orders').then(r => r.data.data),
  get: (id: string) => apiClient.get(`/orders/${id}`).then(r => r.data.data),
}
