import { apiClient } from './client'

export const aiApi = {
  generateEventConcept: (data: {
    eventName: string
    eventType: string
    guestCount?: number
    budget?: number
    notes?: string
  }) => apiClient.post('/ai/event-concept', data).then((r) => r.data),
  generateBudget: (data: {
    eventName: string
    eventType: string
    guestCount?: number
    notes?: string
  }) => apiClient.post('/ai/budget-estimate', data).then((r) => r.data),
  analyzeImage: (data: {
    imageBase64?: string
    imageUrl?: string
    mimeType?: string
    eventType?: string
    eventName?: string
  }) => apiClient.post('/ai/analyze-image', data).then((r) => r.data),
}
