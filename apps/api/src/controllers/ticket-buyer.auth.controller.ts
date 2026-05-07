import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { env } from '../config/env'
import { AppError } from '../middleware/errorHandler'
import { TicketBuyerTokenPayload } from '../middleware/ticketBuyerAuth.middleware'
import { emailService } from '../services/email.service'

function signTokens(ticketBuyerUserId: string, tenantId: string, email: string) {
  const payload: TicketBuyerTokenPayload = { ticketBuyerUserId, tenantId, email, type: 'ticket-buyer' }
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any })
  const refreshToken = jwt.sign({ ticketBuyerUserId, type: 'ticket-buyer' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
  return { accessToken, refreshToken }
}

async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!env.HCAPTCHA_SECRET_KEY) return true // skip in dev if not configured
  try {
    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.HCAPTCHA_SECRET_KEY, response: token }).toString(),
    })
    const json: any = await res.json()
    return json.success === true
  } catch {
    return false
  }
}

async function linkAnonymousOrders(email: string, tenantId: string, userId: string) {
  await prisma.ticketOrder.updateMany({
    where: { buyerEmail: email.toLowerCase(), ticketBuyerUserId: null, tenantId },
    data: { ticketBuyerUserId: userId },
  })
}

// POST /public/tickets/auth/register
export async function ticketBuyerRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
      hCaptchaToken: z.string().optional(),
    })
    const data = schema.parse(req.body)

    if (data.hCaptchaToken) {
      const ok = await verifyHCaptcha(data.hCaptchaToken)
      if (!ok) throw new AppError(400, 'CAPTCHA_FAILED', 'Verificación de seguridad fallida')
    }

    // Resolve tenant from host header (single-tenant: use first active tenant)
    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
    if (!tenant) throw new AppError(503, 'NO_TENANT', 'Servicio no disponible')

    const existing = await prisma.ticketBuyerUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: data.email.toLowerCase() } },
    })
    if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'Este correo ya está registrado')

    const passwordHash = await bcrypt.hash(data.password, 12)
    const user = await prisma.ticketBuyerUser.create({
      data: {
        tenantId: tenant.id,
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    })

    // Link any anonymous orders placed with this email
    await linkAnonymousOrders(user.email, tenant.id, user.id)

    const tokens = signTokens(user.id, tenant.id, user.email)
    res.status(201).json({
      success: true,
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      },
    })
  } catch (err) { next(err) }
}

// POST /public/tickets/auth/login
export async function ticketBuyerLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body)

    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
    if (!tenant) throw new AppError(503, 'NO_TENANT', 'Servicio no disponible')

    const user = await prisma.ticketBuyerUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    })
    if (!user || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas')

    // Link any anonymous orders placed with this email
    await linkAnonymousOrders(user.email, tenant.id, user.id)

    const tokens = signTokens(user.id, tenant.id, user.email)
    res.json({
      success: true,
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      },
    })
  } catch (err) { next(err) }
}

// POST /public/tickets/auth/refresh
export async function ticketBuyerRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)
    let payload: any
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET)
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Refresh token inválido')
    }
    if (payload.type !== 'ticket-buyer') throw new AppError(401, 'INVALID_TOKEN', 'Token inválido')

    const user = await prisma.ticketBuyerUser.findUnique({ where: { id: payload.ticketBuyerUserId } })
    if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Usuario no autorizado')

    const tokens = signTokens(user.id, user.tenantId, user.email)
    res.json({ success: true, data: tokens })
  } catch (err) { next(err) }
}

// GET /public/tickets/me
export async function ticketBuyerMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId } = req.ticketBuyerUser!
    const user = await prisma.ticketBuyerUser.findUnique({
      where: { id: ticketBuyerUserId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
    })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')
    res.json({ success: true, data: user })
  } catch (err) { next(err) }
}

// POST /public/tickets/auth/forgot-password
export async function ticketBuyerForgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)

    const tenant = await prisma.tenant.findFirst({ where: { isActive: true } })
    if (!tenant) { res.json({ success: true }); return }

    const user = await prisma.ticketBuyerUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    })
    // Always return success to avoid email enumeration
    if (!user || !user.isActive) { res.json({ success: true }); return }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

    await prisma.ticketBuyerPasswordReset.create({ data: { buyerUserId: user.id, token, expiresAt } })

    const resetUrl = `${env.TICKETS_APP_URL}/reset-password?token=${token}`
    emailService.sendPasswordReset(user.email, resetUrl, user.firstName, 'Restablecer contraseña — IventIA Boletos').catch(err =>
      console.error('[ticket-buyer] Reset email failed:', err)
    )

    res.json({ success: true })
  } catch (err) { next(err) }
}

// PATCH /public/tickets/me
export async function ticketBuyerUpdateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId } = req.ticketBuyerUser!
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional().nullable(),
    })
    const data = schema.parse(req.body)
    const user = await prisma.ticketBuyerUser.update({
      where: { id: ticketBuyerUserId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    })
    res.json({ success: true, data: user })
  } catch (err) { next(err) }
}

// POST /public/tickets/me/change-password
export async function ticketBuyerChangePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketBuyerUserId } = req.ticketBuyerUser!
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    }).parse(req.body)

    const user = await prisma.ticketBuyerUser.findUnique({ where: { id: ticketBuyerUserId } })
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) throw new AppError(400, 'WRONG_PASSWORD', 'Contraseña actual incorrecta')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.ticketBuyerUser.update({ where: { id: ticketBuyerUserId }, data: { passwordHash } })

    res.json({ success: true })
  } catch (err) { next(err) }
}

// POST /public/tickets/auth/reset-password
export async function ticketBuyerResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body)

    const reset = await prisma.ticketBuyerPasswordReset.findUnique({ where: { token } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new AppError(400, 'INVALID_TOKEN', 'Token inválido o expirado')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.ticketBuyerUser.update({ where: { id: reset.buyerUserId }, data: { passwordHash } }),
      prisma.ticketBuyerPasswordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])

    res.json({ success: true })
  } catch (err) { next(err) }
}
