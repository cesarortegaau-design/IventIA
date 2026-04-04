import { apiClient } from './client'

export const chatApi = {
  listConversations: () =>
    apiClient.get('/chat/conversations').then(r => r.data),
  getConversation: (id: string) =>
    apiClient.get(`/chat/conversations/${id}`).then(r => r.data),
  startConversation: (data: { eventId?: string; subject?: string; content: string }) =>
    apiClient.post('/chat/conversations', data).then(r => r.data),
  sendMessage: (id: string, content: string) =>
    apiClient.post(`/chat/conversations/${id}/messages`, { content }).then(r => r.data),
  unreadCount: () =>
    apiClient.get('/chat/conversations/unread').then(r => r.data),
}
