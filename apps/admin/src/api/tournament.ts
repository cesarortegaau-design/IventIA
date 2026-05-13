import { apiClient } from './client'

export interface TournamentConfig {
  id: string
  eventId: string
  numRounds: number
  hasPlayoffs: boolean
  qualificationSystem: string | null
  regFeePerPerson: number | null
  regFeePerTeam: number | null
  settings: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface TournamentVenue {
  id: string
  eventId: string
  name: string
  address: string | null
  capacity: number | null
  notes: string | null
  createdAt: string
}

export interface TeamRegistration {
  id: string
  eventId: string
  teamClientId: string
  category: 'FEMENIL' | 'VARONIL' | 'MIXTO'
  createdAt: string
  teamClient?: {
    id: string
    companyName: string
    isTeam: boolean
    personType: string
  }
}

export interface SportMatchData {
  id: string
  activityId: string
  homeTeamId: string
  visitingTeamId: string
  category: 'FEMENIL' | 'VARONIL' | 'MIXTO'
  venueId: string | null
  round: number
  homeScore: number | null
  visitingScore: number | null
  stats: Record<string, any>
  createdAt: string
  updatedAt: string
  activity?: any
  homeTeam?: { id: string; companyName: string }
  visitingTeam?: { id: string; companyName: string }
}

export const tournamentApi = {
  // Tournament Config
  getConfig: (eventId: string) =>
    apiClient.get(`/events/${eventId}/tournament/config`).then((r) => r.data),

  upsertConfig: (eventId: string, data: Partial<TournamentConfig>) =>
    apiClient.post(`/events/${eventId}/tournament/config`, data).then((r) => r.data),

  // Venues
  listVenues: (eventId: string) =>
    apiClient.get(`/events/${eventId}/tournament/venues`).then((r) => r.data),

  createVenue: (eventId: string, data: { name: string; address?: string | null; capacity?: number | null; notes?: string | null }) =>
    apiClient.post(`/events/${eventId}/tournament/venues`, data).then((r) => r.data),

  updateVenue: (eventId: string, venueId: string, data: Partial<TournamentVenue>) =>
    apiClient.put(`/events/${eventId}/tournament/venues/${venueId}`, data).then((r) => r.data),

  deleteVenue: (eventId: string, venueId: string) =>
    apiClient.delete(`/events/${eventId}/tournament/venues/${venueId}`).then((r) => r.data),

  // Teams
  listTeams: (eventId: string) =>
    apiClient.get(`/events/${eventId}/tournament/teams`).then((r) => r.data),

  registerTeam: (eventId: string, data: { teamClientId: string; category: 'FEMENIL' | 'VARONIL' | 'MIXTO' }) =>
    apiClient.post(`/events/${eventId}/tournament/teams`, data).then((r) => r.data),

  unregisterTeam: (eventId: string, registrationId: string) =>
    apiClient.delete(`/events/${eventId}/tournament/teams/${registrationId}`).then((r) => r.data),

  // Team Players
  getTeamPlayers: (eventId: string, teamId: string) =>
    apiClient.get(`/events/${eventId}/tournament/teams/${teamId}/players`).then((r) => r.data),

  // Schedule
  generateSchedule: (eventId: string, data: {
    startDate: string
    matchDurationMinutes?: number
    breakBetweenMatchesMinutes?: number
    matchesPerDay?: number
  }) =>
    apiClient.post(`/events/${eventId}/tournament/generate-schedule`, data).then((r) => r.data),

  // Match Scoring
  updateMatchScore: (eventId: string, activityId: string, data: {
    homeScore?: number | null
    visitingScore?: number | null
    stats?: Record<string, any>
  }) =>
    apiClient.patch(`/events/${eventId}/activities/${activityId}/match`, data).then((r) => r.data),
}
