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
}
