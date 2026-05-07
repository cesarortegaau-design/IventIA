import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { authApi } from './auth'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'
const myApi = axios.create({ baseURL: BASE })

myApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

myApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error)

    const { refreshToken, setTokens, clearAuth } = useAuthStore.getState()
    if (!refreshToken) { clearAuth(); return Promise.reject(error) }

    if (isRefreshing) {
      return new Promise((resolve, reject) => failQueue.push({ resolve, reject }))
        .then((token) => { original.headers.Authorization = `Bearer ${token}`; return myApi(original) })
        .catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true
    try {
      const { data } = await authApi.refresh(refreshToken)
      const { accessToken: newAccess, refreshToken: newRefresh } = data.data
      setTokens(newAccess, newRefresh)
      failQueue.forEach(p => p.resolve(newAccess))
      failQueue = []
      original.headers.Authorization = `Bearer ${newAccess}`
      return myApi(original)
    } catch {
      failQueue.forEach(p => p.reject(error))
      failQueue = []
      clearAuth()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export const myTicketsApi = {
  listOrders: () => myApi.get('/public/tickets/my/orders'),
  downloadPdf: (token: string) => myApi.get(`/public/tickets/my/orders/${token}/pdf`, { responseType: 'blob' }),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string | null }) =>
    myApi.patch('/public/tickets/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    myApi.post('/public/tickets/me/change-password', { currentPassword, newPassword }),
}
