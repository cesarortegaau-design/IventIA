import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { authenticatePortal } from '../middleware/portalAuth.middleware'
import {
  listGames, getGame, createGame, updateGame,
  startTimer, stopTimer, resetTimer, setTimer,
  getAttendance, upsertAttendance,
  recordGameEvent, listGameEvents,
  getTeamPlayers,
  publicGetGame, publicListGames,
  listScheduleGames,
} from '../controllers/iflag.controller'
import {
  publicListTournaments, publicGetTournament, publicGetCalendar,
  playerVerifyCode, playerSignup, playerLogin, playerRefresh,
  playerMe, playerUpdateMe, playerStats,
  playerPayTournament, playerVerifyPayment,
} from '../controllers/iflag.player.controller'

const router = Router()

// ── Public (no auth) ──────────────────────────────────────────────────────────
router.get('/public/games', publicListGames)
router.get('/public/games/:gameId', publicGetGame)
router.get('/public/tournaments', publicListTournaments)
router.get('/public/tournaments/:eventId', publicGetTournament)
router.get('/public/tournaments/:eventId/calendar', publicGetCalendar)

// ── Player auth (no auth required) ───────────────────────────────────────────
router.post('/player/verify-code', playerVerifyCode)
router.post('/player/signup', playerSignup)
router.post('/player/login', playerLogin)
router.post('/player/refresh', playerRefresh)

// ── Player protected (portal JWT) ────────────────────────────────────────────
router.get('/player/me', authenticatePortal, playerMe)
router.patch('/player/me', authenticatePortal, playerUpdateMe)
router.get('/player/stats', authenticatePortal, playerStats)
router.post('/player/tournaments/:eventId/pay', authenticatePortal, playerPayTournament)
router.post('/player/tournaments/:eventId/verify-payment', authenticatePortal, playerVerifyPayment)

// ── Referee (admin JWT) ───────────────────────────────────────────────────────
router.use(authenticate)

router.get('/schedule', listScheduleGames)

router.get('/games', listGames)
router.post('/games', createGame)
router.get('/games/:gameId', getGame)
router.patch('/games/:gameId', updateGame)

router.post('/games/:gameId/timer/start', startTimer)
router.post('/games/:gameId/timer/stop', stopTimer)
router.post('/games/:gameId/timer/reset', resetTimer)
router.post('/games/:gameId/timer/set', setTimer)

router.get('/games/:gameId/attendance', getAttendance)
router.patch('/games/:gameId/attendance', upsertAttendance)

router.get('/games/:gameId/events', listGameEvents)
router.post('/games/:gameId/events', recordGameEvent)

router.get('/teams/:teamId/players', getTeamPlayers)

export default router
