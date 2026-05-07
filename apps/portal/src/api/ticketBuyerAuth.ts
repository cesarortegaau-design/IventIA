import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/public/tickets`
  : '/api/v1/public/tickets'

const publicClient = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

export const ticketBuyerAuthApi = {
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    hCaptchaToken?: string
  }) => publicClient.post('/auth/register', data),

  login: (email: string, password: string) =>
    publicClient.post('/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    publicClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    publicClient.post('/auth/reset-password', { token, password }),

  refresh: (refreshToken: string) =>
    publicClient.post('/auth/refresh', { refreshToken }),
}
