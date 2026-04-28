import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

const STAND_INCLUDE = {
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  orders: {
    select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const

// GET /events/:eventId/stands — list with geometry for DXF viewer
export async function listStands(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const stands = await prisma.stand.findMany({
      where: { eventId, isActive: true },
      include: STAND_INCLUDE,
      orderBy: { code: 'asc' },
    })

    res.json({ success: true, data: stands })
  } catch (err) {
    next(err)
  }
}

const createStandSchema = z.object({
  code:          z.string().min(1).max(50),
  status:        z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED']).default('AVAILABLE'),
  widthM:        z.number().positive().nullable().optional(),
  depthM:        z.number().positive().nullable().optional(),
  heightM:       z.number().positive().nullable().optional(),
  locationNotes: z.string().nullable().optional(),
  floorPlanId:   z.string().nullable().optional(),
  polygon:       z.array(z.tuple([z.number(), z.number()])).nullable().optional(),
  dxfEntityIdx:  z.number().int().nullable().optional(),
  clientId:      z.string().nullable().optional(),
})

// POST /events/:eventId/stands
export async function createStand(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const data = createStandSchema.parse(req.body)

    const stand = await prisma.stand.create({
      data: {
        eventId,
        code:          data.code,
        status:        data.status,
        widthM:        data.widthM ?? undefined,
        depthM:        data.depthM ?? undefined,
        heightM:       data.heightM ?? undefined,
        locationNotes: data.locationNotes ?? undefined,
        floorPlanId:   data.floorPlanId ?? undefined,
        polygon:       data.polygon ?? undefined,
        dxfEntityIdx:  data.dxfEntityIdx ?? undefined,
        clientId:      data.clientId ?? undefined,
      },
      include: STAND_INCLUDE,
    })

    res.status(201).json({ success: true, data: stand })
  } catch (err) {
    next(err)
  }
}

const updateStandSchema = createStandSchema.partial()

// PUT /events/:eventId/stands/:standId
export async function updateStand(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, standId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const existing = await prisma.stand.findFirst({ where: { id: standId, eventId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Stand no encontrado')

    const data = updateStandSchema.parse(req.body)

    const stand = await prisma.stand.update({
      where: { id: standId },
      data: {
        ...(data.code          !== undefined && { code: data.code }),
        ...(data.status        !== undefined && { status: data.status }),
        ...(data.widthM        !== undefined && { widthM: data.widthM }),
        ...(data.depthM        !== undefined && { depthM: data.depthM }),
        ...(data.heightM       !== undefined && { heightM: data.heightM }),
        ...(data.locationNotes !== undefined && { locationNotes: data.locationNotes }),
        ...(data.floorPlanId   !== undefined && { floorPlanId: data.floorPlanId }),
        ...(data.polygon       !== undefined && { polygon: data.polygon }),
        ...(data.dxfEntityIdx  !== undefined && { dxfEntityIdx: data.dxfEntityIdx }),
        ...(data.clientId      !== undefined && { clientId: data.clientId }),
      },
      include: STAND_INCLUDE,
    })

    res.json({ success: true, data: stand })
  } catch (err) {
    next(err)
  }
}

// DELETE /events/:eventId/stands/:standId
export async function deleteStand(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, standId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const existing = await prisma.stand.findFirst({ where: { id: standId, eventId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Stand no encontrado')

    await prisma.stand.delete({ where: { id: standId } })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

const standRowSchema = z.object({
  codigo:           z.string().min(1),
  ancho_m:          z.preprocess(v => v === '' || v == null ? null : Number(v), z.number().positive().nullable()),
  largo_m:          z.preprocess(v => v === '' || v == null ? null : Number(v), z.number().positive().nullable()),
  alto_m:           z.preprocess(v => v === '' || v == null ? null : Number(v), z.number().positive().nullable()),
  notas_ubicacion:  z.string().optional().nullable(),
})

// POST /events/:eventId/stands/import
export async function importStands(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const rows = z.array(standRowSchema).min(1).parse(req.body)

    // Upsert by (eventId, code) — update dimensions/notes if stand already exists
    const results = await prisma.$transaction(
      rows.map(row =>
        prisma.stand.upsert({
          where: { eventId_code: { eventId, code: row.codigo } },
          create: {
            eventId,
            code:          row.codigo,
            widthM:        row.ancho_m  ?? undefined,
            depthM:        row.largo_m  ?? undefined,
            heightM:       row.alto_m   ?? undefined,
            locationNotes: row.notas_ubicacion ?? undefined,
          },
          update: {
            widthM:        row.ancho_m  ?? undefined,
            depthM:        row.largo_m  ?? undefined,
            heightM:       row.alto_m   ?? undefined,
            locationNotes: row.notas_ubicacion ?? undefined,
          },
        })
      )
    )

    // Audit stand import (as a batch action)
    await auditService.log(tenantId, req.user!.userId, 'Stand', eventId, 'CREATE', null, {
      standsImported: results.length,
      importTimestamp: new Date().toISOString(),
    }, req?.ip)

    res.json({ success: true, data: { imported: results.length } })
  } catch (err) {
    next(err)
  }
}
