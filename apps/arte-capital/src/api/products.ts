import { apiClient } from './client'

export const productsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/products', { params }).then((r) => r.data.data),
  get: (id: string) =>
    apiClient.get(`/products/${id}`).then((r) => r.data.data),
  create: (data: any) =>
    apiClient.post('/products', data).then((r) => r.data.data),
}
