import { Router } from 'express'
import { login, refresh, me } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.get('/me', authenticate, me)

export default router
