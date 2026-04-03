import { apiClient } from './client'

export const portalCodesApi = {
  list: (eventId: string) => apiClient.get(`/events/${eventId}/portal-codes`),
  generate: (eventId: string, data: { count: number; maxUses?: number; expiresAt?: string }) =>
    apiClient.post(`/events/${eventId}/portal-codes/generate`, data),
  revoke: (eventId: string, codeId: string) =>
    apiClient.patch(`/events/${eventId}/portal-codes/${codeId}/revoke`),
}
