import { Request, Response, NextFunction } from 'express'
import Stripe from 'stripe'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { emailService } from '../services/email.service'
import { generateTicketPdf } from '../services/ticket-pdf.service'
import { sendTicketWhatsApp } from '../services/whatsapp.service'
import { env } from '../config/env'
import dayjs from 'dayjs'

const RESERVATION_MINUTES = 30

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new AppError(503, 'STRIPE_NOT_CONFIGURED', 'Stripe no configurado')
  return new Stripe(key)
}

// GET /public/tickets/events — lista eventos con venta activa
export async function listPublicTicketEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await prisma.ticketEvent.findMany({
      where: { active: true },
      include: {
        event: true,
        sections: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { event: { eventStart: 'asc' } },
    })
    res.json({ success: true, data: events })
  } catch (err) { next(err) }
}

// GET /public/tickets/events/:slug — detalle de un evento
export async function getPublicTicketEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params
    const te = await prisma.ticketEvent.findUnique({
      where: { slug },
      include: {
        event: true,
        sections: {
          include: {
            seats: {
              orderBy: [{ row: 'asc' }, { number: 'asc' }],
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    if (!te || !te.active) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')
    res.json({ success: true, data: te })
  } catch (err) { next(err) }
}

// POST /public/tickets/orders — crear orden + Stripe Checkout
export async function createPublicOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as any
    const slug: string = body.slug
    const buyerEmail: string = body.buyerEmail ?? body.buyer?.email
    const buyerName: string = body.buyerName ?? body.buyer?.name
    const buyerPhone: string | undefined = body.buyerPhone ?? body.buyer?.phone
    const items: Array<{ sectionId: string; seatId?: string; quantity: number }> = body.items

    if (!slug || !buyerEmail || !buyerName || !items?.length) {
      throw new AppError(400, 'MISSING_FIELDS', 'slug, buyerEmail, buyerName e items son requeridos')
    }

    const te = await prisma.ticketEvent.findUnique({
      where: { slug },
      include: { sections: true },
    })
    if (!te || !te.active) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    // Validate items and compute totals
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let total = 0
    const validatedItems: Array<{ sectionId: string; seatId?: string; quantity: number; unitPrice: number }> = []

    for (const item of items) {
      const section = te.sections.find(s => s.id === item.sectionId)
      if (!section) throw new AppError(400, 'INVALID_SECTION', `Sección ${item.sectionId} no encontrada`)
      const available = section.capacity - section.sold
      if (item.quantity > available) throw new AppError(409, 'INSUFFICIENT_STOCK', `Solo quedan ${available} boletos disponibles en ${section.name}`)

      const unitPrice = Number(section.price)
      const lineTotal = unitPrice * item.quantity
      total += lineTotal

      validatedItems.push({ sectionId: item.sectionId, seatId: item.seatId, quantity: item.quantity, unitPrice })

      lineItems.push({
        price_data: {
          currency: 'mxn',
          product_data: { name: section.name },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: item.quantity,
      })
    }

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000)

    // Create PENDING order
    const order = await prisma.ticketOrder.create({
      data: {
        tenantId: te.tenantId,
        ticketEventId: te.id,
        buyerEmail,
        buyerName,
        buyerPhone,
        status: 'PENDING',
        total,
        expiresAt,
        items: {
          create: validatedItems.map(i => ({
            sectionId: i.sectionId,
            seatId: i.seatId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.unitPrice * i.quantity,
          })),
        },
      },
    })

    // Reserve seats if SEAT mode
    if (te.mode === 'SEAT') {
      const seatIds = validatedItems.filter(i => i.seatId).map(i => i.seatId!)
      if (seatIds.length > 0) {
        await prisma.ticketSeat.updateMany({ where: { id: { in: seatIds } }, data: { status: 'RESERVED' } })
      }
    }

    // Stripe Checkout
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: buyerEmail,
      metadata: { ticketOrderId: order.id },
      success_url: `${process.env.TICKETS_APP_URL ?? 'http://localhost:5175'}/pago/exito?token=${order.token}`,
      cancel_url: `${process.env.TICKETS_APP_URL ?? 'http://localhost:5175'}/pago/cancelado`,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
    })

    // Save stripe session id
    await prisma.ticketOrder.update({ where: { id: order.id }, data: { stripeSessionId: session.id } })

    res.json({ success: true, data: { checkoutUrl: session.url, token: order.token } })
  } catch (err) { next(err) }
}

