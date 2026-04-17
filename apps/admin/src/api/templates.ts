import { apiClient } from './client'

export const templatesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get('/templates', { params }).then(r => r.data),
  upload: (file: File, name: string, context: string, description?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    form.append('context', context)
    if (description) form.append('description', description)
    return apiClient.post('/templates', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  delete: (id: string) =>
    apiClient.delete(`/templates/${id}`).then(r => r.data),
  generate: (id: string, entityId: string) =>
    apiClient.post(`/templates/${id}/generate`, { entityId }, { responseType: 'blob' }).then(r => r),
  download: (blobKey: string, fileName: string) =>
    apiClient.get(`/templates/download/${blobKey}`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(new Blob([r.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }),
  getLabels: (context: string) =>
    apiClient.get(`/templates/labels/${context}`).then(r => r.data),
}
