import { apiClient } from './client'

export const clientsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/clients', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/clients/${id}`).then((r) => r.data),
  create: (data: any) =>
    apiClient.post('/clients', data).then((r) => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/clients/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    apiClient.delete(`/clients/${id}`).then((r) => r.data),
  getInteractions: (id: string) =>
    apiClient.get(`/clients/${id}/interactions`).then((r) => r.data),
  createInteraction: (id: string, data: any) =>
    apiClient.post(`/clients/${id}/interactions`, data).then((r) => r.data),
  getTasks: (id: string) =>
    apiClient.get(`/clients/${id}/tasks`).then((r) => r.data),
  createTask: (id: string, data: any) =>
    apiClient.post(`/clients/${id}/tasks`, data).then((r) => r.data),
  updateTask: (id: string, taskId: string, data: any) =>
    apiClient.put(`/clients/${id}/tasks/${taskId}`, data).then((r) => r.data),
}
