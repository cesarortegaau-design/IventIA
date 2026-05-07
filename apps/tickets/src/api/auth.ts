import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'
const publicClient = axios.create({ baseURL: BASE })

export const authApi = {
  register: (data: {
    email: string; password: string; firstName: string
    lastName: string; phone?: string; hCaptchaToken?: string
  }) => publicClient.post('/public/tickets/auth/register', data),

  login: (email: string, password: string) =>
    publicClient.post('/public/tickets/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    publicClient.post('/public/tickets/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    publicClient.post('/public/tickets/auth/reset-password', { token, password }),

  refresh: (refreshToken: string) =>
    publicClient.post('/public/tickets/auth/refresh', { refreshToken }),
}
