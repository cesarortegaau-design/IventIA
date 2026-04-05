import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { PortalTokenPayload } from '../middleware/portalAuth.middleware'
import { auditService } from '../services/audit.service'

function signPortalTokens(portalUserId: string, tenantId: string, email: string) {
  const payload: PortalTokenPayload = { portalUserId, tenantId, email, type: 'portal' }
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  })
  const refreshToken = jwt.sign({ portalUserId, type: 'portal' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
  return { accessToken, refreshToken }
}

export async function portalVerifyCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body)

    const accessCode = await prisma.portalAccessCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { event: { select: { id: true, name: true, code: true, portalEnabled: true, eventStart: true, eventEnd: true } } },
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
    if (!accessCode.event.portalEnabled) {
      throw new AppError(400, 'PORTAL_DISABLED', 'El portal no está habilitado para este evento')
    }

    res.json({ success: true, data: { event: accessCode.event, codeId: accessCode.id } })
  } catch (err) {
    next(err)
  }
}

export async function portalRegister(req: Request, res: Response, next: NextFunction) {
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

    const accessCode = await prisma.portalAccessCode.findUnique({
      where: { code: data.code.toUpperCase() },
      include: { event: true },
    })

    if (!accessCode || !accessCode.isActive || accessCode.usedCount >= accessCode.maxUses) {
      throw new AppError(400, 'INVALID_CODE', 'Código de acceso inválido')
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
      throw new AppError(400, 'CODE_EXPIRED', 'El código ha expirado')
    }
    if (!accessCode.event.portalEnabled) {
      throw new AppError(400, 'PORTAL_DISABLED', 'El portal no está habilitado para este evento')
    }

    const existing = await prisma.portalUser.findUnique({ where: { email: data.email.toLowerCase() } })
    if (existing) {
      // User already exists — just grant access to this event if not already granted
      const alreadyLinked = await prisma.portalUserEvent.findUnique({
        where: { portalUserId_eventId: { portalUserId: existing.id, eventId: accessCode.eventId } },
      })
      if (!alreadyLinked) {
        await prisma.$transaction([
          prisma.portalUserEvent.create({
            data: { portalUserId: existing.id, eventId: accessCode.eventId, accessCodeId: accessCode.id },
          }),
          prisma.portalAccessCode.update({
            where: { id: accessCode.id },
            data: { usedCount: { increment: 1 } },
          }),
        ])
      }
      const tokens = signPortalTokens(existing.id, existing.tenantId, existing.email)
      return res.json({ success: true, data: { ...tokens, user: { id: existing.id, email: existing.email, firstName: existing.firstName, lastName: existing.lastName } } })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const [portalUser] = await prisma.$transaction([
      prisma.portalUser.create({
        data: {
          tenantId: accessCode.tenantId,
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      }),
    ])

    await prisma.$transaction([
      prisma.portalUserEvent.create({
        data: { portalUserId: portalUser.id, eventId: accessCode.eventId, accessCodeId: accessCode.id },
      }),
      prisma.portalAccessCode.update({
        where: { id: accessCode.id },
        data: { usedCount: { increment: 1 } },
      }),
    ])

    // Audit portal user creation
    await auditService.log(portalUser.tenantId, portalUser.id, 'PortalUser', portalUser.id, 'CREATE', null, {
      email: portalUser.email,
      firstName: portalUser.firstName,
      lastName: portalUser.lastName,
      phone: portalUser.phone,
    }, req?.ip)

    const tokens = signPortalTokens(portalUser.id, portalUser.tenantId, portalUser.email)
    res.status(201).json({
      success: true,
      data: { ...tokens, user: { id: portalUser.id, email: portalUser.email, firstName: portalUser.firstName, lastName: portalUser.lastName } },
    })
  } catch (err) {
    next(err)
  }
}

export async function portalLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body)

    const user = await prisma.portalUser.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')

    const tokens = signPortalTokens(user.id, user.tenantId, user.email)
    res.json({
      success: true,
      data: { ...tokens, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } },
    })
  } catch (err) {
    next(err)
  }
}

export async function portalRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body)
    const payload = jwt.verify(refreshToken, env.JWT_SECRET) as { portalUserId: string; type: string }
    if (payload.type !== 'portal') throw new Error()

    const user = await prisma.portalUser.findUnique({ where: { id: payload.portalUserId } })
    if (!user || !user.isActive) throw new Error()

    const tokens = signPortalTokens(user.id, user.tenantId, user.email)
    res.json({ success: true, data: tokens })
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado' } })
  }
}

export async function portalMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.portalUser.findUnique({
      where: { id: req.portalUser!.portalUserId },
      include: { client: { select: { id: true, personType: true, companyName: true, firstName: true, lastName: true, rfc: true, taxRegime: true, addressStreet: true, addressCity: true, addressState: true, addressZip: true, addressCountry: true } } },
    })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

export async function portalUpdateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().nullish(),
    })
    const data = schema.parse(req.body)

    const existing = await prisma.portalUser.findUnique({ where: { id: req.portalUser!.portalUserId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    const user = await prisma.portalUser.update({
      where: { id: req.portalUser!.portalUserId },
      data,
    })

    if (data.firstName || data.lastName || data.phone !== undefined) {
      await auditService.log(user.tenantId, user.id, 'PortalUser', user.id, 'UPDATE',
        { firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone },
        { firstName: user.firstName, lastName: user.lastName, phone: user.phone },
        req?.ip)
    }

    res.json({ success: true, data: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } })
  } catch (err) {
    next(err)
  }
}
