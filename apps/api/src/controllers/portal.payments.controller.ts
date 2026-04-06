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

    if (!['QUOTED', 'CONFIRMED'].includes(order.status)) {
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
      success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${env.STRIPE_CANCEL_URL}?order_id=${order.id}`,
      metadata: { orderId: order.id, tenantId },
    })

    res.json({ success: true, data: { url: session.url } })
  } catch (err) {
    next(err)
  }
}

// ── POST /portal/orders/:orderId/payment-voucher (multipart) ─────────────────
export async function uploadPaymentVoucher(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const order = await resolvePortalOrder(portalUserId, tenantId, req.params.orderId)

    if (!['QUOTED', 'CONFIRMED'].includes(order.status)) {
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
        data: { status: 'IN_PAYMENT', updatedAt: new Date() },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status as any,
          toStatus: 'IN_PAYMENT',
          changedById: systemUser.id,
          notes: `Comprobante de pago recibido por portal (${method}${reference ? ` ref: ${reference}` : ''})`,
        },
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
      if (!orderId || !tenantId) return res.json({ received: true })

      const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } })
      if (!order || order.status === 'PAID') return res.json({ received: true })

      const systemUser = await getSystemUser(tenantId)

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
          data: { status: 'PAID', paidAmount: order.total, updatedAt: new Date() },
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: order.status as any,
            toStatus: 'PAID',
            changedById: systemUser.id,
            notes: `Pago en línea confirmado por Stripe (session: ${session.id})`,
          },
        }),
      ])
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
}
