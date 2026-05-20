import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { getDashboard, chat, generateEventConcept, generateBudget, analyzeImage } from '../controllers/ai.controller'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboard)
router.post('/chat', chat)
router.post('/event-concept', generateEventConcept)
router.post('/budget-estimate', generateBudget)
router.post('/analyze-image', analyzeImage)

export default router
