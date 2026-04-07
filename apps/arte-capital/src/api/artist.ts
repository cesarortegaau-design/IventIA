import { apiClient } from './client'

export const artistApi = {
  getEarnings: () =>
    apiClient.get('/artist/earnings').then((r) => r.data.data),
}
