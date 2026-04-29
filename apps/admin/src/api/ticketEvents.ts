import { apiClient } from './client'

export const ticketEventsApi = {
  get: (eventId: string) =>
    apiClient.get(`/events/${eventId}/tickets`).then(r => r.data),
  upsert: (eventId: string, data: any) =>
    apiClient.put(`/events/${eventId}/tickets`, data).then(r => r.data),
  createSection: (eventId: string, data: any) =>
    apiClient.post(`/events/${eventId}/tickets/sections`, data).then(r => r.data),
  updateSection: (eventId: string, sectionId: string, data: any) =>
    apiClient.put(`/events/${eventId}/tickets/sections/${sectionId}`, data).then(r => r.data),
  deleteSection: (eventId: string, sectionId: string) =>
    apiClient.delete(`/events/${eventId}/tickets/sections/${sectionId}`).then(r => r.data),
  generateSeats: (eventId: string, sectionId: string, data: { rows: string[]; seatsPerRow: number }) =>
    apiClient.post(`/events/${eventId}/tickets/sections/${sectionId}/seats`, data).then(r => r.data),
  listOrders: (eventId: string) =>
    apiClient.get(`/events/${eventId}/tickets/orders`).then(r => r.data),
}
