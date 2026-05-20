import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/portal`
  : '/api/v1/portal'

const portalPublicClient = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

export const plannerPortalApi = {
  login: (email: string, password: string) =>
    portalPublicClient.post('/auth/login', { email, password }).then((r) => r.data),
  getSnapshot: (eventId: string, accessToken: string) =>
    portalPublicClient.get(`/planner-snapshot/${eventId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.data),
}
