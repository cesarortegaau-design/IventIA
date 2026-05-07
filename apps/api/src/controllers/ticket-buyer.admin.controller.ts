import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

// GET /clients/ticket-buyer-users
export async function adminListTicketBuyerUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const users = await prisma.ticketBuyerUser.findMany({
      where: { tenantId },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: users })
  } catch (err) { next(err) }
}

// GET /clients/ticket-buyer-users/:id
export async function adminGetTicketBuyerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const { id } = req.params

    const user = await prisma.ticketBuyerUser.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            ticketEvent: { include: { event: { select: { name: true, eventStart: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { orders: true } },
      },
    })
    if (!user || user.tenantId !== tenantId) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    res.json({ success: true, data: user })
  } catch (err) { next(err) }
}

// PATCH /clients/ticket-buyer-users/:id
export async function adminUpdateTicketBuyerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const { isActive } = req.body

    const user = await prisma.ticketBuyerUser.findUnique({ where: { id } })
    if (!user || user.tenantId !== tenantId) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    const updated = await prisma.ticketBuyerUser.update({ where: { id }, data: { isActive } })
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

// POST /clients/ticket-buyer-users/:id/reset-password
export async function adminResetTicketBuyerUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const { id } = req.params
    const { password } = req.body

    if (!password || password.length < 6) throw new AppError(400, 'VALIDATION', 'Contraseña debe tener al menos 6 caracteres')

    const user = await prisma.ticketBuyerUser.findUnique({ where: { id } })
    if (!user || user.tenantId !== tenantId) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado')

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.ticketBuyerUser.update({ where: { id }, data: { passwordHash } })

    res.json({ success: true })
  } catch (err) { next(err) }
}
