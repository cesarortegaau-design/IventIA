import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/portal`
  : '/api/v1/portal'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken ?? refreshToken)
          original.headers.Authorization = `Bearer ${data.data.accessToken}`
          return apiClient(original)
        } catch {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
        }
      } else {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
