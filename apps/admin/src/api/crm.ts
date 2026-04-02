import { apiClient } from './client'

export const crmApi = {
  // Client 360
  getClientSummary: (clientId: string) =>
    apiClient.get(`/crm/clients/${clientId}/summary`).then(r => r.data),

  // Interactions
  listInteractions: (clientId: string) =>
    apiClient.get(`/crm/clients/${clientId}/interactions`).then(r => r.data),
  createInteraction: (clientId: string, data: any) =>
    apiClient.post(`/crm/clients/${clientId}/interactions`, data).then(r => r.data),
  updateInteraction: (clientId: string, id: string, data: any) =>
    apiClient.put(`/crm/clients/${clientId}/interactions/${id}`, data).then(r => r.data),
  deleteInteraction: (clientId: string, id: string) =>
    apiClient.delete(`/crm/clients/${clientId}/interactions/${id}`).then(r => r.data),

  // Tasks
  listTasks: (clientId: string) =>
    apiClient.get(`/crm/clients/${clientId}/tasks`).then(r => r.data),
  createTask: (clientId: string, data: any) =>
    apiClient.post(`/crm/clients/${clientId}/tasks`, data).then(r => r.data),
  updateTask: (clientId: string, id: string, data: any) =>
    apiClient.put(`/crm/clients/${clientId}/tasks/${id}`, data).then(r => r.data),
  completeTask: (clientId: string, id: string) =>
    apiClient.patch(`/crm/clients/${clientId}/tasks/${id}/complete`).then(r => r.data),
  deleteTask: (clientId: string, id: string) =>
    apiClient.delete(`/crm/clients/${clientId}/tasks/${id}`).then(r => r.data),

  // My tasks
  myTasks: (params?: { status?: string }) =>
    apiClient.get('/crm/my-tasks', { params }).then(r => r.data),
}
