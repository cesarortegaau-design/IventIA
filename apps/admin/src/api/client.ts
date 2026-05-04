import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Single in-flight refresh promise shared across all concurrent 401 retries
let refreshPromise: Promise<string> | null = null

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          const refreshToken = useAuthStore.getState().refreshToken
          refreshPromise = axios
            .post(`${baseURL.replace('/api/v1', '')}/api/v1/auth/refresh`, { refreshToken })
            .then(({ data }) => {
              const store = useAuthStore.getState()
              store.setAuth(store.user!, data.data.accessToken, store.refreshToken!)
              return data.data.accessToken as string
            })
            .finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
