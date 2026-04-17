import { apiClient } from './client'

export const authApi = {
  verifyCode: (code: string) => apiClient.post('/auth/verify-code', { code }),
  register: (data: { code: string; email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    apiClient.post('/auth/register', data),
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
  me: () => apiClient.get('/me'),
  updateMe: (data: any) => apiClient.patch('/me', data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => apiClient.post('/auth/reset-password', { token, password }),
}
