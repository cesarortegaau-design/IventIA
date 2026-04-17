import { apiClient } from './client'

export const clientsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/clients', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/clients/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/clients', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/clients/${id}`, data).then(r => r.data),
  toggle: (id: string) =>
    apiClient.patch(`/clients/${id}/toggle`).then(r => r.data),
  listPortalUsers: () =>
    apiClient.get('/clients/portal-users').then(r => r.data.data),
  linkPortalUser: (id: string, portalUserId: string | null) =>
    apiClient.patch(`/clients/${id}/link-portal-user`, { portalUserId }).then(r => r.data),

  // Client Relations
  addRelation: (id: string, data: any) =>
    apiClient.post(`/clients/${id}/relations`, data).then(r => r.data),
  updateRelation: (id: string, relationId: string, data: any) =>
    apiClient.patch(`/clients/${id}/relations/${relationId}`, data).then(r => r.data),
  deleteRelation: (id: string, relationId: string) =>
    apiClient.delete(`/clients/${id}/relations/${relationId}`).then(r => r.data),

  // Portal Users Management
  getPortalUser: (portalUserId: string) =>
    apiClient.get(`/clients/portal-users/${portalUserId}`).then(r => r.data),
  updatePortalUser: (portalUserId: string, data: any) =>
    apiClient.patch(`/clients/portal-users/${portalUserId}`, data).then(r => r.data),
  resetPortalUserPassword: (portalUserId: string, password: string) =>
    apiClient.post(`/clients/portal-users/${portalUserId}/reset-password`, { password }).then(r => r.data),
  addPortalUserClient: (portalUserId: string, clientId: string) =>
    apiClient.post(`/clients/portal-users/${portalUserId}/clients`, { clientId }).then(r => r.data),
  removePortalUserClient: (portalUserId: string, clientId: string) =>
    apiClient.delete(`/clients/portal-users/${portalUserId}/clients/${clientId}`).then(r => r.data),

  // Supplier Portal Users Management (Admin)
  listSupplierPortalUsers: () =>
    apiClient.get('/clients/supplier-portal-users').then(r => r.data.data),
  getSupplierPortalUser: (id: string) =>
    apiClient.get(`/clients/supplier-portal-users/${id}`).then(r => r.data),
  updateSupplierPortalUser: (id: string, data: any) =>
    apiClient.patch(`/clients/supplier-portal-users/${id}`, data).then(r => r.data),
  resetSupplierPortalUserPassword: (id: string, password: string) =>
    apiClient.post(`/clients/supplier-portal-users/${id}/reset-password`, { password }).then(r => r.data),
  uploadDocument: (id: string, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return apiClient.post(`/clients/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  deleteDocument: (id: string, docId: string) =>
    apiClient.delete(`/clients/${id}/documents/${docId}`).then(r => r.data),
}
