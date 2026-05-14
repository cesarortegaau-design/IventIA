import axios from 'axios'
import { usePlayerStore } from '../stores/playerStore'

export const playerClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

playerClient.interceptors.request.use((config) => {
  const token = usePlayerStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

playerClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      usePlayerStore.getState().clearAuth()
      window.location.href = '/player/login'
    }
    return Promise.reject(error)
  },
)
