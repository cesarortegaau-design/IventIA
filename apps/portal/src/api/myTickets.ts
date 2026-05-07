import axios from 'axios'
import { useTicketBuyerAuthStore } from '../stores/ticketBuyerAuthStore'
import { ticketBuyerAuthApi } from './ticketBuyerAuth'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/public/tickets`
  : '/api/v1/public/tickets'

const myTicketsAxios = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

myTicketsAxios.interceptors.request.use((config) => {
  const token = useTicketBuyerAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

myTicketsAxios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    const { refreshToken, setTokens, clearAuth } = useTicketBuyerAuthStore.getState()
    if (!refreshToken) { clearAuth(); return Promise.reject(error) }

    if (isRefreshing) {
      return new Promise((resolve, reject) => failQueue.push({ resolve, reject }))
        .then((token) => { original.headers.Authorization = `Bearer ${token}`; return myTicketsAxios(original) })
        .catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true
    try {
      const { data } = await ticketBuyerAuthApi.refresh(refreshToken)
      const { accessToken: newAccess, refreshToken: newRefresh } = data.data
      setTokens(newAccess, newRefresh)
      failQueue.forEach(p => p.resolve(newAccess))
      failQueue = []
      original.headers.Authorization = `Bearer ${newAccess}`
      return myTicketsAxios(original)
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
  me: () => myTicketsAxios.get('/me'),
  listOrders: () => myTicketsAxios.get('/my/orders'),
  getOrder: (token: string) => myTicketsAxios.get(`/my/orders/${token}`),
  pdfUrl: (token: string) => `${baseURL}/my/orders/${token}/pdf`,
}
