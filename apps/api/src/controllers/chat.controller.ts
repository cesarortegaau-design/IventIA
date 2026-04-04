import path from 'path'
import fs from 'fs'
import { Request, Response } from 'express'
import { prisma } from '../config/database'

export async function uploadChatFile(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const fileUrl  = `/uploads/chat/${req.file.filename}`
  const fileName = req.file.originalname
  res.json({ fileUrl, fileName })
}

// ── Admin handlers ────────────────────────────────────────────────────────────

export async function listConversations(req: Request, res: Response) {
  const tenantId = req.user!.tenantId
  const conversations = await prisma.conversation.findMany({
    where: { tenantId },
    include: {
      portalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      event:      { select: { id: true, name: true, code: true } },
      messages:   { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(conversations)
}

export async function getConversation(req: Request, res: Response) {
  const tenantId = req.user!.tenantId
  const { id } = req.params
  const conv = await prisma.conversation.findFirst({
    where: { id, tenantId },
    include: {
      portalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      event:      { select: { id: true, name: true, code: true } },
      messages:   { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!conv) return res.status(404).json({ error: 'Not found' })
  await prisma.conversation.update({ where: { id }, data: { unreadAdmin: 0 } })
  res.json(conv)
}

export async function sendAdminMessage(req: Request, res: Response) {
  const tenantId = req.user!.tenantId
  const senderId = req.user!.userId
  const { id }   = req.params
  const { content, fileUrl, fileName } = req.body

  const adminUser  = await prisma.user.findUnique({ where: { id: senderId } })
  const senderName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin'

  const conv = await prisma.conversation.findFirst({ where: { id, tenantId } })
  if (!conv) return res.status(404).json({ error: 'Not found' })

  const message = await prisma.message.create({
    data: { conversationId: id, senderType: 'ADMIN', senderId, senderName, content, fileUrl: fileUrl || null, fileName: fileName || null },
  })
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date(), unreadPortal: { increment: 1 } },
  })
  res.json(message)
}

export async function adminStartConversation(req: Request, res: Response) {
  const tenantId = req.user!.tenantId
  const senderId = req.user!.userId
  const { portalUserId, eventId, subject, content } = req.body

  const portalUser = await prisma.portalUser.findFirst({ where: { id: portalUserId, tenantId } })
  if (!portalUser) return res.status(404).json({ error: 'Portal user not found' })

  let conv = eventId
    ? await prisma.conversation.findFirst({ where: { portalUserId, eventId } })
    : null

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { tenantId, portalUserId, eventId: eventId || null, subject: subject || null, unreadPortal: 1 },
    })
  }

  const adminUser  = await prisma.user.findUnique({ where: { id: senderId } })
  const senderName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin'

  const message = await prisma.message.create({
    data: { conversationId: conv.id, senderType: 'ADMIN', senderId, senderName, content },
  })
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date(), unreadPortal: { increment: 1 } },
  })
  res.json({ conversation: conv, message })
}

export async function adminUnreadCount(req: Request, res: Response) {
  const tenantId = req.user!.tenantId
  const result = await prisma.conversation.aggregate({
    where: { tenantId },
    _sum: { unreadAdmin: true },
  })
  res.json({ unread: result._sum.unreadAdmin ?? 0 })
}

// ── Portal handlers ───────────────────────────────────────────────────────────

export async function portalListConversations(req: Request, res: Response) {
  const portalUserId = req.portalUser!.portalUserId
  const conversations = await prisma.conversation.findMany({
    where: { portalUserId },
    include: {
      event:    { select: { id: true, name: true, code: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(conversations)
}

export async function portalGetConversation(req: Request, res: Response) {
  const portalUserId = req.portalUser!.portalUserId
  const { id } = req.params
  const conv = await prisma.conversation.findFirst({
    where: { id, portalUserId },
    include: {
      event:    { select: { id: true, name: true, code: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!conv) return res.status(404).json({ error: 'Not found' })
  await prisma.conversation.update({ where: { id }, data: { unreadPortal: 0 } })
  res.json(conv)
}

export async function portalStartConversation(req: Request, res: Response) {
  const portalUserId = req.portalUser!.portalUserId
  const tenantId     = req.portalUser!.tenantId
  const portalUser   = await prisma.portalUser.findUnique({ where: { id: portalUserId } })
  const senderName   = portalUser ? `${portalUser.firstName} ${portalUser.lastName}` : 'Expositor'

  const { eventId, subject, content } = req.body

  let conv = eventId
    ? await prisma.conversation.findFirst({ where: { portalUserId, eventId } })
    : null

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { tenantId, portalUserId, eventId: eventId || null, subject: subject || null, unreadAdmin: 1 },
    })
  }

  const message = await prisma.message.create({
    data: { conversationId: conv.id, senderType: 'PORTAL_USER', senderId: portalUserId, senderName, content },
  })
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date(), unreadAdmin: { increment: 1 } },
  })
  res.json({ conversation: conv, message })
}

export async function portalSendMessage(req: Request, res: Response) {
  const portalUserId = req.portalUser!.portalUserId
  const { id }       = req.params
  const { content, fileUrl, fileName } = req.body

  const conv = await prisma.conversation.findFirst({ where: { id, portalUserId } })
  if (!conv) return res.status(404).json({ error: 'Not found' })

  const portalUser = await prisma.portalUser.findUnique({ where: { id: portalUserId } })
  const senderName = portalUser ? `${portalUser.firstName} ${portalUser.lastName}` : 'Expositor'

  const message = await prisma.message.create({
    data: { conversationId: id, senderType: 'PORTAL_USER', senderId: portalUserId, senderName, content, fileUrl: fileUrl || null, fileName: fileName || null },
  })
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date(), unreadAdmin: { increment: 1 } },
  })
  res.json(message)
}

export async function portalUnreadCount(req: Request, res: Response) {
  const portalUserId = req.portalUser!.portalUserId
  const result = await prisma.conversation.aggregate({
    where: { portalUserId },
    _sum: { unreadPortal: true },
  })
  res.json({ unread: result._sum.unreadPortal ?? 0 })
}
