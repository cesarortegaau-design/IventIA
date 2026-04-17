import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { PortalTokenPayload } from '../middleware/portalAuth.middleware'
import { auditService } from '../services/audit.service'
import { emailService } from '../services/email.service'

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
      include: {
        client: { select: { id: true, personType: true, companyName: true, firstName: true, lastName: true, rfc: true, taxRegime: true, email: true, phone: true, addressStreet: true, addressCity: true, addressState: true, addressZip: true, addressCountry: true } },
        clients: {
          where: { isActive: true },
          include: { client: { select: { id: true, personType: true, companyName: true, firstName: true, lastName: true, rfc: true, taxRegime: true, email: true, phone: true, addressStreet: true, addressCity: true, addressState: true, addressZip: true, addressCountry: true } } },
        },
      },
    })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

export async function portalSelectClient(req: Request, res: Response, next: NextFunction) {
  try {
    const portalUserId = req.portalUser!.portalUserId
    const tenantId = req.portalUser!.tenantId
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(req.body)

    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Cliente no encontrado')

    await prisma.$transaction(async (tx) => {
      // Create link in PortalUserClient if not exists
      await tx.portalUserClient.upsert({
        where: { portalUserId_clientId: { portalUserId, clientId } },
        create: { portalUserId, clientId },
        update: { isActive: true },
      })
      // Clear legacy portalUserId from whichever client this user previously had
      await tx.client.updateMany({ where: { portalUserId, tenantId, id: { not: clientId } }, data: { portalUserId: null } })
      // Set legacy portalUserId on the selected client (only if unowned or already owned by this user)
      await tx.client.updateMany({ where: { id: clientId, tenantId, OR: [{ portalUserId: null }, { portalUserId }] }, data: { portalUserId } })
    })

    res.json({ success: true, data: { clientId } })
  } catch (err) {
    next(err)
  }
}

export async function portalCreateClient(req: Request, res: Response, next: NextFunction) {
  try {
    const portalUserId = req.portalUser!.portalUserId
    const tenantId = req.portalUser!.tenantId

    const schema = z.object({
      personType: z.enum(['PHYSICAL', 'MORAL']),
      companyName: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      rfc: z.string().optional(),
      taxRegime: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      addressStreet: z.string().optional(),
      addressCity: z.string().optional(),
      addressState: z.string().optional(),
      addressZip: z.string().optional(),
      addressCountry: z.string().default('MX'),
    }).strip()
    const data = schema.parse(req.body)

    const client = await prisma.$transaction(async (tx) => {
      // Clear legacy portalUserId from any existing client owned by this user
      await tx.client.updateMany({ where: { portalUserId, tenantId }, data: { portalUserId: null } })
      const created = await tx.client.create({ data: { ...data, tenantId, portalUserId } })
      await tx.portalUserClient.create({ data: { portalUserId, clientId: created.id } })
      return created
    })

    res.status(201).json({ success: true, data: client })
  } catch (err) {
    next(err)
  }
}

export async function portalUpdateClient(req: Request, res: Response, next: NextFunction) {
  try {
    const portalUserId = req.portalUser!.portalUserId
    const tenantId = req.portalUser!.tenantId
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(req.params)

    // Verify the portal user owns this client
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Cliente no encontrado')

    const isOwner = client.portalUserId === portalUserId
    const hasLink = await prisma.portalUserClient.findUnique({
      where: { portalUserId_clientId: { portalUserId, clientId } },
    })
    if (!isOwner && !hasLink) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este cliente')

    const schema = z.object({
      personType: z.enum(['PHYSICAL', 'MORAL']).optional(),
      companyName: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      rfc: z.string().optional(),
      taxRegime: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      addressStreet: z.string().optional(),
      addressCity: z.string().optional(),
      addressState: z.string().optional(),
      addressZip: z.string().optional(),
      addressCountry: z.string().optional(),
    }).strip()
    const data = schema.parse(req.body)

    const updated = await prisma.client.update({ where: { id: clientId }, data })
    res.json({ success: true, data: updated })
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

export async function portalForgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)

    // Always return success to prevent email enumeration
    const user = await prisma.portalUser.findUnique({ where: { email: email.toLowerCase() } })
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.portalPasswordReset.create({
        data: { portalUserId: user.id, token, expiresAt },
      })

      const portalOrigin = env.CORS_ORIGIN.includes(',')
        ? env.CORS_ORIGIN.split(',').find(o => o.includes('5174')) || env.CORS_ORIGIN.split(',')[0]
        : env.CORS_ORIGIN
      const resetUrl = `${portalOrigin.trim()}/reset-password?token=${token}`

      await emailService.sendPasswordReset(user.email, resetUrl, user.firstName)
    }

    res.json({ success: true, data: { message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' } })
  } catch (err) {
    next(err)
  }
}

export async function portalResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = z.object({
      token: z.string().length(64),
      password: z.string().min(6),
    }).parse(req.body)

    const reset = await prisma.portalPasswordReset.findUnique({
      where: { token },
      include: { portalUser: { select: { id: true, isActive: true } } },
    })

    if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.portalUser.isActive) {
      throw new AppError(400, 'INVALID_TOKEN', 'El enlace es inválido o ha expirado')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.portalUser.update({ where: { id: reset.portalUserId }, data: { passwordHash } }),
      prisma.portalPasswordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])

    res.json({ success: true, data: { message: 'Contraseña actualizada correctamente' } })
  } catch (err) {
    next(err)
  }
}
