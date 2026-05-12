import { apiClient } from './client'

export const floorPlansApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans`).then((r) => r.data),

  /** Get an R2 presigned upload URL (no file data touches the server). */
  getUploadSignature: (eventId: string, filename: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/sign`, { params: { filename } }).then((r) => r.data),

  /** Register the R2 URL in the database after a browser-direct upload. */
  createRecord: (eventId: string, payload: { fileUrl: string; fileName: string; name?: string }) =>
    apiClient.post(`/events/${eventId}/floor-plans`, payload).then((r) => r.data),

  getContent: (eventId: string, fpId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/${fpId}/content`).then((r) => r.data),

  delete: (eventId: string, fpId: string) =>
    apiClient.delete(`/events/${eventId}/floor-plans/${fpId}`).then((r) => r.data),
}
