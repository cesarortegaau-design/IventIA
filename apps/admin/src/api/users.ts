import { apiClient } from './client'

export const usersApi = {
  listAssignable: () =>
    apiClient.get('/users/assignable').then(r => r.data),
}
