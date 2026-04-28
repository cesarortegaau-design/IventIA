import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDashboard, chat } from '../controllers/ai.controller'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboard)
router.post('/chat', chat)

export default router
