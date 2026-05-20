import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

// POST /api/v1/events/:id/planner-portal/publish
// Admin JWT required (via authenticate middleware on events.routes)
export async function publishPlannerPortal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const { tenantId, userId } = req.user!
    const { data } = req.body

    if (!data || typeof data !== 'object') {
      throw new AppError(400, 'VALIDATION_ERROR', 'data is required and must be an object')
    }

    // Validate the event belongs to this tenant
    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const snapshot = await prisma.plannerPortalSnapshot.upsert({
      where: { eventId },
      create: {
        eventId,
        tenantId,
        data,
        publishedById: userId,
      },
      update: {
        data,
        publishedById: userId,
      },
    })

    res.json({ success: true, data: snapshot })
  } catch (err) {
    next(err)
  }
}

// GET /api/v1/portal/planner-snapshot/:eventId
// Portal JWT required (via authenticatePortal middleware on portal.routes)
export async function getPortalSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.portalUser!
    const { eventId } = req.params

    // Verify the portal user has access to this event
    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    const snapshot = await prisma.plannerPortalSnapshot.findUnique({
      where: { eventId },
    })
    if (!snapshot) throw new AppError(404, 'NOT_FOUND', 'No hay contenido publicado para este evento')

    res.json({ success: true, data: snapshot.data })
  } catch (err) {
    next(err)
  }
}
