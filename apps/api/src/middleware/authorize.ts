import { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'
import { prisma } from '../config/database'
import { PrivilegeKey } from '@iventia/shared'

type UserRole = 'ADMIN' | 'NORMAL' | 'READ_ONLY'

export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'))
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient role'))
    }
    next()
  }
}

export function requirePrivilege(privilegeKey: PrivilegeKey) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'))

    // Admins have all privileges
    if (req.user.role === 'ADMIN') return next()

    // Load user's profile and check privilege
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        profile: {
          select: { privileges: { where: { privilegeKey }, select: { id: true } } },
        },
      },
    })

    if (user?.profile?.privileges.length) return next()

    return next(new AppError(403, 'FORBIDDEN', `No tienes permiso para esta acción`))
  }
}
