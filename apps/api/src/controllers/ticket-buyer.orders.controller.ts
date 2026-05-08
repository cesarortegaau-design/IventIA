import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { env } from '../config/env'
import dayjs from 'dayjs'

// GET /public/tickets/my/orders
export async function ticketBuyerListOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId, tenantId } = req.ticketBuyerUser!
    const orders = await prisma.ticketOrder.findMany({
      where: { ticketBuyerUserId, tenantId },
      include: {
        ticketEvent: {
          include: { event: { select: { name: true, eventStart: true, venueLocation: true } } },
        },
        items: { include: { section: true, seat: true, attendee: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: orders })
  } catch (err) { next(err) }
}

// GET /public/tickets/my/orders/:token
export async function ticketBuyerGetOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId } = req.ticketBuyerUser!
    const { token } = req.params

    const order = await prisma.ticketOrder.findUnique({
      where: { token },
      include: {
        ticketEvent: {
          include: { event: { select: { name: true, eventStart: true, venueLocation: true } } },
        },
        items: { include: { section: true, seat: true, attendee: true } },
      },
    })
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')
    if (order.ticketBuyerUserId !== ticketBuyerUserId) throw new AppError(403, 'FORBIDDEN', 'Sin acceso a esta orden')

    res.json({ success: true, data: order })
  } catch (err) { next(err) }
}

// GET /public/tickets/my/orders/:token/pdf
export async function ticketBuyerDownloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId } = req.ticketBuyerUser!
    const { token } = req.params

    const order = await prisma.ticketOrder.findUnique({
      where: { token },
      include: {
        ticketEvent: { include: { event: true } },
        items: { include: { section: true, seat: true } },
      },
    })
    if (!order || order.status !== 'PAID') throw new AppError(404, 'NOT_FOUND', 'Boleto no encontrado o no pagado')
    if (order.ticketBuyerUserId !== ticketBuyerUserId) throw new AppError(403, 'FORBIDDEN', 'Sin acceso a esta orden')

    const { generateTicketPdf } = await import('../services/ticket-pdf.service')
    const pdfBuffer = await generateTicketPdf({
      orderToken: order.token,
      buyerName: order.buyerName,
      eventName: order.ticketEvent?.event?.name ?? 'Evento',
      eventDate: order.ticketEvent?.event?.eventStart
        ? dayjs(order.ticketEvent.event.eventStart).format('DD MMM YYYY, HH:mm')
        : '',
      venue: order.ticketEvent?.event?.venueLocation ?? undefined,
      eventImageUrl: order.ticketEvent?.imageUrl ?? undefined,
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

// GET /public/tickets/my/orders/:token/attendees/:attendeeId/pdf
export async function ticketBuyerDownloadAttendeePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId } = req.ticketBuyerUser!
    const { token, attendeeId } = req.params

    const order = await prisma.ticketOrder.findUnique({
      where: { token },
      include: {
        ticketEvent: { include: { event: true } },
        items: { include: { section: true, seat: true, attendee: true } },
      },
    })
    if (!order || order.status !== 'PAID') throw new AppError(404, 'NOT_FOUND', 'Boleto no encontrado o no pagado')
    if (order.ticketBuyerUserId !== ticketBuyerUserId) throw new AppError(403, 'FORBIDDEN', 'Sin acceso a esta orden')

    // Find the item with the matching attendee
    const item = order.items.find(i => i.attendee?.id === attendeeId)
    if (!item || !item.attendee) throw new AppError(404, 'NOT_FOUND', 'Asistente no encontrado')

    const { generateAttendeePdf } = await import('../services/ticket-pdf.service')
    const pdfBuffer = await generateAttendeePdf({
      orderToken: order.token,
      attendeeId: item.attendee.id,
      attendeeName: `${item.attendee.firstName} ${item.attendee.paternalLastName} ${item.attendee.maternalLastName || ''}`.trim(),
      sectionName: item.section?.name ?? '',
      eventName: order.ticketEvent?.event?.name ?? 'Evento',
      eventDate: order.ticketEvent?.event?.eventStart
        ? dayjs(order.ticketEvent.event.eventStart).format('DD MMM YYYY, HH:mm')
        : '',
      venue: order.ticketEvent?.event?.venueLocation ?? undefined,
      eventImageUrl: order.ticketEvent?.imageUrl ?? undefined,
      ticketsAppUrl: env.TICKETS_APP_URL,
    })

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="boleto-${item.attendee.firstName.toLowerCase()}-${token.slice(0, 8)}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    })
    res.send(pdfBuffer)
  } catch (err) { next(err) }
}
