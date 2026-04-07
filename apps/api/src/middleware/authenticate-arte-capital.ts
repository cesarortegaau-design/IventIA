import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'
import { ArteCapitalTokenPayload } from '@iventia/shared'

declare global {
  namespace Express {
    interface Request {
      arteCapitalUser?: ArteCapitalTokenPayload
    }
  }
}

export function authenticateArteCapital(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'No token provided'))
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as ArteCapitalTokenPayload

    if (payload.type !== 'arte-capital') {
      return next(new AppError(401, 'INVALID_TOKEN_TYPE', 'Token is not for Arte Capital'))
    }

    req.arteCapitalUser = payload
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'))
    }
    next(new AppError(401, 'INVALID_TOKEN', 'Token is invalid or expired'))
  }
}

// Middleware to check if user is an artist
export function requireArtist(req: Request, _res: Response, next: NextFunction): void {
  if (!req.arteCapitalUser) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'))
  }

  if (req.arteCapitalUser.userRole !== 'ARTIST') {
    return next(new AppError(403, 'FORBIDDEN', 'Only artists can access this resource'))
  }

  next()
}

// Middleware to check if user is an admin
export function requireArteAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.arteCapitalUser) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated'))
  }

  if (req.arteCapitalUser.userRole !== 'ADMIN') {
    return next(new AppError(403, 'FORBIDDEN', 'Only admins can access this resource'))
  }

  next()
}
