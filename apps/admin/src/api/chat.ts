import { apiClient } from './client'

export const chatApi = {
  listConversations: () =>
    apiClient.get('/chat/admin/conversations').then(r => r.data),
  getConversation: (id: string) =>
    apiClient.get(`/chat/admin/conversations/${id}`).then(r => r.data),
  sendMessage: (id: string, content: string, fileUrl?: string, fileName?: string) =>
    apiClient.post(`/chat/admin/conversations/${id}/messages`, { content, fileUrl, fileName }).then(r => r.data),
  startConversation: (data: { portalUserId: string; eventId?: string; subject?: string; content: string }) =>
    apiClient.post('/chat/admin/conversations', data).then(r => r.data),
  unreadCount: () =>
    apiClient.get('/chat/admin/conversations/unread').then(r => r.data),
  uploadFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/chat/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}
