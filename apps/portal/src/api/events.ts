import { apiClient } from './client'

export const eventsApi = {
  list: () => apiClient.get('/events'),
  get: (eventId: string) => apiClient.get(`/events/${eventId}`),
  getCatalog: (eventId: string) => apiClient.get(`/events/${eventId}/catalog`),
}
