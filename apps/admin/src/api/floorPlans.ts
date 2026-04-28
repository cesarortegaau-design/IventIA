import { apiClient } from './client'

export const floorPlansApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans`).then((r) => r.data),

  upload: (eventId: string, file: File, name?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    return apiClient
      .post(`/events/${eventId}/floor-plans`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  getContent: (eventId: string, fpId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/${fpId}/content`).then((r) => r.data),

  delete: (eventId: string, fpId: string) =>
    apiClient.delete(`/events/${eventId}/floor-plans/${fpId}`).then((r) => r.data),
}
