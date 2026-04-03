import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function generatePortalCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const tenantId = req.user!.tenantId

    const schema = z.object({
      count: z.coerce.number().min(1).max(200).default(10),
      maxUses: z.coerce.number().min(1).default(1),
      expiresAt: z.string().datetime().optional(),
      clientId: z.string().optional(),
    })
    const { count, maxUses, expiresAt, clientId } = schema.parse(req.body)

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento no encontrado')

    const codes = []
    for (let i = 0; i < count; i++) {
      let code = generateCode()
      // Ensure uniqueness (retry on collision)
      while (await prisma.portalAccessCode.findUnique({ where: { code } })) {
        code = generateCode()
      }
      codes.push({
        tenantId,
        eventId,
        code,
        clientId: clientId ?? null,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: req.user!.userId,
      })
    }

    const created = await prisma.portalAccessCode.createMany({ data: codes })

    const result = await prisma.portalAccessCode.findMany({
      where: { eventId, tenantId, code: { in: codes.map((c) => c.code) } },
      orderBy: { createdAt: 'desc' },
    })

    res.status(201).json({ success: true, data: result, meta: { created: created.count } })
  } catch (err) {
    next(err)
  }
}

export async function listPortalCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento no encontrado')

    const codes = await prisma.portalAccessCode.findMany({
      where: { eventId, tenantId },
      include: {
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        usages: {
          include: { portalUser: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: codes })
  } catch (err) {
    next(err)
  }
}

export async function revokePortalCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { codeId } = req.params
    const tenantId = req.user!.tenantId

    const code = await prisma.portalAccessCode.findFirst({ where: { id: codeId, tenantId } })
    if (!code) throw new AppError(404, 'NOT_FOUND', 'Código no encontrado')

    const updated = await prisma.portalAccessCode.update({
      where: { id: codeId },
      data: { isActive: false },
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
