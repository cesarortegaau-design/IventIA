import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { SupplierPortalTokenPayload } from '../middleware/supplierPortalAuth.middleware'
import { auditService } from '../services/audit.service'
import { emailService } from '../services/email.service'

function signSupplierPortalTokens(supplierPortalUserId: string, tenantId: string, email: string) {
  const payload: SupplierPortalTokenPayload = { supplierPortalUserId, tenantId, email, type: 'supplier-portal' }
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  })
  const refreshToken = jwt.sign({ supplierPortalUserId, type: 'supplier-portal' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
  return { accessToken, refreshToken }
}

export async function supplierPortalVerifyCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body)

    const accessCode = await prisma.supplierPortalCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { supplier: { select: { id: true, name: true, code: true } } },
    })

    if (!accessCode || !accessCode.isActive) {
      throw new AppError(400, 'INVALID_CODE', 'Código de acceso inválido o inactivo')
    }
    if (accessCode.usedCount >= accessCode.maxUses) {
      throw new AppError(400, 'CODE_EXHAUSTED', 'Este código ya fue utilizado al máximo')
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      throw new AppError(400, 'CODE_EXPIRED', 'El código de acceso ha expirado')
    }

    res.json({ success: true, data: { supplier: accessCode.supplier, codeId: accessCode.id } })
  } catch (err) {
    next(err)
  }
}

export async function supplierPortalRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      code: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
    })
    const data = schema.parse(req.body)

    const accessCode = await prisma.supplierPortalCode.findUnique({
      where: { code: data.code.toUpperCase() },
      include: { supplier: true },
    })

    if (!accessCode || !accessCode.isActive || accessCode.usedCount >= accessCode.maxUses) {
      throw new AppError(400, 'INVALID_CODE', 'Código de acceso inválido')
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      throw new AppError(400, 'CODE_EXPIRED', 'El código ha expirado')
    }

    const existing = await prisma.supplierPortalUser.findUnique({
      where: { tenantId_email: { tenantId: accessCode.tenantId, email: data.email.toLowerCase() } },
    })

    if (existing) {
      // User already exists — just grant access to this supplier if not already granted
      const alreadyLinked = await prisma.supplierPortalUserSupplier.findUnique({
        where: { portalUserId_supplierId: { portalUserId: existing.id, supplierId: accessCode.supplierId } },
      })
      if (!alreadyLinked) {
        await prisma.$transaction([
          prisma.supplierPortalUserSupplier.create({
            data: { portalUserId: existing.id, supplierId: accessCode.supplierId, accessCodeId: accessCode.id },
          }),
          prisma.supplierPortalCode.update({
            where: { id: accessCode.id },
            data: { usedCount: { increment: 1 } },
          }),
        ])
      }
      const tokens = signSupplierPortalTokens(existing.id, existing.tenantId, existing.email)
      return res.json({
        success: true,
        data: { ...tokens, user: { id: existing.id, email: existing.email, firstName: existing.firstName, lastName: existing.lastName } },
      })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const portalUser = await prisma.supplierPortalUser.create({
      data: {
        tenantId: accessCode.tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    })

    await prisma.$transaction([
      prisma.supplierPortalUserSupplier.create({
        data: { portalUserId: portalUser.id, supplierId: accessCode.supplierId, accessCodeId: accessCode.id },
      }),
      prisma.supplierPortalCode.update({
        where: { id: accessCode.id },
        data: { usedCount: { increment: 1 } },
      }),
    ])

    await auditService.log(portalUser.tenantId, portalUser.id, 'SupplierPortalUser', portalUser.id, 'CREATE', null, {
      email: portalUser.email,
      firstName: portalUser.firstName,
      lastName: portalUser.lastName,
      phone: portalUser.phone,
    }, req?.ip)

    const tokens = signSupplierPortalTokens(portalUser.id, portalUser.tenantId, portalUser.email)
    res.status(201).json({
      success: true,
      data: { ...tokens, user: { id: portalUser.id, email: portalUser.email, firstName: portalUser.firstName, lastName: portalUser.lastName } },
    })
  } catch (err) {
    next(err)
  }
}

export async function supplierPortalLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body)

    const user = await prisma.supplierPortalUser.findFirst({
      where: { email: email.toLowerCase() },
    })
    if (!user || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')

    const tokens = signSupplierPortalTokens(user.id, user.tenantId, user.email)
    res.json({
      success: true,
      data: { ...tokens, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } },
    })
  } catch (err) {
    next(err)
  }
}

export async function supplierPortalRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body)
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { supplierPortalUserId: string; type: string }
    if (payload.type !== 'supplier-portal') throw new Error()

    const user = await prisma.supplierPortalUser.findUnique({ where: { id: payload.supplierPortalUserId } })
    if (!user || !user.isActive) throw new Error()

    const tokens = signSupplierPortalTokens(user.id, user.tenantId, user.email)
    res.json({ success: true, data: tokens })
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado' } })
  }
}

export async function supplierPortalMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.supplierPortalUser.findUnique({
      where: { id: req.supplierPortalUser!.supplierPortalUserId },
      include: {
        suppliers: {
          include: {
            supplier: { select: { id: true, name: true, code: true, type: true, status: true, email: true, phone: true } },
          },
        },
      },
    })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

export async function supplierPortalUpdateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().nullish(),
    })
    const data = schema.parse(req.body)

    const existing = await prisma.supplierPortalUser.findUnique({ where: { id: req.supplierPortalUser!.supplierPortalUserId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    const user = await prisma.supplierPortalUser.update({
      where: { id: req.supplierPortalUser!.supplierPortalUserId },
      data,
    })

    if (data.firstName || data.lastName || data.phone !== undefined) {
      await auditService.log(user.tenantId, user.id, 'SupplierPortalUser', user.id, 'UPDATE',
        { firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone },
        { firstName: user.firstName, lastName: user.lastName, phone: user.phone },
        req?.ip)
    }

    res.json({ success: true, data: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } })
  } catch (err) {
    next(err)
  }
}

export async function supplierPortalForgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)

    // Always return success to prevent email enumeration
    const user = await prisma.supplierPortalUser.findFirst({ where: { email: email.toLowerCase() } })
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.supplierPortalPasswordReset.create({
        data: { portalUserId: user.id, token, expiresAt },
      })

      // Determine supplier portal origin (port 5175 or similar — fall back to first CORS origin)
      const origins = env.CORS_ORIGIN.split(',')
      const portalOrigin = origins.find(o => o.includes('5175')) || origins[0]
      const resetUrl = `${portalOrigin.trim()}/reset-password?token=${token}`

      await emailService.sendPasswordReset(user.email, resetUrl, user.firstName)
    }

    res.json({ success: true, data: { message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' } })
  } catch (err) {
    next(err)
  }
}

export async function supplierPortalResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = z.object({
      token: z.string().length(64),
      password: z.string().min(6),
    }).parse(req.body)

    const reset = await prisma.supplierPortalPasswordReset.findUnique({
      where: { token },
      include: { portalUser: { select: { id: true, isActive: true } } },
    })

    if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.portalUser.isActive) {
      throw new AppError(400, 'INVALID_TOKEN', 'El enlace es inválido o ha expirado')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.supplierPortalUser.update({ where: { id: reset.portalUserId }, data: { passwordHash } }),
      prisma.supplierPortalPasswordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])

    res.json({ success: true, data: { message: 'Contraseña actualizada correctamente' } })
  } catch (err) {
    next(err)
  }
}
