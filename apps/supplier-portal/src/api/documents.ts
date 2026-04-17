import { apiClient } from './client'

export const documentsApi = {
  list: () => apiClient.get('/documents').then(r => r.data.data),
  upload: (file: File, name?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    return apiClient.post('/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
  },
  delete: (docId: string) => apiClient.delete(`/documents/${docId}`).then(r => r.data),
}
