import { apiClient } from './client'

export const ordersApi = {
  list: () => apiClient.get('/orders'),
  get: (orderId: string) => apiClient.get(`/orders/${orderId}`),
  create: (eventId: string, payload: { items: any[]; notes?: string }) =>
    apiClient.post(`/events/${eventId}/orders`, payload),
  me: () => apiClient.get('/me'),
  updateMe: (data: any) => apiClient.patch('/me', data),
  calendar: (params: { eventId?: string; year: number; month: number }) =>
    apiClient.get('/calendar', { params }).then(r => r.data.data),
}
