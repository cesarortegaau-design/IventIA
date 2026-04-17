import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface SupplierPortalTokenPayload {
  supplierPortalUserId: string
  tenantId: string
  email: string
  type: 'supplier-portal'
}

declare global {
  namespace Express {
    interface Request {
      supplierPortalUser?: SupplierPortalTokenPayload
    }
  }
}

export function authenticateSupplierPortal(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } })
    return
  }
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, env.JWT_SECRET) as SupplierPortalTokenPayload
    if (payload.type !== 'supplier-portal') throw new Error('Not a supplier portal token')
    req.supplierPortalUser = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } })
  }
}
