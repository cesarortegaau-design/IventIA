import { apiClient } from './client'

export const resourcesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/resources', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/resources/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/resources', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/resources/${id}`, data).then(r => r.data),
  toggle: (id: string) =>
    apiClient.patch(`/resources/${id}/toggle`).then(r => r.data),
}
