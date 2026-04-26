import { apiClient } from './client'

export const iflagApi = {
  // Games
  listGames: (params?: { eventId?: string }) =>
    apiClient.get('/iflag/games', { params }).then(r => r.data),
  getGame: (gameId: string) =>
    apiClient.get(`/iflag/games/${gameId}`).then(r => r.data),
  createGame: (data: { eventId: string; localTeamId: string; visitingTeamId: string; notes?: string }) =>
    apiClient.post('/iflag/games', data).then(r => r.data),
  updateGame: (gameId: string, data: Record<string, any>) =>
    apiClient.patch(`/iflag/games/${gameId}`, data).then(r => r.data),

  // Timer
  startTimer: (gameId: string) =>
    apiClient.post(`/iflag/games/${gameId}/timer/start`).then(r => r.data),
  stopTimer: (gameId: string) =>
    apiClient.post(`/iflag/games/${gameId}/timer/stop`).then(r => r.data),
  resetTimer: (gameId: string) =>
    apiClient.post(`/iflag/games/${gameId}/timer/reset`).then(r => r.data),

  // Attendance
  getAttendance: (gameId: string) =>
    apiClient.get(`/iflag/games/${gameId}/attendance`).then(r => r.data),
  upsertAttendance: (gameId: string, data: { playerId: string; present: boolean; teamId?: string; number?: string; position?: string }) =>
    apiClient.patch(`/iflag/games/${gameId}/attendance`, data).then(r => r.data),

  // Game events
  listGameEvents: (gameId: string) =>
    apiClient.get(`/iflag/games/${gameId}/events`).then(r => r.data),
  recordEvent: (gameId: string, data: Record<string, any>) =>
    apiClient.post(`/iflag/games/${gameId}/events`, data).then(r => r.data),

  // Team roster
  getTeamPlayers: (teamId: string) =>
    apiClient.get(`/iflag/teams/${teamId}/players`).then(r => r.data),
}
