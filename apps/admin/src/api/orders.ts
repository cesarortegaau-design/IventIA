import { apiClient } from './client'

export const ordersApi = {
  create: (eventId: string, data: any) =>
    apiClient.post(`/events/${eventId}/orders`, data).then(r => r.data),
  report: (params?: Record<string, any>) =>
    apiClient.get('/orders', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/orders/${id}`).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.patch(`/orders/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/orders/${id}/status`, { status, notes }).then(r => r.data),
  updateActualValues: (id: string, data: any) =>
    apiClient.patch(`/orders/${id}/actual-values`, data).then(r => r.data),
  addPayment: (id: string, data: any) =>
    apiClient.post(`/orders/${id}/payments`, data).then(r => r.data),
  approvePayment: (id: string) =>
    apiClient.patch(`/orders/${id}/approve-payment`).then(r => r.data),
  uploadDocument: (id: string, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return apiClient.post(`/orders/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  deleteDocument: (id: string, docId: string) =>
    apiClient.delete(`/orders/${id}/documents/${docId}`).then(r => r.data),
}
