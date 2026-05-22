import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

// GET /api/v1/events/:id/lienzo
export async function getLienzo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const { tenantId } = req.user!
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { lienzoData: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')
    res.json({ success: true, data: event.lienzoData ?? null })
  } catch (err) { next(err) }
}

// PUT /api/v1/events/:id/lienzo
export async function saveLienzo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const { tenantId } = req.user!
    const { widgets, strokes } = req.body
    if (!Array.isArray(widgets)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'widgets must be an array')
    }
    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')
    await prisma.event.update({
      where: { id: eventId },
      data: { lienzoData: { widgets, strokes: strokes ?? [] } as any },
    })
    res.json({ success: true })
  } catch (err) { next(err) }
}
