import { Router } from 'express'
import express from 'express'
import {
  listPublicTicketEvents,
  getPublicTicketEvent,
  createPublicOrder,
  stripeWebhook,
  getPublicOrder,
  downloadTicketPdf,
} from '../controllers/tickets.public.controller'

const router = Router()

// Stripe webhook necesita raw body — debe ir ANTES de cualquier JSON parser
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook)

router.get('/events', listPublicTicketEvents)
router.get('/events/:slug', getPublicTicketEvent)
router.post('/orders', createPublicOrder)
router.get('/orders/:token', getPublicOrder)
router.get('/orders/:token/pdf', downloadTicketPdf)

export default router
