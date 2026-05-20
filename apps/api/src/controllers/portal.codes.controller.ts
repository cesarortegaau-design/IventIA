import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
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
    if (!['CONFIRMED', 'IN_EXECUTION'].includes(event.status)) {
      throw new AppError(400, 'INVALID_EVENT_STATUS', 'Solo se pueden generar códigos para eventos en estado Confirmado o En ejecución')
    }

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

    // Audit code generation (as a batch action)
    await auditService.log(tenantId, req.user!.userId, 'PortalAccessCode', eventId, 'CREATE', null, {
      codesGenerated: created.count,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    }, req?.ip)

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

    await auditService.log(tenantId, req.user!.userId, 'PortalAccessCode', codeId, 'UPDATE',
      { isActive: code.isActive },
      { isActive: updated.isActive },
      req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * Admin creates portal access directly for a client — no access code required from client side.
 * Creates PortalUser (or reuses existing) + internal PortalAccessCode + PortalUserEvent.
 * No event status restriction — works for any event status.
 */
export async function createPortalDirectAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: eventId } = req.params
    const tenantId = req.user!.tenantId

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
    })
    const { email, password, firstName, lastName } = schema.parse(req.body)

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento no encontrado')

    // Enable portal on event if not already
    if (!event.portalEnabled) {
      await prisma.event.update({ where: { id: eventId }, data: { portalEnabled: true } })
    }

    // Create an internal access code for this direct-access grant
    let code = generateCode()
    while (await prisma.portalAccessCode.findUnique({ where: { code } })) {
      code = generateCode()
    }
    const accessCode = await prisma.portalAccessCode.create({
      data: {
        tenantId,
        eventId,
        code,
        maxUses: 1,
        createdById: req.user!.userId,
      },
    })

    // Find or create PortalUser
    let portalUser = await prisma.portalUser.findUnique({ where: { email: email.toLowerCase() } })
    if (!portalUser) {
      const passwordHash = await bcrypt.hash(password, 12)
      portalUser = await prisma.portalUser.create({
        data: { tenantId, email: email.toLowerCase(), passwordHash, firstName, lastName },
      })
    } else {
      // Update password so admin-generated credentials work
      const passwordHash = await bcrypt.hash(password, 12)
      portalUser = await prisma.portalUser.update({
        where: { id: portalUser.id },
        data: { passwordHash, firstName, lastName },
      })
    }

    // Link user to event (idempotent)
    const existing = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId: portalUser.id, eventId } },
    })
    if (!existing) {
      await prisma.$transaction([
        prisma.portalUserEvent.create({
          data: { portalUserId: portalUser.id, eventId, accessCodeId: accessCode.id },
        }),
        prisma.portalAccessCode.update({
          where: { id: accessCode.id },
          data: { usedCount: 1 },
        }),
      ])
    }

    await auditService.log(tenantId, req.user!.userId, 'PortalUser', portalUser.id, 'CREATE', null, {
      email: portalUser.email, eventId,
    }, req?.ip)

    res.status(201).json({
      success: true,
      data: { email: portalUser.email, firstName: portalUser.firstName, lastName: portalUser.lastName },
    })
  } catch (err) {
    next(err)
  }
}
