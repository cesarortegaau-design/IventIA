import { apiClient } from './client'

export const floorPlansApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans`).then((r) => r.data),

  /** Upload a DXF file directly to the server (multipart/form-data). Server streams to R2. */
  uploadFile: (eventId: string, blob: Blob, filename: string) => {
    const fd = new FormData()
    fd.append('file', blob, filename)
    return apiClient.post(`/events/${eventId}/floor-plans/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  getContent: (eventId: string, fpId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/${fpId}/content`).then((r) => r.data),

  delete: (eventId: string, fpId: string) =>
    apiClient.delete(`/events/${eventId}/floor-plans/${fpId}`).then((r) => r.data),
}
