import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary } from '../lib/storage'

// ── Supplier Portal (supplier-side) handlers ──────────────────────────────────

export async function supplierPortalListConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId } = req.supplierPortalUser!

    const conversations = await prisma.supplierConversation.findMany({
      where: { portalUserId: supplierPortalUserId },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        messages:  { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json({ success: true, data: conversations })
  } catch (err) { next(err) }
}

export async function supplierPortalGetConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId } = req.supplierPortalUser!
    const { id } = req.params

    const conv = await prisma.supplierConversation.findFirst({
      where: { id, portalUserId: supplierPortalUserId },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        messages:  { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conv) throw new AppError(404, 'NOT_FOUND', 'Conversación no encontrada')

    await prisma.supplierConversation.update({ where: { id }, data: { unreadPortal: 0 } })

    res.json({ success: true, data: conv })
  } catch (err) { next(err) }
}

export async function supplierPortalStartConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId, tenantId } = req.supplierPortalUser!

    const portalUser = await prisma.supplierPortalUser.findUnique({ where: { id: supplierPortalUserId } })
    const senderName = portalUser ? `${portalUser.firstName} ${portalUser.lastName}` : 'Proveedor'

    const { supplierId, subject, content } = req.body

    // Verify user is linked to this supplier
    const link = await prisma.supplierPortalUserSupplier.findFirst({
      where: { portalUserId: supplierPortalUserId, supplierId },
    })
    if (!link) throw new AppError(403, 'FORBIDDEN', 'Sin acceso a este proveedor')

    let conv = await prisma.supplierConversation.findFirst({
      where: { portalUserId: supplierPortalUserId, supplierId },
    })

    if (!conv) {
      conv = await prisma.supplierConversation.create({
        data: { tenantId, portalUserId: supplierPortalUserId, supplierId, subject: subject || null, unreadAdmin: 1 },
      })
    }

    const message = await prisma.supplierMessage.create({
      data: {
        conversationId: conv.id,
        senderType: 'SUPPLIER_PORTAL_USER',
        senderId: supplierPortalUserId,
        senderName,
        content,
      },
    })

    await prisma.supplierConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date(), unreadAdmin: { increment: 1 } },
    })

    res.json({ success: true, data: { conversation: conv, message } })
  } catch (err) { next(err) }
}

export async function supplierPortalSendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId } = req.supplierPortalUser!
    const { id } = req.params
    const { content, fileUrl, fileName } = req.body

    const conv = await prisma.supplierConversation.findFirst({ where: { id, portalUserId: supplierPortalUserId } })
    if (!conv) throw new AppError(404, 'NOT_FOUND', 'Conversación no encontrada')

    const portalUser = await prisma.supplierPortalUser.findUnique({ where: { id: supplierPortalUserId } })
    const senderName = portalUser ? `${portalUser.firstName} ${portalUser.lastName}` : 'Proveedor'

    const message = await prisma.supplierMessage.create({
      data: {
        conversationId: id,
        senderType: 'SUPPLIER_PORTAL_USER',
        senderId: supplierPortalUserId,
        senderName,
        content,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      },
    })

    await prisma.supplierConversation.update({
      where: { id },
      data: { updatedAt: new Date(), unreadAdmin: { increment: 1 } },
    })

    res.json({ success: true, data: message })
  } catch (err) { next(err) }
}

export async function supplierPortalUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierPortalUserId } = req.supplierPortalUser!

    const result = await prisma.supplierConversation.aggregate({
      where: { portalUserId: supplierPortalUserId },
      _sum: { unreadPortal: true },
    })

    res.json({ success: true, data: { unread: result._sum.unreadPortal ?? 0 } })
  } catch (err) { next(err) }
}

export async function supplierPortalUploadChatFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió archivo')
    const { url: fileUrl } = await uploadToCloudinary(req.file.buffer, 'iventia/supplier-chat', 'auto')
    const fileName = req.file.originalname
    res.json({ success: true, data: { fileUrl, fileName } })
  } catch (err) { next(err) }
}

// ── Admin-side handlers ───────────────────────────────────────────────────────

export async function listSupplierConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!

    const conversations = await prisma.supplierConversation.findMany({
      where: { tenantId },
      include: {
        portalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        supplier:   { select: { id: true, name: true, code: true } },
        messages:   { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json({ success: true, data: conversations })
  } catch (err) { next(err) }
}

export async function getSupplierConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!
    const { id } = req.params

    const conv = await prisma.supplierConversation.findFirst({
      where: { id, tenantId },
      include: {
        portalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        supplier:   { select: { id: true, name: true, code: true } },
        messages:   { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conv) throw new AppError(404, 'NOT_FOUND', 'Conversación no encontrada')

    await prisma.supplierConversation.update({ where: { id }, data: { unreadAdmin: 0 } })

    res.json({ success: true, data: conv })
  } catch (err) { next(err) }
}

export async function sendAdminMessageToSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, userId } = req.user!
    const { id } = req.params
    const { content, fileUrl, fileName } = req.body

    const conv = await prisma.supplierConversation.findFirst({ where: { id, tenantId } })
    if (!conv) throw new AppError(404, 'NOT_FOUND', 'Conversación no encontrada')

    const adminUser  = await prisma.user.findUnique({ where: { id: userId } })
    const senderName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin'

    const message = await prisma.supplierMessage.create({
      data: {
        conversationId: id,
        senderType: 'ADMIN',
        senderId: userId,
        senderName,
        content,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      },
    })

    await prisma.supplierConversation.update({
      where: { id },
      data: { updatedAt: new Date(), unreadPortal: { increment: 1 } },
    })

    res.json({ success: true, data: message })
  } catch (err) { next(err) }
}
