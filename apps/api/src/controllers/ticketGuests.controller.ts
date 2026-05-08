import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { emailService } from '../services/email.service'
import { env } from '../config/env'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function uniqueCode(): Promise<string> {
  let code = generateCode()
  while (await prisma.ticketAccessCode.findUnique({ where: { code } })) {
    code = generateCode()
  }
  return code
}

const guestRowSchema = z.object({
  nombre: z.string().min(1),
  apellido_paterno: z.string().min(1),
  apellido_materno: z.string().optional().default(''),
  email: z.string().email(),
  telefono: z.string().optional().default(''),
  numero_de_boletos: z.coerce.number().int().min(1).max(100).default(1),
})

export async function importGuests(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const rows = z.array(guestRowSchema).min(1).max(500).parse(req.body.guests ?? req.body)

    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId },
      include: { event: { select: { name: true } } },
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const created: any[] = []
    for (const row of rows) {
      const code = await uniqueCode()

      const accessCode = await prisma.ticketAccessCode.create({
        data: {
          tenantId,
          ticketEventId: ticketEvent.id,
          code,
          maxUses: row.numero_de_boletos,
          createdById: userId,
        },
      })

      const guest = await prisma.ticketGuest.create({
        data: {
          tenantId,
          ticketEventId: ticketEvent.id,
          firstName: row.nombre,
          paternalLastName: row.apellido_paterno,
          maternalLastName: row.apellido_materno || null,
          email: row.email,
          phone: row.telefono || null,
          ticketCount: row.numero_de_boletos,
          ticketAccessCodeId: accessCode.id,
          createdById: userId,
        },
        include: { ticketAccessCode: { select: { code: true } } },
      })
      created.push(guest)
    }

    res.status(201).json({ success: true, data: created, meta: { created: created.length } })
  } catch (err) {
    next(err)
  }
}

