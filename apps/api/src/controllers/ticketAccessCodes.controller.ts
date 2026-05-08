import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function generateTicketCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const schema = z.object({
      count: z.coerce.number().min(1).max(200).default(10),
      maxUses: z.coerce.number().min(1).default(1),
      expiresAt: z.string().datetime().optional(),
    })
    const { count, maxUses, expiresAt } = schema.parse(req.body)

    // Verify ticket event exists and belongs to tenant
    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId }
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const codes = []
    for (let i = 0; i < count; i++) {
      let code = generateCode()
      // Ensure uniqueness (retry on collision)
      while (await prisma.ticketAccessCode.findUnique({ where: { code } })) {
        code = generateCode()
      }
      codes.push({
        tenantId,
        ticketEventId: ticketEvent.id,
        code,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: req.user!.userId,
      })
    }

    const created = await prisma.ticketAccessCode.createMany({ data: codes })

    const result = await prisma.ticketAccessCode.findMany({
      where: { ticketEventId: ticketEvent.id, tenantId, code: { in: codes.map((c) => c.code) } },
      orderBy: { createdAt: 'desc' },
    })

    // Audit code generation
    await auditService.log(tenantId, req.user!.userId, 'TicketAccessCode', ticketEvent.id, 'CREATE', null, {
      codesGenerated: created.count,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    }, req?.ip)

    res.status(201).json({ success: true, data: result, meta: { created: created.count } })
  } catch (err) {
    next(err)
  }
}

export async function listTicketCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    // Verify ticket event exists
    const ticketEvent = await prisma.ticketEvent.findFirst({
      where: { event: { id: eventId }, tenantId }
    })
    if (!ticketEvent) throw new AppError(404, 'TICKET_EVENT_NOT_FOUND', 'Evento de boletos no encontrado')

    const codes = await prisma.ticketAccessCode.findMany({
      where: { ticketEventId: ticketEvent.id, tenantId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: codes })
  } catch (err) {
    next(err)
  }
}

export async function revokeTicketCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { codeId } = req.params
    const tenantId = req.user!.tenantId

    const code = await prisma.ticketAccessCode.findFirst({ where: { id: codeId, tenantId } })
    if (!code) throw new AppError(404, 'NOT_FOUND', 'Código no encontrado')

    const updated = await prisma.ticketAccessCode.update({
      where: { id: codeId },
      data: { isActive: false },
    })

    await auditService.log(tenantId, req.user!.userId, 'TicketAccessCode', codeId, 'UPDATE',
      { isActive: code.isActive },
      { isActive: updated.isActive },
      req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
