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
  createStripeCheckout: (orderId: string) =>
    apiClient.post(`/orders/${orderId}/stripe-checkout`).then(r => r.data),
  verifyStripePayment: (orderId: string, sessionId: string) =>
    apiClient.post(`/orders/${orderId}/verify-stripe-payment`, { sessionId }).then(r => r.data),
  uploadPaymentVoucher: (orderId: string, file: File, method: string, reference?: string, notes?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('method', method)
    if (reference) form.append('reference', reference)
    if (notes) form.append('notes', notes)
    return apiClient.post(`/orders/${orderId}/payment-voucher`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
