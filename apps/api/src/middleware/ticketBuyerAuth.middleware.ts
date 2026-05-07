import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface TicketBuyerTokenPayload {
  ticketBuyerUserId: string
  tenantId: string
  email: string
  type: 'ticket-buyer'
}

declare global {
  namespace Express {
    interface Request {
      ticketBuyerUser?: TicketBuyerTokenPayload
    }
  }
}

export function authenticateTicketBuyer(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } })
    return
  }

  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, env.JWT_SECRET) as TicketBuyerTokenPayload
    if (payload.type !== 'ticket-buyer') throw new Error('Not a ticket-buyer token')
    req.ticketBuyerUser = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } })
  }
}
