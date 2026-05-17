import { apiClient } from './client'

export const collabTasksApi = {
  list: (params?: any) =>
    apiClient.get('/collab-tasks', { params }).then(r => r.data.data || []),

  get: (id: string) =>
    apiClient.get(`/collab-tasks/${id}`).then(r => r.data.data),

  create: (data: any) =>
    apiClient.post('/collab-tasks', data).then(r => r.data.data),

  update: (id: string, data: any) =>
    apiClient.put(`/collab-tasks/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    apiClient.delete(`/collab-tasks/${id}`).then(r => r.data),

  listMyEventActivities: () =>
    apiClient.get('/collab-tasks/my-event-activities').then(r => r.data.data || []),

  // Documents
  listDocuments: (taskId: string) =>
    apiClient.get(`/collab-tasks/${taskId}/documents`).then(r => r.data.data || []),

  uploadDocument: (taskId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/collab-tasks/${taskId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data)
  },

  deleteDocument: (taskId: string, docId: string) =>
    apiClient.delete(`/collab-tasks/${taskId}/documents/${docId}`).then(r => r.data),

  // Comments
  listComments: (taskId: string) =>
    apiClient.get(`/collab-tasks/${taskId}/comments`).then(r => r.data.data || []),

  addComment: (taskId: string, content: string) =>
    apiClient.post(`/collab-tasks/${taskId}/comments`, { content }).then(r => r.data.data),

  deleteComment: (taskId: string, commentId: string) =>
    apiClient.delete(`/collab-tasks/${taskId}/comments/${commentId}`).then(r => r.data),

  testNotification: (taskId: string) =>
    apiClient.post(`/collab-tasks/${taskId}/test-notification`).then(r => r.data.data),
}
