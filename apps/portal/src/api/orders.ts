import { apiClient } from './client'

export const ordersApi = {
  list: () => apiClient.get('/orders'),
  get: (orderId: string) => apiClient.get(`/orders/${orderId}`),
  create: (eventId: string, payload: { items: any[]; notes?: string }) =>
    apiClient.post(`/events/${eventId}/orders`, payload),
  me: () => apiClient.get('/me'),
  updateMe: (data: any) => apiClient.patch('/me', data),
}
