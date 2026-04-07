import { apiClient } from './client'

export const authApi = {
  register: (data: any) =>
    apiClient.post('/auth/register', data).then((r) => r.data.data),
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then((r) => r.data.data),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data.data),
  getProfile: () =>
    apiClient.get('/user/profile').then((r) => r.data.data),
}
