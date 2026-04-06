import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

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
