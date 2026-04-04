import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'

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
    const { resourceId, phase, startTime, endTime, notes } = req.body

    // Verify event belongs to tenant
    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' })

    const space = await prisma.eventSpace.create({
      data: { eventId, resourceId, phase, startTime: new Date(startTime), endTime: new Date(endTime), notes },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
    })

    res.status(201).json({ success: true, data: space })
  } catch (err) { next(err) }
}

export async function updateEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId
    const { resourceId, phase, startTime, endTime, notes } = req.body

    const existing = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
    })
    if (!existing) return res.status(404).json({ success: false, error: 'EventSpace not found' })

    const space = await prisma.eventSpace.update({
      where: { id: spaceId },
      data: { resourceId, phase, startTime: new Date(startTime), endTime: new Date(endTime), notes },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
    })

    res.json({ success: true, data: space })
  } catch (err) { next(err) }
}

export async function deleteEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId

    const existing = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
    })
    if (!existing) return res.status(404).json({ success: false, error: 'EventSpace not found' })

    await prisma.eventSpace.delete({ where: { id: spaceId } })
    res.json({ success: true })
  } catch (err) { next(err) }
}
