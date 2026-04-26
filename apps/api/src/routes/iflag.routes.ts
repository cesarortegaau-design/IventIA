import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import {
  listGames, getGame, createGame, updateGame,
  startTimer, stopTimer, resetTimer,
  getAttendance, upsertAttendance,
  recordGameEvent, listGameEvents,
  getTeamPlayers,
} from '../controllers/iflag.controller'

const router = Router()

router.use(authenticate)

// Games
router.get('/games', listGames)
router.post('/games', createGame)
router.get('/games/:gameId', getGame)
router.patch('/games/:gameId', updateGame)

// Timer
router.post('/games/:gameId/timer/start', startTimer)
router.post('/games/:gameId/timer/stop', stopTimer)
router.post('/games/:gameId/timer/reset', resetTimer)

// Attendance
router.get('/games/:gameId/attendance', getAttendance)
router.patch('/games/:gameId/attendance', upsertAttendance)

// Game events (scoring / penalties)
router.get('/games/:gameId/events', listGameEvents)
router.post('/games/:gameId/events', recordGameEvent)

// Team roster helper
router.get('/teams/:teamId/players', getTeamPlayers)

export default router
