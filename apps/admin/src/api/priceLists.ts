import { apiClient } from './client'

export const priceListsApi = {
  list: () =>
    apiClient.get('/price-lists').then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/price-lists/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/price-lists', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/price-lists/${id}`, data).then(r => r.data),
  upsertItem: (id: string, data: any) =>
    apiClient.post(`/price-lists/${id}/items`, data).then(r => r.data),
  removeItem: (id: string, resourceId: string) =>
    apiClient.delete(`/price-lists/${id}/items/${resourceId}`).then(r => r.data),
}
