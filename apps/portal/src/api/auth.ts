import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/portal`
  : '/api/v1/portal'

// Public calls — no auth token needed
const publicClient = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

export const authApi = {
  verifyCode: (code: string) => publicClient.post('/auth/verify-code', { code }),
  register: (data: { code: string; email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    publicClient.post('/auth/register', data),
  login: (email: string, password: string) => publicClient.post('/auth/login', { email, password }),
  forgotPassword: (email: string) => publicClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => publicClient.post('/auth/reset-password', { token, password }),
  refresh: (refreshToken: string) => publicClient.post('/auth/refresh', { refreshToken }),
}
