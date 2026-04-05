import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary'
import { auditService } from '../services/audit.service'

// ── Event Documents ────────────────────────────────────────────────────────────

export async function uploadEventDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió ningún archivo')

    const documentType = (req.body.documentType as string) || 'GENERAL'
    const { url } = await uploadToCloudinary(req.file.buffer, 'iventia/event-docs', 'auto')

    const doc = await prisma.eventDocument.create({
      data: {
        eventId: id,
        documentType,
        fileName: req.file.originalname,
        blobKey: url,
        uploadedById: userId,
      },
    })

    await auditService.log(tenantId, userId, 'EventDocument', doc.id, 'CREATE', null, {
      documentType,
      fileName: doc.fileName,
      fileSize: req.file.size,
    }, req?.ip)

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export async function deleteEventDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, docId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const doc = await prisma.eventDocument.findFirst({ where: { id: docId, eventId: id } })
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado')

    if (doc.blobKey?.includes('cloudinary.com')) {
      await deleteFromCloudinary(doc.blobKey, 'auto')
    }
    await prisma.eventDocument.delete({ where: { id: docId } })

    await auditService.log(tenantId, req.user!.userId, 'EventDocument', docId, 'DELETE', {
      documentType: doc.documentType,
      fileName: doc.fileName,
    }, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ── Client Documents ───────────────────────────────────────────────────────────

export async function uploadClientDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const client = await prisma.client.findFirst({ where: { id, tenantId } })
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Cliente no encontrado')
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió ningún archivo')

    const documentType = (req.body.documentType as string) || 'GENERAL'
    const { url } = await uploadToCloudinary(req.file.buffer, 'iventia/client-docs', 'auto')

    const doc = await prisma.clientDocument.create({
      data: {
        clientId: id,
        documentType,
        fileName: req.file.originalname,
        blobKey: url,
        uploadedById: userId,
      },
    })

    await auditService.log(tenantId, userId, 'ClientDocument', doc.id, 'CREATE', null, {
      documentType,
      fileName: doc.fileName,
      fileSize: req.file.size,
    }, req?.ip)

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export async function deleteClientDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, docId } = req.params
    const tenantId = req.user!.tenantId

    const client = await prisma.client.findFirst({ where: { id, tenantId } })
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Cliente no encontrado')

    const doc = await prisma.clientDocument.findFirst({ where: { id: docId, clientId: id } })
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado')

    if (doc.blobKey?.includes('cloudinary.com')) {
      await deleteFromCloudinary(doc.blobKey, 'auto')
    }
    await prisma.clientDocument.delete({ where: { id: docId } })

    await auditService.log(tenantId, req.user!.userId, 'ClientDocument', docId, 'DELETE', {
      documentType: doc.documentType,
      fileName: doc.fileName,
    }, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ── Order Documents ────────────────────────────────────────────────────────────

export async function uploadOrderDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const order = await prisma.order.findFirst({ where: { id, tenantId } })
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió ningún archivo')

    const documentType = (req.body.documentType as string) || 'GENERAL'
    const { url } = await uploadToCloudinary(req.file.buffer, 'iventia/order-docs', 'auto')

    const doc = await prisma.orderDocument.create({
      data: {
        orderId: id,
        documentType,
        fileName: req.file.originalname,
        blobKey: url,
        uploadedById: userId,
      },
    })

    await auditService.log(tenantId, userId, 'OrderDocument', doc.id, 'CREATE', null, {
      documentType,
      fileName: doc.fileName,
      fileSize: req.file.size,
    }, req?.ip)

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export async function deleteOrderDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, docId } = req.params
    const tenantId = req.user!.tenantId

    const order = await prisma.order.findFirst({ where: { id, tenantId } })
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')

    const doc = await prisma.orderDocument.findFirst({ where: { id: docId, orderId: id } })
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado')

    if (doc.blobKey?.includes('cloudinary.com')) {
      await deleteFromCloudinary(doc.blobKey, 'auto')
    }
    await prisma.orderDocument.delete({ where: { id: docId } })

    await auditService.log(tenantId, req.user!.userId, 'OrderDocument', docId, 'DELETE', {
      documentType: doc.documentType,
      fileName: doc.fileName,
    }, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
