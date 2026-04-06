import { apiClient } from './client'

export const eventsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/events', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/events/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/events', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/events/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/events/${id}/status`, { status, notes }).then(r => r.data),
  listOrders: (eventId: string) =>
    apiClient.get(`/events/${eventId}/orders`).then(r => r.data),
  createOrder: (eventId: string, data: any) =>
    apiClient.post(`/events/${eventId}/orders`, data).then(r => r.data),
  uploadDocument: (id: string, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return apiClient.post(`/events/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  deleteDocument: (id: string, docId: string) =>
    apiClient.delete(`/events/${id}/documents/${docId}`).then(r => r.data),
  importStands: (eventId: string, rows: any[]) =>
    apiClient.post(`/events/${eventId}/stands/import`, rows).then(r => r.data),
}