export async function listGuests(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId },
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const guests = await prisma.ticketGuest.findMany({
      where: { ticketEventId: ticketEvent.id, tenantId },
      include: { ticketAccessCode: { select: { code: true, usedCount: true, maxUses: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ success: true, data: guests })
  } catch (err) {
    next(err)
  }
}

export async function exportGuests(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId },
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const guests = await prisma.ticketGuest.findMany({
      where: { ticketEventId: ticketEvent.id, tenantId },
      include: { ticketAccessCode: { select: { code: true, usedCount: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const header = 'nombre,apellido_paterno,apellido_materno,email,telefono,numero_de_boletos,codigo,usos'
    const lines = guests.map(g => [
      g.firstName,
      g.paternalLastName,
      g.maternalLastName ?? '',
      g.email,
      g.phone ?? '',
      g.ticketCount,
      g.ticketAccessCode.code,
      g.ticketAccessCode.usedCount,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [header, ...lines].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="invitados.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
}

export async function sendGuestInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, guestId } = req.params
    const tenantId = req.user!.tenantId

    const schema = z.object({
      sendEmail: z.boolean().default(true),
      sendWhatsapp: z.boolean().default(false),
    })
    const { sendEmail, sendWhatsapp } = schema.parse(req.body)

    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId },
      include: {
        event: {
          select: {
            name: true,
            eventStart: true,
            venueLocation: true,
          },
        },
      },
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const guest = await prisma.ticketGuest.findFirst({
      where: { id: guestId, ticketEventId: ticketEvent.id, tenantId },
      include: { ticketAccessCode: { select: { code: true } } },
    })
    if (!guest) throw new AppError(404, 'GUEST_NOT_FOUND', 'Invitado no encontrado')

    const now = new Date()
    const updates: any = {}

    if (sendEmail) {
      await emailService.sendGuestInvitation({
        to: guest.email,
        guestName: `${guest.firstName} ${guest.paternalLastName}`,
        eventName: ticketEvent.event.name,
        eventDate: ticketEvent.event.eventStart?.toISOString() ?? '',
        venue: ticketEvent.event.venueLocation ?? undefined,
        description: ticketEvent.description ?? undefined,
        imageUrl: ticketEvent.imageUrl ?? undefined,
        slug: ticketEvent.slug,
        code: guest.ticketAccessCode.code,
        ticketsAppUrl: env.TICKETS_APP_URL,
      })
      updates.emailSentAt = now
    }

    if (sendWhatsapp && guest.phone) {
      const { sendGuestInvitationWhatsApp } = await import('../services/whatsapp.service')
      await sendGuestInvitationWhatsApp({
        to: guest.phone,
        guestName: `${guest.firstName} ${guest.paternalLastName}`,
        eventName: ticketEvent.event.name,
        slug: ticketEvent.slug,
        code: guest.ticketAccessCode.code,
        ticketsAppUrl: env.TICKETS_APP_URL,
      })
      updates.whatsappSentAt = now
    }

    const updated = await prisma.ticketGuest.update({
      where: { id: guestId },
      data: updates,
      include: { ticketAccessCode: { select: { code: true } } },
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function sendAllGuestInvitations(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const schema = z.object({
      sendEmail: z.boolean().default(true),
      sendWhatsapp: z.boolean().default(false),
    })
    const { sendEmail, sendWhatsapp } = schema.parse(req.body)

    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId },
      include: {
        event: { select: { name: true, eventStart: true, venueLocation: true } },
      },
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const guests = await prisma.ticketGuest.findMany({
      where: { ticketEventId: ticketEvent.id, tenantId },
      include: { ticketAccessCode: { select: { code: true } } },
    })

    let emailCount = 0
    let whatsappCount = 0
    const now = new Date()

    const { sendGuestInvitationWhatsApp } = sendWhatsapp
      ? await import('../services/whatsapp.service')
      : { sendGuestInvitationWhatsApp: null }

    for (const guest of guests) {
      try {
        const updates: any = {}

        if (sendEmail) {
          await emailService.sendGuestInvitation({
            to: guest.email,
            guestName: `${guest.firstName} ${guest.paternalLastName}`,
            eventName: ticketEvent.event.name,
            eventDate: ticketEvent.event.eventStart?.toISOString() ?? '',
            venue: ticketEvent.event.venueLocation ?? undefined,
            description: ticketEvent.description ?? undefined,
            imageUrl: ticketEvent.imageUrl ?? undefined,
            slug: ticketEvent.slug,
            code: guest.ticketAccessCode.code,
            ticketsAppUrl: env.TICKETS_APP_URL,
          })
          updates.emailSentAt = now
          emailCount++
        }

        if (sendWhatsapp && guest.phone && sendGuestInvitationWhatsApp) {
          await sendGuestInvitationWhatsApp({
            to: guest.phone,
            guestName: `${guest.firstName} ${guest.paternalLastName}`,
            eventName: ticketEvent.event.name,
            slug: ticketEvent.slug,
            code: guest.ticketAccessCode.code,
            ticketsAppUrl: env.TICKETS_APP_URL,
          })
          updates.whatsappSentAt = now
          whatsappCount++
        }

        if (Object.keys(updates).length) {
          await prisma.ticketGuest.update({ where: { id: guest.id }, data: updates })
        }
      } catch (e) {
        console.error(`Failed to send invitation to guest ${guest.id}:`, e)
      }
    }

    res.json({ success: true, meta: { emailCount, whatsappCount, total: guests.length } })
  } catch (err) {
    next(err)
  }
}

export async function deleteGuest(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, guestId } = req.params
    const tenantId = req.user!.tenantId

    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId },
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const guest = await prisma.ticketGuest.findFirst({
      where: { id: guestId, ticketEventId: ticketEvent.id, tenantId },
    })
    if (!guest) throw new AppError(404, 'GUEST_NOT_FOUND', 'Invitado no encontrado')

    // Cascade deletes the TicketAccessCode too
    await prisma.ticketGuest.delete({ where: { id: guestId } })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
