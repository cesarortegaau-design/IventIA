import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

/**
 * GET /api/v1/public/invitacion/:eventId
 * Returns public invitation design + event basics.
 * No authentication required.
 */
export async function getPublicInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const { guestId } = req.query as { guestId?: string }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, eventStart: true, venueLocation: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const [disenoStore, invitadosStore] = await Promise.all([
      prisma.plannerStore.findUnique({
        where: { eventId_storeKey: { eventId, storeKey: 'invitacion-diseno' } },
      }),
      guestId
        ? prisma.plannerStore.findUnique({
            where: { eventId_storeKey: { eventId, storeKey: 'invitacion-invitados' } },
          })
        : Promise.resolve(null),
    ])

    const diseno: any = (disenoStore?.data as any) ?? {}
    let guest: any = null

    if (guestId && invitadosStore) {
      const invitadosData: any = invitadosStore.data ?? {}
      const all: any[] = invitadosData.invitados ?? []
      guest = all.find((g: any) => g.id === guestId) ?? null
    }

    res.json({
      event: {
        id: event.id,
        name: event.name,
        eventStart: event.eventStart,
        venueLocation: event.venueLocation,
      },
      diseno: {
        titulo:            diseno.titulo            ?? '',
        subtitulo:         diseno.subtitulo         ?? '',
        fechaTexto:        diseno.fechaTexto        ?? '',
        horaTexto:         diseno.horaTexto         ?? '',
        lugarTexto:        diseno.lugarTexto        ?? '',
        lugarDireccion:    diseno.lugarDireccion    ?? '',
        dresscode:         diseno.dresscode         ?? '',
        notasAdicionales:  diseno.notasAdicionales  ?? '',
        imagenUrl:         diseno.imagenUrl         ?? '',
        incluirMapa:       diseno.incluirMapa       ?? false,
        modo:              diseno.modo              ?? 'rsvp',
      },
      guest,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/v1/public/invitacion/:eventId/rsvp/:guestId
 * Body: { respuesta: 'confirmado' | 'declinado' }
 * Updates guest RSVP in the PlannerStore.
 * No authentication required.
 */
export async function confirmRsvp(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, guestId } = req.params
    const { respuesta } = req.body as { respuesta: 'confirmado' | 'declinado' }

    if (!respuesta || !['confirmado', 'declinado'].includes(respuesta)) {
      throw new AppError(400, 'BAD_REQUEST', 'respuesta debe ser "confirmado" o "declinado"')
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const invitadosStore = await prisma.plannerStore.findUnique({
      where: { eventId_storeKey: { eventId, storeKey: 'invitacion-invitados' } },
    })

    if (!invitadosStore) throw new AppError(404, 'NOT_FOUND', 'Lista de invitados no encontrada')

    const data: any = invitadosStore.data ?? {}
    const invitados: any[] = data.invitados ?? []

    const guestIndex = invitados.findIndex((g: any) => g.id === guestId)
    if (guestIndex === -1) throw new AppError(404, 'NOT_FOUND', 'Invitado no encontrado')

    const guest = invitados[guestIndex]

    // Update RSVP status
    invitados[guestIndex] = {
      ...guest,
      rsvp: respuesta,
      fechaRsvp: new Date().toISOString(),
      boletosEnviados: respuesta === 'confirmado' ? true : guest.boletosEnviados,
    }

    await prisma.plannerStore.update({
      where: { eventId_storeKey: { eventId, storeKey: 'invitacion-invitados' } },
      data: { data: { ...data, invitados, updatedAt: new Date().toISOString() } },
    })

    res.json({
      success: true,
      respuesta,
      guest: {
        id: guest.id,
        nombre: guest.nombre,
        numPersonas: guest.numPersonas,
        rsvp: respuesta,
      },
    })
  } catch (err) {
    next(err)
  }
}
