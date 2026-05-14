import axios from 'axios'
import { playerClient } from './playerClient'

const publicClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export const playerApi = {
  // Auth (no auth required)
  verifyCode: (code: string) =>
    publicClient.post('/iflag/player/verify-code', { code }).then((r) => r.data),
  signup: (data: { code: string; email: string; password: string; firstName: string; lastName: string; phone?: string }) =>
    publicClient.post('/iflag/player/signup', data).then((r) => r.data),
  login: (email: string, password: string) =>
    publicClient.post('/iflag/player/login', { email, password }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    publicClient.post('/iflag/player/refresh', { refreshToken }).then((r) => r.data),

  // Public tournaments (no auth)
  listTournaments: () =>
    publicClient.get('/iflag/public/tournaments').then((r) => r.data),
  getTournament: (eventId: string) =>
    publicClient.get(`/iflag/public/tournaments/${eventId}`).then((r) => r.data),
  getCalendar: (eventId: string) =>
    publicClient.get(`/iflag/public/tournaments/${eventId}/calendar`).then((r) => r.data),
  getPublicGame: (gameId: string) =>
    publicClient.get(`/iflag/public/games/${gameId}`).then((r) => r.data),

  // Player (requires portal JWT)
  getMe: () => playerClient.get('/iflag/player/me').then((r) => r.data),
  updateMe: (data: { firstName?: string; lastName?: string; phone?: string | null }) =>
    playerClient.patch('/iflag/player/me', data).then((r) => r.data),
  getStats: (eventId?: string) =>
    playerClient.get('/iflag/player/stats', { params: eventId ? { eventId } : undefined }).then((r) => r.data),
  payTournament: (eventId: string) =>
    playerClient.post(`/iflag/player/tournaments/${eventId}/pay`).then((r) => r.data),
  verifyPayment: (eventId: string, sessionId: string) =>
    playerClient.post(`/iflag/player/tournaments/${eventId}/verify-payment`, { sessionId }).then((r) => r.data),
}
