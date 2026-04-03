import { apiClient } from './client'

export const chatApi = {
  listConversations: () =>
    apiClient.get('/chat/portal/conversations').then(r => r.data),
  getConversation: (id: string) =>
    apiClient.get(`/chat/portal/conversations/${id}`).then(r => r.data),
  startConversation: (data: { eventId?: string; subject?: string; content: string }) =>
    apiClient.post('/chat/portal/conversations', data).then(r => r.data),
  sendMessage: (id: string, content: string) =>
    apiClient.post(`/chat/portal/conversations/${id}/messages`, { content }).then(r => r.data),
  unreadCount: () =>
    apiClient.get('/chat/portal/conversations/unread').then(r => r.data),
}
