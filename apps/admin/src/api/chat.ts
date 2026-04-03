import { apiClient } from './client'

export const chatApi = {
  listConversations: () =>
    apiClient.get('/chat/admin/conversations').then(r => r.data),
  getConversation: (id: string) =>
    apiClient.get(`/chat/admin/conversations/${id}`).then(r => r.data),
  sendMessage: (id: string, content: string) =>
    apiClient.post(`/chat/admin/conversations/${id}/messages`, { content }).then(r => r.data),
  unreadCount: () =>
    apiClient.get('/chat/admin/conversations/unread').then(r => r.data),
}
