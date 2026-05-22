import { apiClient } from './client'

export const eventsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/events', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/events/${id}`).then((r) => r.data),
  create: (data: any) =>
    apiClient.post('/events', data).then((r) => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/events/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/events/${id}/status`, { status, notes }).then((r) => r.data),
  uploadDocument: (id: string, file: File, documentType: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('documentType', documentType)
    return apiClient.post(`/events/${id}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
  deleteDocument: (id: string, docId: string) =>
    apiClient.delete(`/events/${id}/documents/${docId}`).then((r) => r.data),
  getActivities: (id: string) =>
    apiClient.get(`/events/${id}/activities`).then((r) => r.data),
  createActivity: (id: string, data: any) =>
    apiClient.post(`/events/${id}/activities`, data).then((r) => r.data),
  updateActivity: (id: string, actId: string, data: any) =>
    apiClient.put(`/events/${id}/activities/${actId}`, data).then((r) => r.data),
  deleteActivity: (id: string, actId: string) =>
    apiClient.delete(`/events/${id}/activities/${actId}`).then((r) => r.data),
  getBudgets: (id: string) =>
    apiClient.get(`/events/${id}/budgets`).then((r) => r.data),
  createBudget: (id: string, data: any) =>
    apiClient.post(`/events/${id}/budgets`, data).then((r) => r.data),
  updateBudget: (id: string, budgetId: string, data: any) =>
    apiClient.put(`/events/${id}/budgets/${budgetId}`, data).then((r) => r.data),
  deleteBudget: (id: string, budgetId: string) =>
    apiClient.delete(`/events/${id}/budgets/${budgetId}`).then((r) => r.data),
  getCollabTasks: (id: string) =>
    apiClient.get(`/events/${id}/collab-tasks`).then((r) => r.data),
  createCollabTask: (id: string, data: any) =>
    apiClient.post(`/events/${id}/collab-tasks`, data).then((r) => r.data),
  updateCollabTask: (id: string, taskId: string, data: any) =>
    apiClient.put(`/events/${id}/collab-tasks/${taskId}`, data).then((r) => r.data),
  createPortalDirectAccess: (id: string, data: { email: string; password: string; firstName: string; lastName: string }) =>
    apiClient.post(`/events/${id}/portal-codes/direct-access`, data).then((r) => r.data),
  publishPlannerPortal: (id: string, data: object) =>
    apiClient.post(`/events/${id}/planner-portal/publish`, { data }).then((r) => r.data),
  getLienzo: (id: string) =>
    apiClient.get(`/events/${id}/lienzo`).then((r) => r.data),
  saveLienzo: (id: string, widgets: any[], strokes?: any[]) =>
    apiClient.put(`/events/${id}/lienzo`, { widgets, strokes: strokes ?? [] }).then((r) => r.data),
  getPlannerStore: (id: string, key: string) =>
    apiClient.get(`/events/${id}/planner-store/${key}`).then((r) => r.data),
  savePlannerStore: (id: string, key: string, data: any) =>
    apiClient.put(`/events/${id}/planner-store/${key}`, { data }).then((r) => r.data),
  getAllPlannerStores: (id: string) =>
    apiClient.get(`/events/${id}/planner-stores`).then((r) => r.data),
  getAssignableUsers: () =>
    apiClient.get('/users/assignable').then((r) => r.data),
}
