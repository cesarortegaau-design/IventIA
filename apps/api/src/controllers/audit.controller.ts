import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

const auditQuerySchema = z.object({
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, entityId } = req.params
    const tenantId = req.user!.tenantId
    const { action, limit, offset } = auditQuerySchema.parse(req.query)

    if (!entityType || !entityId) {
      throw new AppError(400, 'MISSING_PARAMS', 'entityType and entityId are required')
    }

    const where: any = {
      tenantId,
      entityType,
      entityId,
    }
    if (action) where.action = action

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
    ])

    res.json({
      success: true,
      data: logs,
      meta: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (err) {
    next(err)
  }
}

export async function getAuditLogByType(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType } = req.params
    const tenantId = req.user!.tenantId
    const { action, limit, offset } = auditQuerySchema.parse(req.query)

    if (!entityType) {
      throw new AppError(400, 'MISSING_PARAMS', 'entityType is required')
    }

    const where: any = { tenantId, entityType }
    if (action) where.action = action

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ])

    res.json({
      success: true,
      data: logs,
      meta: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (err) {
    next(err)
  }
}
