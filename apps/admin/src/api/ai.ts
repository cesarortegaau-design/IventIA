import { apiClient } from './client'

export const aiApi = {
  getDashboard: () => apiClient.get('/ai/dashboard').then(r => r.data),
  chat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    apiClient.post('/ai/chat', { message, history }).then(r => r.data),
}
