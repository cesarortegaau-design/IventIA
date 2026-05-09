import { apiClient } from './client'

export const eventActivitiesApi = {
  list:    (eventId: string) =>
    apiClient.get(`/events/${eventId}/activities`).then(r => r.data),
  create:  (eventId: string, data: any) =>
    apiClient.post(`/events/${eventId}/activities`, data).then(r => r.data),
  update:  (eventId: string, activityId: string, data: any) =>
    apiClient.put(`/events/${eventId}/activities/${activityId}`, data).then(r => r.data),
  remove:  (eventId: string, activityId: string) =>
    apiClient.delete(`/events/${eventId}/activities/${activityId}`).then(r => r.data),
  reorder: (eventId: string, positions: { id: string; position: number }[]) =>
    apiClient.patch(`/events/${eventId}/activities/reorder`, positions).then(r => r.data),
  exportCsv: (eventId: string) =>
    apiClient.get(`/events/${eventId}/activities/export`, { responseType: 'blob' }).then(r => r.data),
  importCsv: (eventId: string, rows: any[]) =>
    apiClient.post(`/events/${eventId}/activities/import`, rows).then(r => r.data),
  listDocuments: (eventId: string, activityId: string) =>
    apiClient.get(`/events/${eventId}/activities/${activityId}/documents`).then(r => r.data),
  uploadDocument: (eventId: string, activityId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiClient.post(`/events/${eventId}/activities/${activityId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  deleteDocument: (eventId: string, activityId: string, docId: string) =>
    apiClient.delete(`/events/${eventId}/activities/${activityId}/documents/${docId}`).then(r => r.data),
}
