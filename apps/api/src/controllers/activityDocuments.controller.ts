import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/storage'
import { auditService } from '../services/audit.service'

export async function listActivityDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, activityId } = req.params
    const tenantId = req.user!.tenantId

    const activity = await prisma.eventActivity.findFirst({
      where: { id: activityId, eventId, tenantId },
      select: { id: true },
    })
    if (!activity) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found')

    const docs = await prisma.eventActivityDocument.findMany({
      where:   { activityId },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: docs })
  } catch (err) {
    next(err)
  }
}

export async function uploadActivityDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, activityId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const activity = await prisma.eventActivity.findFirst({
      where: { id: activityId, eventId, tenantId },
      select: { id: true },
    })
    if (!activity) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found')

    if (!req.file) throw new AppError(400, 'NO_FILE', 'No file provided')

    const { url } = await uploadToCloudinary(req.file.buffer, 'iventia/activity-docs', 'auto')

    const doc = await prisma.eventActivityDocument.create({
      data: {
        activityId,
        tenantId,
        fileName:     req.file.originalname,
        blobKey:      url,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    })

    await auditService.log(tenantId, userId, 'EventActivityDocument', doc.id, 'CREATE', null, {
      activityId, fileName: doc.fileName,
    }, req?.ip)

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export async function deleteActivityDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, activityId, docId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const doc = await prisma.eventActivityDocument.findFirst({
      where: { id: docId, activityId, tenantId },
    })
    if (!doc) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found')

    await deleteFromCloudinary(doc.blobKey)

    await prisma.eventActivityDocument.delete({ where: { id: docId } })

    await auditService.log(tenantId, userId, 'EventActivityDocument', docId, 'DELETE', {
      activityId, fileName: doc.fileName,
    }, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
