import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { emailService } from '../services/email.service'
import { env } from '../config/env'

/**
 * POST /events/:id/planner-invitaciones/send-emails
 * Sends planner invitation emails to selected guests.
 * Body: { guestIds?: string[] }  — omit or empty array = send to all with email
 */
export async function sendInvitationEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const { tenantId } = req.user!
    const { guestIds } = req.body as { guestIds?: string[] }

    // Verify event belongs to tenant
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, name: true, eventStart: true, venueLocation: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    // Load planner stores
    const [disenoStore, invitadosStore] = await Promise.all([
      prisma.plannerStore.findUnique({ where: { eventId_storeKey: { eventId, storeKey: 'invitacion-diseno' } } }),
      prisma.plannerStore.findUnique({ where: { eventId_storeKey: { eventId, storeKey: 'invitacion-invitados' } } }),
    ])

    const diseno: any = (disenoStore?.data as any) ?? {}
    const invitadosData: any = (invitadosStore?.data as any) ?? {}
    const allGuests: any[] = invitadosData.invitados ?? []

    // Filter guests: only those with email, optionally filtered by guestIds
    const targets = allGuests.filter(g => {
      if (!g.email) return false
      if (guestIds && guestIds.length > 0) return guestIds.includes(g.id)
      return true
    })

    if (targets.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, results: [], message: 'No hay invitados con email para enviar' })
    }

    const plannerBaseUrl = env.PLANNER_URL ?? 'https://ivent-ia-planner.vercel.app'
    const modo: 'rsvp' | 'boleto' = diseno.modo === 'boleto' ? 'boleto' : 'rsvp'

    const results: { guestId: string; success: boolean; error?: string }[] = []

    for (const guest of targets) {
      const invitationLink = modo === 'rsvp'
        ? `${plannerBaseUrl}/rsvp/${eventId}/${guest.id}`
        : `${plannerBaseUrl}/ticket/${eventId}/${guest.id}`

      try {
        await emailService.sendPlannerInvitation({
          to: guest.email,
          guestName: guest.nombre,
          numPersonas: guest.numPersonas ?? 1,
          eventName: event.name,
          eventDate: event.eventStart?.toISOString(),
          titulo: diseno.titulo || event.name,
          subtitulo: diseno.subtitulo,
          lugarTexto: diseno.lugarTexto || event.venueLocation,
          dresscode: diseno.dresscode,
          imagenUrl: diseno.imagenUrl,
          notasAdicionales: diseno.notasAdicionales,
          modo,
          invitationLink,
        })
        results.push({ guestId: guest.id, success: true })
      } catch (err: any) {
        results.push({ guestId: guest.id, success: false, error: err?.message ?? 'Error desconocido' })
      }
    }

    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    res.json({ success: true, sent, failed, results })
  } catch (err) {
    next(err)
  }
}
