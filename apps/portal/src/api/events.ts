import { apiClient } from './client'

export const eventsApi = {
  list: () => apiClient.get('/events'),
  get: (eventId: string) => apiClient.get(`/events/${eventId}`),
  getCatalog: (eventId: string) => apiClient.get(`/events/${eventId}/catalog`),
  getFloorPlan: (eventId: string) => apiClient.get(`/events/${eventId}/floor-plan`).then((r) => r.data),
  getFloorPlanContent: (eventId: string, fpId: string) =>
    apiClient.get(`/events/${eventId}/floor-plan/${fpId}/content`).then((r) => r.data),
}
