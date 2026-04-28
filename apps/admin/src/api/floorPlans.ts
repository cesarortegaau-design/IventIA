import { apiClient } from './client'

export const floorPlansApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans`).then((r) => r.data),

  // Step 1 — get a Cloudinary signed-upload token (no file passes through the server)
  getUploadSignature: (eventId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/sign`).then((r) => r.data),

  // Step 2 — save the DB record after the browser has uploaded directly to Cloudinary
  createRecord: (eventId: string, data: { fileUrl: string; fileName: string; name?: string }) =>
    apiClient.post(`/events/${eventId}/floor-plans`, data).then((r) => r.data),

  getContent: (eventId: string, fpId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/${fpId}/content`).then((r) => r.data),

  delete: (eventId: string, fpId: string) =>
    apiClient.delete(`/events/${eventId}/floor-plans/${fpId}`).then((r) => r.data),
}
