import { apiClient } from './client'

export const organizationsApi = {
  list: () => apiClient.get('/organizations').then(r => r.data),
  create: (data: any) => apiClient.post('/organizations', data).then(r => r.data),
  update: (id: string, data: any) => apiClient.put(`/organizations/${id}`, data).then(r => r.data),
  toggle: (id: string) => apiClient.patch(`/organizations/${id}/toggle`).then(r => r.data),
  setDepartmentOrgs: (deptId: string, organizationIds: string[]) =>
    apiClient.put(`/departments/${deptId}/organizations`, { organizationIds }).then(r => r.data),
}
