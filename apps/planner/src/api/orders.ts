import { apiClient } from './client'

export const ordersApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/orders', { params }).then((r) => r.data),
}
