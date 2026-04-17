import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'
import { z } from 'zod'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 8): string {
  return Array.from(crypto.randomBytes(length))
    .map(b => CODE_CHARS[b % CODE_CHARS.length])
    .join('')
}

export async function generateSupplierPortalCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, userId } = req.user!
    const { supplierId } = req.params
    const { count = 5, maxUses = 1, expiresAt } = z.object({
      count: z.number().int().min(1).max(100).default(5),
      maxUses: z.number().int().min(1).default(1),
      expiresAt: z.string().datetime().optional(),
    }).parse(req.body)

    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } })
    if (!supplier) throw new AppError(404, 'NOT_FOUND', 'Proveedor no encontrado')

    const existingCodes = new Set(
      (await prisma.supplierPortalCode.findMany({ select: { code: true } })).map(c => c.code)
    )

    const codes: string[] = []
    let attempts = 0
    while (codes.length < count && attempts < count * 10) {
      const c = generateCode()
      if (!existingCodes.has(c)) { codes.push(c); existingCodes.add(c) }
      attempts++
    }
    if (codes.length < count) throw new AppError(500, 'CODE_GEN_ERROR', 'No se pudieron generar suficientes códigos únicos')

    const created = await prisma.$transaction(
      codes.map(code => prisma.supplierPortalCode.create({
        data: { tenantId, supplierId, code, maxUses, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
      }))
    )

    await auditService.log(tenantId, userId, 'SupplierPortalCode', supplierId, 'CREATE', null,
      { count: created.length, supplierId, supplierName: supplier.name }, req?.ip)

    res.status(201).json({ success: true, data: created, meta: { created: created.length } })
  } catch (err) { next(err) }
}

export async function listSupplierPortalCodes(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const { supplierId } = req.params

    const codes = await prisma.supplierPortalCode.findMany({
      where: { supplierId, tenantId },
      include: {
        usages: {
          include: { portalUser: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: codes })
  } catch (err) { next(err) }
}

export async function revokeSupplierPortalCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, userId } = req.user!
    const { supplierId, codeId } = req.params

    const code = await prisma.supplierPortalCode.findFirst({ where: { id: codeId, supplierId, tenantId } })
    if (!code) throw new AppError(404, 'NOT_FOUND', 'Código no encontrado')

    await prisma.supplierPortalCode.update({ where: { id: codeId }, data: { isActive: false } })
    await auditService.log(tenantId, userId, 'SupplierPortalCode', codeId, 'UPDATE', { isActive: true }, { isActive: false }, req?.ip)

    res.json({ success: true })
  } catch (err) { next(err) }
}
