import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary } from '../lib/cloudinary'
import { stripe } from '../lib/stripe'
import { env } from '../config/env'
import * as orderService from '../services/order.service'

// ── Helper: get tenant system user ──────────────────────────────────────────
async function getSystemUser(tenantId: string) {
  const user = await prisma.user.findFirst({ where: { tenantId, role: 'ADMIN', isActive: true } })
  if (!user) throw new AppError(500, 'NO_SYSTEM_USER', 'Error de configuración del sistema')
  return user
}

// ── Helper: verify portal user owns the order ────────────────────────────────
async function resolvePortalOrder(portalUserId: string, tenantId: string, orderId: string) {
  const portalUser = await prisma.portalUser.findUnique({
    where: { id: portalUserId },
    include: { client: { select: { id: true } } },
  })
  if (!portalUser?.client) throw new AppError(403, 'FORBIDDEN', 'Sin acceso')

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, clientId: portalUser.client.id },
  })
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')
  return order
}

// ── POST /portal/orders/:orderId/stripe-checkout ─────────────────────────────
export async function createStripeCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Pago en línea no disponible')

    const { portalUserId, tenantId } = req.portalUser!
    const order = await resolvePortalOrder(portalUserId, tenantId, req.params.orderId)

    if (order.status !== 'CONFIRMED') {
      throw new AppError(400, 'INVALID_STATUS', 'La orden no está disponible para pago')
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'mxn',
      line_items: [{
        price_data: {
          currency: 'mxn',
          unit_amount: Math.round(Number(order.total) * 100),
          product_data: { name: `Orden ${order.orderNumber}` },
        },
        quantity: 1,
      }],
      success_url: `${env.STRIPE_SUCCESS_URL}/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.STRIPE_CANCEL_URL}/${order.id}`,
      metadata: { orderId: order.id, tenantId },
    })

    res.json({ success: true, data: { url: session.url } })
  } catch (err) {
    next(err)
  }
}

// ── POST /portal/orders/:orderId/verify-stripe-payment ───────────────────────
// Called by the portal immediately after Stripe redirects the user back.
// Retrieves the session from Stripe and confirms payment without relying on webhooks.
export async function verifyStripePayment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Pago en línea no disponible')

    const { portalUserId, tenantId } = req.portalUser!
    const { sessionId } = z.object({ sessionId: z.string().min(1) }).parse(req.body)

    const order = await resolvePortalOrder(portalUserId, tenantId, req.params.orderId)

    // Already paid — idempotent
    if (order.paymentStatus === 'PAID') return res.json({ success: true, data: { paymentStatus: 'PAID' } })

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return res.json({ success: true, data: { paymentStatus: order.paymentStatus } })
    }

    // Verify this session belongs to this order
    if (session.metadata?.orderId !== order.id) {
      throw new AppError(400, 'SESSION_MISMATCH', 'Sesión de pago no corresponde a esta orden')
    }

    const systemUser = await getSystemUser(tenantId)
    const Decimal = (await import('decimal.js')).default
    const newPaidAmount = new Decimal(Number(order.paidAmount)).add(new Decimal(Number(order.total)))
    const newPaymentStatus = newPaidAmount.gte(order.total) ? 'PAID' : 'IN_PAYMENT'

    await prisma.$transaction([
      prisma.orderPayment.create({
        data: {
          orderId: order.id,
          method: 'CREDIT_CARD',
          amount: order.total,
          paymentDate: new Date(),
          reference: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
          notes: 'Pago en línea confirmado vía Stripe',
          recordedById: systemUser.id,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: newPaymentStatus, paidAmount: newPaidAmount, updatedAt: new Date() },
      }),
    ])

    res.json({ success: true, data: { paymentStatus: newPaymentStatus } })
  } catch (err) {
    next(err)
  }
}

// ── POST /portal/orders/:orderId/payment-voucher (multipart) ─────────────────
export async function uploadPaymentVoucher(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const order = await resolvePortalOrder(portalUserId, tenantId, req.params.orderId)

    if (order.status !== 'CONFIRMED') {
      throw new AppError(400, 'INVALID_STATUS', 'La orden no está disponible para pago')
    }
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió ningún archivo')

    const { method, reference, notes } = z.object({
      method: z.enum(['TRANSFER', 'CHECK', 'CASH']),
      reference: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body)

    const systemUser = await getSystemUser(tenantId)
    const { url } = await uploadToCloudinary(req.file.buffer, 'iventia/payment-vouchers', 'auto')

    await prisma.$transaction([
      prisma.orderDocument.create({
        data: {
          orderId: order.id,
          documentType: 'COMPROBANTE_PAGO',
          fileName: req.file.originalname,
          blobKey: url,
          uploadedById: systemUser.id,
        },
      }),
      prisma.orderPayment.create({
        data: {
          orderId: order.id,
          method: method as any,
          amount: order.total,
          paymentDate: new Date(),
          reference: reference ?? null,
          notes: notes ?? 'Comprobante enviado desde Portal de Expositores',
          recordedById: systemUser.id,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'IN_REVIEW', paidAmount: order.total, updatedAt: new Date() },
      }),
    ])

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ── POST /payments/stripe/webhook ─────────────────────────────────────────────
export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' })

    const sig = req.headers['stripe-signature'] as string
    let event: any

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET ?? '')
    } catch {
      return res.status(400).json({ error: 'Invalid signature' })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { orderId, tenantId } = session.metadata ?? {}

      console.log('[Stripe Webhook] checkout.session.completed received', {
        sessionId: session.id,
        orderId,
        tenantId,
        metadata: session.metadata,
      })

      if (!orderId || !tenantId) {
        console.log('[Stripe Webhook] Missing orderId or tenantId in metadata')
        return res.json({ received: true })
      }

      const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } })
      if (!order) {
        console.log('[Stripe Webhook] Order not found', { orderId, tenantId })
        return res.json({ received: true })
      }
      if (order.paymentStatus === 'PAID') {
        console.log('[Stripe Webhook] Order already paid', { orderId })
        return res.json({ received: true })
      }

      const systemUser = await getSystemUser(tenantId)
      const Decimal = (await import('decimal.js')).default
      const newPaidAmount = new Decimal(Number(order.paidAmount)).add(new Decimal(Number(order.total)))
      const newPaymentStatus = newPaidAmount.gte(order.total) ? 'PAID' : 'IN_PAYMENT'

      console.log('[Stripe Webhook] Processing payment for order', { orderId, total: order.total })

      try {
        await prisma.$transaction([
          prisma.orderPayment.create({
            data: {
              orderId,
              method: 'CREDIT_CARD',
              amount: order.total,
              paymentDate: new Date(),
              reference: session.payment_intent ?? session.id,
              notes: 'Pago completado vía Stripe',
              recordedById: systemUser.id,
            },
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: newPaymentStatus, paidAmount: newPaidAmount, updatedAt: new Date() },
          }),
        ])
        console.log('[Stripe Webhook] Payment processed successfully for order', { orderId })
      } catch (txErr) {
        console.error('[Stripe Webhook] Error processing payment transaction', { orderId, error: txErr })
        throw txErr
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Stripe Webhook] Error:', err)
    // Return 200 to prevent Stripe from retrying, but log the error
    res.json({ received: true, error: true })
  }
}
