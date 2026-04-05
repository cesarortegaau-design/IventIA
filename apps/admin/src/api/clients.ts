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
  uploadDocument: (id: string, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return apiClient.post(`/clients/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  deleteDocument: (id: string, docId: string) =>
    apiClient.delete(`/clients/${id}/documents/${docId}`).then(r => r.data),
}
