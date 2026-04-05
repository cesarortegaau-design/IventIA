import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { auditService } from '../services/audit.service'

const PHASE_LABEL: Record<string, string> = {
  SETUP: 'Montaje', EVENT: 'Evento', TEARDOWN: 'Desmontaje',
}

export async function listEventSpaces(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const spaces = await prisma.eventSpace.findMany({
      where: { eventId, event: { tenantId } },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: [{ phase: 'asc' }, { startTime: 'asc' }],
    })

    res.json({ success: true, data: spaces })
  } catch (err) { next(err) }
}

export async function createEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { resourceId, phase, startTime, endTime, notes } = req.body

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' })

    const space = await prisma.eventSpace.create({
      data: { eventId, resourceId, phase, startTime: new Date(startTime), endTime: new Date(endTime), notes },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
    })

    await auditService.log(tenantId, userId, 'EventSpace', space.id, 'CREATE', null, {
      resourceId,
      resourceName: space.resource.name,
      phase: PHASE_LABEL[phase] ?? phase,
      startTime,
      endTime,
      notes: notes ?? null,
    }, req?.ip)

    res.status(201).json({ success: true, data: space })
  } catch (err) { next(err) }
}

export async function updateEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { resourceId, phase, startTime, endTime, notes } = req.body

    const existing = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
      include: { resource: { select: { id: true, name: true } } },
    })
    if (!existing) return res.status(404).json({ success: false, error: 'EventSpace not found' })

    const space = await prisma.eventSpace.update({
      where: { id: spaceId },
      data: { resourceId, phase, startTime: new Date(startTime), endTime: new Date(endTime), notes },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
    })

    await auditService.log(tenantId, userId, 'EventSpace', spaceId, 'UPDATE', {
      resourceId: existing.resourceId,
      resourceName: existing.resource.name,
      phase: PHASE_LABEL[existing.phase] ?? existing.phase,
      startTime: existing.startTime.toISOString(),
      endTime: existing.endTime.toISOString(),
      notes: existing.notes,
    }, {
      resourceId,
      resourceName: space.resource.name,
      phase: PHASE_LABEL[phase] ?? phase,
      startTime,
      endTime,
      notes: notes ?? null,
    }, req?.ip)

    res.json({ success: true, data: space })
  } catch (err) { next(err) }
}

export async function deleteEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const existing = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
      include: { resource: { select: { id: true, name: true } } },
    })
    if (!existing) return res.status(404).json({ success: false, error: 'EventSpace not found' })

    await prisma.eventSpace.delete({ where: { id: spaceId } })

    await auditService.log(tenantId, userId, 'EventSpace', spaceId, 'DELETE', {
      resourceId: existing.resourceId,
      resourceName: existing.resource.name,
      phase: PHASE_LABEL[existing.phase] ?? existing.phase,
      startTime: existing.startTime.toISOString(),
      endTime: existing.endTime.toISOString(),
      notes: existing.notes,
    }, null, req?.ip)

    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getEventSpaceAudit(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId

    const space = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
    })
    // Also allow querying deleted spaces (audit logs survive deletion)
    if (!space) {
      const count = await prisma.auditLog.count({
        where: { entityType: 'EventSpace', entityId: spaceId, tenantId },
      })
      if (count === 0) return res.status(404).json({ success: false, error: 'EventSpace not found' })
    }

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'EventSpace', entityId: spaceId, tenantId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ success: true, data: logs })
  } catch (err) { next(err) }
}
