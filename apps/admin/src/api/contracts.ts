import { apiClient } from './client'

export const contractsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/contracts', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/contracts/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/contracts', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.patch(`/contracts/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/contracts/${id}/status`, { status }).then(r => r.data),

  // Orders
  getAvailableOrders: (id: string) =>
    apiClient.get(`/contracts/${id}/available-orders`).then(r => r.data),
  addOrder: (id: string, orderId: string) =>
    apiClient.post(`/contracts/${id}/orders/${orderId}`).then(r => r.data),
  removeOrder: (id: string, orderId: string) =>
    apiClient.delete(`/contracts/${id}/orders/${orderId}`).then(r => r.data),

  // Scheduled Payments
  addScheduledPayment: (id: string, data: any) =>
    apiClient.post(`/contracts/${id}/scheduled-payments`, data).then(r => r.data),
  updateScheduledPayment: (id: string, spId: string, data: any) =>
    apiClient.patch(`/contracts/${id}/scheduled-payments/${spId}`, data).then(r => r.data),
  deleteScheduledPayment: (id: string, spId: string) =>
    apiClient.delete(`/contracts/${id}/scheduled-payments/${spId}`).then(r => r.data),

  // Payments
  addPayment: (id: string, spId: string, data: any) =>
    apiClient.post(`/contracts/${id}/scheduled-payments/${spId}/payments`, data).then(r => r.data),
}
