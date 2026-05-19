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
}
