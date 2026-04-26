import { apiClient } from './client'

export const iflagApi = {
  listGames: (params?: { eventId?: string }) =>
    apiClient.get('/iflag/games', { params }).then(r => r.data),
  getGame: (gameId: string) =>
    apiClient.get(`/iflag/games/${gameId}`).then(r => r.data),
  createGame: (data: any) =>
    apiClient.post('/iflag/games', data).then(r => r.data),
  updateGame: (gameId: string, data: any) =>
    apiClient.patch(`/iflag/games/${gameId}`, data).then(r => r.data),
  startTimer: (gameId: string) =>
    apiClient.post(`/iflag/games/${gameId}/timer/start`).then(r => r.data),
  stopTimer: (gameId: string) =>
    apiClient.post(`/iflag/games/${gameId}/timer/stop`).then(r => r.data),
  resetTimer: (gameId: string) =>
    apiClient.post(`/iflag/games/${gameId}/timer/reset`).then(r => r.data),
  getAttendance: (gameId: string) =>
    apiClient.get(`/iflag/games/${gameId}/attendance`).then(r => r.data),
  upsertAttendance: (gameId: string, data: any) =>
    apiClient.patch(`/iflag/games/${gameId}/attendance`, data).then(r => r.data),
  listGameEvents: (gameId: string) =>
    apiClient.get(`/iflag/games/${gameId}/events`).then(r => r.data),
  recordEvent: (gameId: string, data: any) =>
    apiClient.post(`/iflag/games/${gameId}/events`, data).then(r => r.data),
  getTeamPlayers: (teamId: string) =>
    apiClient.get(`/iflag/teams/${teamId}/players`).then(r => r.data),
  listEvents: (params?: any) =>
    apiClient.get('/events', { params }).then(r => r.data),
  listTeams: () =>
    apiClient.get('/clients', { params: { isTeam: true, pageSize: 100 } }).then(r => r.data),
}
