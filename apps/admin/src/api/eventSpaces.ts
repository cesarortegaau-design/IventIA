import { apiClient } from './client'

export const eventSpacesApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/spaces`).then(r => r.data),
  create: (eventId: string, data: any) =>
    apiClient.post(`/events/${eventId}/spaces`, data).then(r => r.data),
  update: (eventId: string, spaceId: string, data: any) =>
    apiClient.put(`/events/${eventId}/spaces/${spaceId}`, data).then(r => r.data),
  remove: (eventId: string, spaceId: string) =>
    apiClient.delete(`/events/${eventId}/spaces/${spaceId}`).then(r => r.data),
  audit: (eventId: string, spaceId: string) =>
    apiClient.get(`/events/${eventId}/spaces/${spaceId}/audit`).then(r => r.data),
}
