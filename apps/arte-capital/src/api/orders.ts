import { apiClient } from './client'

export const ordersApi = {
  create: (data: any) =>
    apiClient.post('/orders', data).then((r) => r.data.data),
  list: (params?: Record<string, any>) =>
    apiClient.get('/orders', { params }).then((r) => r.data.data),
  addPayment: (orderId: string, data: any) =>
    apiClient.post(`/orders/${orderId}/payments`, data).then((r) => r.data.data),
}
