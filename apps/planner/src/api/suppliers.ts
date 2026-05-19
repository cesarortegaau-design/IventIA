import { apiClient } from './client'

export const suppliersApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/suppliers', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/suppliers/${id}`).then((r) => r.data),
  create: (data: any) =>
    apiClient.post('/suppliers', data).then((r) => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/suppliers/${id}`, data).then((r) => r.data),
}
