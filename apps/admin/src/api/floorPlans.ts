import { apiClient } from './client'

export const floorPlansApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans`).then((r) => r.data),

  // Upload the DXF file via the API server (handles large files reliably)
  upload: (eventId: string, file: File, onProgress?: (pct: number) => void) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiClient.post(`/events/${eventId}/floor-plans/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10 * 60 * 1000, // 10 min — large DXF files can take a while
      onUploadProgress: onProgress
        ? (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) }
        : undefined,
    }).then((r) => r.data)
  },

  getContent: (eventId: string, fpId: string) =>
    apiClient.get(`/events/${eventId}/floor-plans/${fpId}/content`).then((r) => r.data),

  delete: (eventId: string, fpId: string) =>
    apiClient.delete(`/events/${eventId}/floor-plans/${fpId}`).then((r) => r.data),
}
