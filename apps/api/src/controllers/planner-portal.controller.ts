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
// Serves LIVE data from PlannerStore + lienzoData so no re-publish needed.
export async function getPortalSnapshot(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.portalUser!
    const { eventId } = req.params

    // Verify the portal user has access to this event
    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    // Fetch event data + lienzo in one query
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, name: true, eventType: true, code: true,
        venueLocation: true, expectedAttendance: true, description: true,
        eventStart: true, lienzoData: true,
        client: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true } },
      },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    // Fetch all planner stores for this event
    const stores = await prisma.plannerStore.findMany({ where: { eventId } })
    const storeMap: Record<string, any> = {}
    for (const s of stores) storeMap[s.storeKey] = s.data

    const lienzoRaw = event.lienzoData as any
    const lienzo = lienzoRaw
      ? { ...(typeof lienzoRaw === 'object' ? lienzoRaw : {}), suppliers: storeMap.suppliers?.suppliers ?? storeMap.suppliers ?? [] }
      : null

    const data = {
      branding: storeMap.branding ?? null,
      tareas: storeMap.tareas ?? null,
      timeline: storeMap.timeline ?? null,
      presupuesto: storeMap.presupuesto ?? null,
      lienzo,
      eventSnapshot: {
        name: event.name,
        eventStart: event.eventStart,
        eventType: event.eventType,
        code: event.code,
        venueLocation: event.venueLocation,
        expectedAttendance: event.expectedAttendance,
        description: event.description,
        client: event.client,
      },
    }

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
