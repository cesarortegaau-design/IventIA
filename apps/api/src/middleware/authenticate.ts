import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'
import { AuthTokenPayload } from '@iventia/shared'

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'No token provided'))
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload
    req.user = payload
    next()
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Token is invalid or expired'))
  }
}
