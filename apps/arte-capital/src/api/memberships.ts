import { apiClient } from './client'

export const membershipsApi = {
  getTiers: () =>
    apiClient.get('/memberships/tiers').then((r) => r.data.data),
  create: (data: any) =>
    apiClient.post('/memberships', data).then((r) => r.data.data),
  getActive: () =>
    apiClient.get('/user/membership').then((r) => r.data.data),
}
