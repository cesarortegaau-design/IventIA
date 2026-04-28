import { apiClient } from './client'

export interface StandSaveData {
  id?: string
  code: string
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED'
  widthM?: number | null
  depthM?: number | null
  heightM?: number | null
  locationNotes?: string | null
  polygon: [number, number][]
  dxfEntityIdx: number | null
  floorPlanId: string
}

export const standsApi = {
  list: (eventId: string) =>
    apiClient.get(`/events/${eventId}/stands`).then((r) => r.data),

  create: (eventId: string, data: StandSaveData) =>
    apiClient.post(`/events/${eventId}/stands`, data).then((r) => r.data),

  update: (eventId: string, standId: string, data: Partial<StandSaveData>) =>
    apiClient.put(`/events/${eventId}/stands/${standId}`, data).then((r) => r.data),

  delete: (eventId: string, standId: string) =>
    apiClient.delete(`/events/${eventId}/stands/${standId}`).then((r) => r.data),
}
