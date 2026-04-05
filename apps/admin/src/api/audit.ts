import { apiClient } from './client'

export const auditApi = {
  getLog: (entityType: string, entityId: string, params?: any) =>
    apiClient.get(`/audit/${entityType}/${entityId}`, { params }).then(r => r.data),
}