// POST /public/tickets/webhook — Stripe webhook
export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Webhook secret no configurado')

    const stripe = getStripe()
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch {
      res.status(400).json({ error: 'Invalid signature' })
      return
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const ticketOrderId = session.metadata?.ticketOrderId
      if (!ticketOrderId) { res.json({ received: true }); return }

      const order = await prisma.ticketOrder.findUnique({
        where: { id: ticketOrderId },
        include: {
          items: { include: { section: true, seat: true } },
          ticketEvent: { include: { event: true } },
        },
      })
      if (!order || order.status === 'PAID') { res.json({ received: true }); return }

      await prisma.$transaction(async (tx) => {
        // Mark order as PAID
        await tx.ticketOrder.update({
          where: { id: ticketOrderId },
          data: { status: 'PAID', stripePaymentId: session.payment_intent as string },
        })
        // Increment sold count per section
        for (const item of order.items) {
          await tx.ticketSection.update({
            where: { id: item.sectionId },
            data: { sold: { increment: item.quantity } },
          })
        }
        // Mark seats as SOLD if SEAT mode
        const seatIds = order.items.filter(i => i.seatId).map(i => i.seatId!)
        if (seatIds.length > 0) {
          await tx.ticketSeat.updateMany({ where: { id: { in: seatIds } }, data: { status: 'SOLD' } })
        }
      })

      // Generate ticket PDF and send email + WhatsApp (fire-and-forget)
      ;(async () => {
        try {
          const pdfBuffer = await generateTicketPdf({
            orderToken: order.token,
            buyerName: order.buyerName,
            eventName: order.ticketEvent?.event?.name ?? 'Evento',
            eventDate: order.ticketEvent?.event?.eventStart
              ? dayjs(order.ticketEvent.event.eventStart).format('DD MMM YYYY, HH:mm')
              : '',
            venue: order.ticketEvent?.event?.venueLocation ?? undefined,
            items: order.items.map(i => ({
              section: i.section?.name ?? '',
              seat: i.seat ? `${i.seat.row}${i.seat.number}` : undefined,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
            })),
            total: Number(order.total),
            ticketsAppUrl: env.TICKETS_APP_URL,
          })

          // Send email with PDF attachment
          await emailService.sendTicketConfirmation({
            to: order.buyerEmail,
            buyerName: order.buyerName,
            orderToken: order.token,
            eventName: order.ticketEvent?.event?.name ?? 'Evento',
            eventDate: order.ticketEvent?.event?.eventStart
              ? dayjs(order.ticketEvent.event.eventStart).format('DD MMM YYYY, HH:mm')
              : '',
            venue: order.ticketEvent?.event?.venueLocation ?? undefined,
            items: order.items.map(i => ({
              section: i.section?.name ?? '',
              seat: i.seat ? `${i.seat.row}${i.seat.number}` : undefined,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
            })),
            total: Number(order.total),
            pdfAttachment: pdfBuffer,
          })

          // Send WhatsApp with PDF if phone is available
          if (order.buyerPhone) {
            const pdfUrl = `${env.API_BASE_URL}/api/v1/public/tickets/orders/${order.token}/pdf`
            await sendTicketWhatsApp({
              to: order.buyerPhone,
              buyerName: order.buyerName,
              eventName: order.ticketEvent?.event?.name ?? 'Evento',
              eventDate: order.ticketEvent?.event?.eventStart
                ? dayjs(order.ticketEvent.event.eventStart).format('DD MMM YYYY')
                : '',
              pdfUrl,
            })
          }
        } catch (err) {
          console.error('[ticket-confirmation] error generating PDF or sending notifications:', err)
        }
      })()
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      const ticketOrderId = session.metadata?.ticketOrderId
      if (ticketOrderId) {
        const order = await prisma.ticketOrder.findUnique({ where: { id: ticketOrderId }, include: { items: true } })
        if (order && order.status === 'PENDING') {
          await prisma.ticketOrder.update({ where: { id: ticketOrderId }, data: { status: 'CANCELLED' } })
          // Release reserved seats
          const seatIds = order.items.filter(i => i.seatId).map(i => i.seatId!)
          if (seatIds.length > 0) {
            await prisma.ticketSeat.updateMany({ where: { id: { in: seatIds } }, data: { status: 'AVAILABLE' } })
          }
        }
      }
    }

    res.json({ received: true })
  } catch (err) { next(err) }
}

// GET /public/tickets/orders/:token — consultar orden por token
export async function getPublicOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params
    const order = await prisma.ticketOrder.findUnique({
      where: { token },
      include: {
        ticketEvent: {
          include: { event: { select: { name: true, eventStart: true, venueLocation: true } } },
        },
        items: { include: { section: true, seat: true } },
      },
    })
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')
    res.json({ success: true, data: order })
  } catch (err) { next(err) }
}

// GET /public/tickets/orders/:token/pdf — descargar boleto en PDF
export async function downloadTicketPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params
    const order = await prisma.ticketOrder.findUnique({
      where: { token },
      include: {
        ticketEvent: { include: { event: true } },
        items: { include: { section: true, seat: true } },
      },
    })
    if (!order || order.status !== 'PAID') throw new AppError(404, 'NOT_FOUND', 'Boleto no encontrado o no pagado')

    const { env } = await import('../config/env')
    const pdfBuffer = await generateTicketPdf({
      orderToken: order.token,
      buyerName: order.buyerName,
      eventName: order.ticketEvent?.event?.name ?? 'Evento',
      eventDate: order.ticketEvent?.event?.eventStart
        ? dayjs(order.ticketEvent.event.eventStart).format('DD MMM YYYY, HH:mm')
        : '',
      venue: order.ticketEvent?.event?.venueLocation ?? undefined,
      items: order.items.map(i => ({
        section: i.section?.name ?? '',
        seat: i.seat ? `${i.seat.row}${i.seat.number}` : undefined,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      total: Number(order.total),
      ticketsAppUrl: env.TICKETS_APP_URL,
    })

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="boleto-${token.slice(0, 8)}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    })
    res.send(pdfBuffer)
  } catch (err) { next(err) }
}
