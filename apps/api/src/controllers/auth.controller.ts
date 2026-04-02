import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/auth.service'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await authService.login(email, password)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const result = await authService.refreshAccessToken(refreshToken)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const { prisma } = await import('../config/database')
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        userDepartments: { include: { department: true } },
        privileges: { where: { granted: true } },
      },
    })
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}
