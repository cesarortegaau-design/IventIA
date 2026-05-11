import { apiClient } from './client'

export const priceListsApi = {
  list: (params?: { isConceptList?: boolean }) =>
    apiClient.get('/price-lists', { params }).then(r => r.data),
  get: (id: string, params?: { departmentIds?: string }) =>
    apiClient.get(`/price-lists/${id}`, { params }).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/price-lists', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/price-lists/${id}`, data).then(r => r.data),
  upsertItem: (id: string, data: any) =>
    apiClient.post(`/price-lists/${id}/items`, data).then(r => r.data),
  removeItem: (id: string, resourceId: string) =>
    apiClient.delete(`/price-lists/${id}/items/${resourceId}`).then(r => r.data),
  importItems: (id: string, rows: any[]) =>
    apiClient.post(`/price-lists/${id}/items/import`, { rows }).then(r => r.data),
}
