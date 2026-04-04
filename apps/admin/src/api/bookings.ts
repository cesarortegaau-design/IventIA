import { apiClient } from './client'

export const bookingsApi = {
  calendar: (params: {
    dateFrom: string
    dateTo: string
    resourceType?: string
    eventId?: string
    eventStatus?: string
    resourceSearch?: string
  }) => apiClient.get('/bookings/calendar', { params }).then(r => r.data),
}
