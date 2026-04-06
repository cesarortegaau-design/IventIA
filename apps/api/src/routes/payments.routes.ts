import { Router } from 'express'
import { stripeWebhook } from '../controllers/portal.payments.controller'

const router = Router()

// Raw body required for Stripe signature verification — registered before express.json() in index.ts
router.post('/stripe/webhook', stripeWebhook)

export default router
