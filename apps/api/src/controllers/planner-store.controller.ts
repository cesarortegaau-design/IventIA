import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

const VALID_KEYS = [
  'presupuesto', 'timeline', 'tareas', 'branding',
  'mapa', 'crm', 'mensajes', 'suppliers', 'contrato',
]

/** GET /events/:id/planner-store/:key */
export async function getPlannerStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId, key } = req.params
    const { tenantId } = req.user!
    if (!VALID_KEYS.includes(key)) throw new AppError(400, 'VALIDATION_ERROR', `Invalid store key: ${key}`)

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const store = await prisma.plannerStore.findUnique({
      where: { eventId_storeKey: { eventId, storeKey: key } },
    })
    res.json({ success: true, data: store?.data ?? null })
  } catch (err) { next(err) }
}

/** PUT /events/:id/planner-store/:key */
export async function savePlannerStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId, key } = req.params
    const { tenantId } = req.user!
    const { data } = req.body
    if (!VALID_KEYS.includes(key)) throw new AppError(400, 'VALIDATION_ERROR', `Invalid store key: ${key}`)
    if (data === undefined) throw new AppError(400, 'VALIDATION_ERROR', 'body.data is required')

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    await prisma.plannerStore.upsert({
      where: { eventId_storeKey: { eventId, storeKey: key } },
      update: { data },
      create: { eventId, storeKey: key, data },
    })
    res.json({ success: true })
  } catch (err) { next(err) }
}

/** GET /events/:id/planner-stores — all stores for an event (bulk load) */
export async function getAllPlannerStores(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const { tenantId } = req.user!

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const stores = await prisma.plannerStore.findMany({ where: { eventId } })
    const result: Record<string, any> = {}
    for (const s of stores) result[s.storeKey] = s.data
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}
