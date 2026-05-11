import { apiClient } from './client'

export const budgetsApi = {
  listByEvent: (eventId: string) =>
    apiClient.get(`/events/${eventId}/budgets`).then(r => r.data),
  get: (budgetId: string) =>
    apiClient.get(`/budgets/${budgetId}`).then(r => r.data),
  create: (eventId: string, data: any) =>
    apiClient.post(`/events/${eventId}/budgets`, data).then(r => r.data),
  delete: (budgetId: string) =>
    apiClient.delete(`/budgets/${budgetId}`).then(r => r.data),
  updateLine: (budgetId: string, lineId: string, data: any) =>
    apiClient.patch(`/budgets/${budgetId}/lines/${lineId}`, data).then(r => r.data),
  assignDirectOrder: (budgetId: string, lineId: string, orderId: string) =>
    apiClient.post(`/budgets/${budgetId}/lines/${lineId}/direct-orders`, { orderId }).then(r => r.data),
  removeDirectOrder: (budgetId: string, lineId: string, orderId: string) =>
    apiClient.delete(`/budgets/${budgetId}/lines/${lineId}/direct-orders/${orderId}`).then(r => r.data),
  assignIndirectOrder: (budgetId: string, lineId: string, orderId: string) =>
    apiClient.post(`/budgets/${budgetId}/lines/${lineId}/indirect-orders`, { orderId }).then(r => r.data),
  removeIndirectOrder: (budgetId: string, lineId: string, orderId: string) =>
    apiClient.delete(`/budgets/${budgetId}/lines/${lineId}/indirect-orders/${orderId}`).then(r => r.data),
  assignTask: (budgetId: string, lineId: string, collabTaskId: string) =>
    apiClient.post(`/budgets/${budgetId}/lines/${lineId}/tasks`, { collabTaskId }).then(r => r.data),
  removeTask: (budgetId: string, lineId: string, taskId: string) =>
    apiClient.delete(`/budgets/${budgetId}/lines/${lineId}/tasks/${taskId}`).then(r => r.data),
}
