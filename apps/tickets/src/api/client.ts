import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'

export const apiClient = axios.create({ baseURL: BASE })

export const ticketsApi = {
  listEvents: () => apiClient.get('/public/tickets/events').then(r => r.data),
  getEvent: (slug: string) => apiClient.get(`/public/tickets/events/${slug}`).then(r => r.data),
  createOrder: (data: unknown) => apiClient.post('/public/tickets/orders', data).then(r => r.data),
  getOrder: (token: string) => apiClient.get(`/public/tickets/orders/${token}`).then(r => r.data),
}
