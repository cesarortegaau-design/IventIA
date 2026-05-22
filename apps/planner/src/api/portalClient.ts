import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/portal`
  : '/api/v1/portal'

const portalPublicClient = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

const authHeader = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

export const plannerPortalApi = {
  login: (email: string, password: string) =>
    portalPublicClient.post('/auth/login', { email, password }).then((r) => r.data),

  getSnapshot: (eventId: string, accessToken: string) =>
    portalPublicClient.get(`/planner-snapshot/${eventId}`, authHeader(accessToken)).then((r) => r.data),

  addTask: (eventId: string, task: { id?: string; title: string; notes?: string; dueDate?: string }, token: string) =>
    portalPublicClient.patch(`/planner-tareas/${eventId}`, task, authHeader(token)).then((r) => r.data),

  createPaymentCheckout: (eventId: string, paymentId: string, token: string) =>
    portalPublicClient.post(`/planner-payments/${eventId}/checkout`, { paymentId }, authHeader(token)).then((r) => r.data),

  verifyPayment: (eventId: string, sessionId: string, paymentId: string, token: string) =>
    portalPublicClient.post(`/planner-payments/${eventId}/verify`, { sessionId, paymentId }, authHeader(token)).then((r) => r.data),

  authorizeQuote: (eventId: string, token: string) =>
    portalPublicClient.post(`/planner-contract/${eventId}/authorize`, {}, authHeader(token)).then((r) => r.data),

  signContract: (eventId: string, signatureData: string, token: string) =>
    portalPublicClient.post(`/planner-contract/${eventId}/sign`, { signatureData }, authHeader(token)).then((r) => r.data),
}
