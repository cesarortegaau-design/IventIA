import { apiClient } from './client'

export const productionApi = {
  resourcePlanning: (params?: { eventId?: string; departmentId?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get('/production/resource-planning', { params }).then(r => r.data),

  profitability: (params?: { eventId?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get('/production/profitability', { params }).then(r => r.data),
}
