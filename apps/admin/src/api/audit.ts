import { apiClient } from './client'

export const auditApi = {
  getLog: (entityType: string, entityId: string, params?: any) =>
    apiClient.get(`/audit/${entityType}/${entityId}`, { params }).then(r => r.data),
  getLogByType: (entityType: string, params?: any) =>
    apiClient.get(`/audit/${entityType}`, { params }).then(r => r.data),
}
