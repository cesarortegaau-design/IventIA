import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDashboard, chat, generateEventConcept, generateBudget } from '../controllers/ai.controller'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboard)
router.post('/chat', chat)
router.post('/event-concept', generateEventConcept)
router.post('/budget-estimate', generateBudget)

export default router
