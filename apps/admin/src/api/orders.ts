import { apiClient } from './client'

export const ordersApi = {
  get: (id: string) =>
    apiClient.get(`/orders/${id}`).then(r => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/orders/${id}/status`, { status, notes }).then(r => r.data),
  addPayment: (id: string, data: any) =>
    apiClient.post(`/orders/${id}/payments`, data).then(r => r.data),
}
