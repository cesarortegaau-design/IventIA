import 'dotenv/config'
import path from 'path'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { Server as SocketServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import apiRoutes from './routes/index'
import paymentsRouter from './routes/payments.routes'
import { prisma } from './config/database'

const app    = express()
const server = http.createServer(app)

const corsOrigins = env.CORS_ORIGIN.split(',')

// Security
app.use(helmet())
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}))

// Logging
if (env.NODE_ENV !== 'test') app.use(morgan('dev'))

// Raw body for Stripe webhooks — must be registered before express.json()
app.use('/api/v1/payments', express.raw({ type: 'application/json' }), paymentsRouter)
app.post('/api/v1/gallery/webhooks/stripe', express.raw({ type: 'application/json' }))
app.post('/api/v1/public/tickets/webhook', express.raw({ type: 'application/json' }))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: env.NODE_ENV })
})

// Static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// API routes
app.use('/api/v1', apiRoutes)

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

// Error handler
app.use(errorHandler)

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { origin: corsOrigins, credentials: true },
})

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string
  if (!token) return next(new Error('No token'))
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    socket.data.userId      = payload.userId || payload.portalUserId
    socket.data.tenantId    = payload.tenantId
    socket.data.senderType  = payload.type === 'portal' ? 'PORTAL_USER' : 'ADMIN'
    socket.data.portalUserId = payload.portalUserId
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  // Join conversation room
  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conv:${conversationId}`)
  })

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conv:${conversationId}`)
  })

  // Typing indicator
  socket.on('typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit('typing', {
      conversationId,
      senderType: socket.data.senderType,
    })
  })

  // Send message via socket (real-time path)
  socket.on('send_message', async ({ conversationId, content }: { conversationId: string; content: string }) => {
    try {
      const conv = socket.data.senderType === 'ADMIN'
        ? await prisma.conversation.findFirst({ where: { id: conversationId, tenantId: socket.data.tenantId } })
        : await prisma.conversation.findFirst({ where: { id: conversationId, portalUserId: socket.data.portalUserId } })

      if (!conv) return

      let senderName = 'Usuario'
      if (socket.data.senderType === 'ADMIN') {
        const u = await prisma.user.findUnique({ where: { id: socket.data.userId } })
        if (u) senderName = `${u.firstName} ${u.lastName}`
      } else {
        const u = await prisma.portalUser.findUnique({ where: { id: socket.data.portalUserId } })
        if (u) senderName = `${u.firstName} ${u.lastName}`
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderType: socket.data.senderType,
          senderId:   socket.data.userId,
          senderName,
          content,
        },
      })

      const unreadField = socket.data.senderType === 'ADMIN' ? 'unreadPortal' : 'unreadAdmin'
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date(), [unreadField]: { increment: 1 } },
      })

      // Broadcast to everyone in the room (including sender)
      io.to(`conv:${conversationId}`).emit('new_message', message)

      // Notify the other party's general room (for badge updates)
      if (socket.data.senderType === 'ADMIN') {
        io.to(`portal:${conv.portalUserId}`).emit('unread_update')
      } else {
        io.to(`tenant:${conv.tenantId}`).emit('unread_update')
      }
    } catch (err) {
      console.error('socket send_message error', err)
    }
  })

  // Join personal rooms for badge notifications
  if (socket.data.senderType === 'PORTAL_USER' && socket.data.portalUserId) {
    socket.join(`portal:${socket.data.portalUserId}`)
  } else if (socket.data.tenantId) {
    socket.join(`tenant:${socket.data.tenantId}`)
  }
})

server.listen(env.PORT, () => {
  console.log(`🚀 IventIA API running on http://localhost:${env.PORT}`)
  console.log(`   Environment: ${env.NODE_ENV}`)
})

export default app
