import { Router, Request, Response } from 'express'
import express from 'express'
import {
  listPublicTicketEvents,
  getPublicTicketEvent,
  createPublicOrder,
  stripeWebhook,
  getPublicOrder,
  downloadTicketPdf,
} from '../controllers/tickets.public.controller'
import { env } from '../config/env'

const router = Router()

// Stripe webhook necesita raw body — debe ir ANTES de cualquier JSON parser
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook)

router.get('/events', listPublicTicketEvents)
router.get('/events/:slug', getPublicTicketEvent)
router.post('/orders', createPublicOrder)
router.get('/orders/:token', getPublicOrder)
router.get('/orders/:token/pdf', downloadTicketPdf)

// ── Diagnostic endpoint — DELETE after debugging ──────────────────────────
router.get('/debug/health', async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      SENDGRID_API_KEY: env.SENDGRID_API_KEY ? '✅ set' : '❌ missing',
      EMAIL_FROM: env.EMAIL_FROM || '❌ missing',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '✅ set' : '❌ missing',
      TICKETS_APP_URL: env.TICKETS_APP_URL,
      API_BASE_URL: env.API_BASE_URL || '❌ missing',
      META_WA_ACCESS_TOKEN: env.META_WA_ACCESS_TOKEN ? '✅ set' : '❌ missing',
      META_WA_PHONE_NUMBER_ID: env.META_WA_PHONE_NUMBER_ID || '❌ missing',
    },
  }

  // Check pdfkit import
  try {
    const { generateTicketPdf } = await import('../services/ticket-pdf.service')
    checks.pdfkit = '✅ loaded'
  } catch (err: any) {
    checks.pdfkit = `❌ ${err.message}`
  }

  // Check email service
  try {
    const { emailService } = await import('../services/email.service')
    checks.emailService = emailService ? '✅ loaded' : '❌ null'
  } catch (err: any) {
    checks.emailService = `❌ ${err.message}`
  }

  // Check whatsapp service
  try {
    const wa = await import('../services/whatsapp.service')
    checks.whatsapp = wa.isWhatsAppConfigured() ? '✅ configured' : '⚠️ loaded but not configured'
  } catch (err: any) {
    checks.whatsapp = `❌ ${err.message}`
  }

  // Check DB
  try {
    const { prisma } = await import('../config/database')
    const count = await prisma.ticketOrder.count()
    checks.database = `✅ connected (${count} orders)`
  } catch (err: any) {
    checks.database = `❌ ${err.message}`
  }

  // Check last paid orders
  try {
    const { prisma } = await import('../config/database')
    const recent = await prisma.ticketOrder.findMany({
      where: { status: 'PAID' },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { token: true, buyerEmail: true, buyerPhone: true, status: true, updatedAt: true, total: true },
    })
    checks.recentPaidOrders = recent.map(o => ({
      token: o.token.slice(0, 8) + '...',
      email: o.buyerEmail,
      phone: o.buyerPhone || 'none',
      total: Number(o.total),
      paidAt: o.updatedAt,
    }))
  } catch (err: any) {
    checks.recentPaidOrders = `❌ ${err.message}`
  }

  res.json(checks)
})

export default router
