import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requirePrivilege } from '../middleware/authorize'
import { PRIVILEGES } from '@iventia/shared'
import {
  getTournamentConfig,
  upsertTournamentConfig,
  listTournamentVenues,
  createTournamentVenue,
  updateTournamentVenue,
  deleteTournamentVenue,
  listTeamRegistrations,
  registerTeam,
  unregisterTeam,
  getTeamPlayers,
  generateTournamentSchedule,
  generatePlayerCodes,
  listPlayerCodes,
} from '../controllers/tournament.controller'
import { getEventTeamStats } from '../controllers/iflag.controller'

const router = Router({ mergeParams: true })

router.use(authenticate)

// Tournament Config
router.get('/config', requirePrivilege(PRIVILEGES.EVENT_VIEW), getTournamentConfig)
router.post('/config', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), upsertTournamentConfig)

// Tournament Venues
router.get('/venues', requirePrivilege(PRIVILEGES.EVENT_VIEW), listTournamentVenues)
router.post('/venues', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), createTournamentVenue)
router.put('/venues/:venueId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), updateTournamentVenue)
router.delete('/venues/:venueId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), deleteTournamentVenue)

// Team Registrations
router.get('/teams', requirePrivilege(PRIVILEGES.EVENT_VIEW), listTeamRegistrations)
router.post('/teams', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), registerTeam)
router.delete('/teams/:registrationId', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), unregisterTeam)

// Team Players (players in a specific team)
router.get('/teams/:teamId/players', requirePrivilege(PRIVILEGES.EVENT_VIEW), getTeamPlayers)

// Schedule Generation
router.post('/generate-schedule', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), generateTournamentSchedule)

// Player Portal Codes
router.get('/player-codes', requirePrivilege(PRIVILEGES.EVENT_VIEW), listPlayerCodes)
router.post('/player-codes', requirePrivilege(PRIVILEGES.EVENT_EDIT_QUOTED), generatePlayerCodes)

// Team+player stats aggregated from I-Flag games
router.get('/team-player-stats', requirePrivilege(PRIVILEGES.EVENT_VIEW), getEventTeamStats)

export default router
