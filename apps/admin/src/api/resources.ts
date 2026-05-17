import { apiClient } from './client'

export const resourcesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/resources', { params }).then(r => ({
      data: Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [],
      meta: r.data?.meta,
    })),
  get: (id: string) =>
    apiClient.get(`/resources/${id}`).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/resources', data).then(r => r.data),
  update: (id: string, data: any) =>
    apiClient.put(`/resources/${id}`, data).then(r => r.data),
  toggle: (id: string) =>
    apiClient.patch(`/resources/${id}/toggle`).then(r => r.data),
  uploadImage: (id: string, slot: 'main' | 'desc' | 'extra', file: File) => {
    const form = new FormData()
    form.append('image', file)
    return apiClient.post(`/resources/${id}/images/${slot}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  deleteImage: (id: string, slot: 'main' | 'desc' | 'extra') =>
    apiClient.delete(`/resources/${id}/images/${slot}`).then(r => r.data),

  listDepartments: () =>
    apiClient.get('/departments').then(r => r.data?.data ?? r.data ?? []),

  // Package Components
  getPackageComponents: (id: string) =>
    apiClient.get(`/resources/${id}/package-components`).then(r => r.data),
  addPackageComponent: (id: string, data: { componentResourceId: string; quantity: number; sortOrder?: number }) =>
    apiClient.post(`/resources/${id}/package-components`, data).then(r => r.data),
  updatePackageComponent: (id: string, componentId: string, data: { quantity?: number; sortOrder?: number }) =>
    apiClient.put(`/resources/${id}/package-components/${componentId}`, data).then(r => r.data),
  removePackageComponent: (id: string, componentId: string) =>
    apiClient.delete(`/resources/${id}/package-components/${componentId}`).then(r => r.data),

  exportCsv: (params?: Record<string, any>) =>
    apiClient.get('/resources/export-csv', { params }).then(r => r.data),
  importCsv: (rows: any[]) =>
    apiClient.post('/resources/import-csv', { rows }).then(r => r.data),
  exportPackageComponentsCsv: (id: string) =>
    apiClient.get(`/resources/${id}/package-components/export-csv`).then(r => r.data),
  importPackageComponentsCsv: (id: string, rows: any[]) =>
    apiClient.post(`/resources/${id}/package-components/import-csv`, { rows }).then(r => r.data),
}
