import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary'
import { auditService } from '../services/audit.service'
import { getUserDepartmentIds } from '../middleware/departmentScope'

async function buildVisibilityFilter(req: Request) {
  if (req.user!.role === 'ADMIN') return {}
  const deptIds = await getUserDepartmentIds(req)
  if (!deptIds || deptIds.length === 0) return { id: { in: [] } }
  return { departments: { some: { departmentId: { in: deptIds } } } }
}

export async function listCollabTaskDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const tenantId = req.user!.tenantId

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
      select: { id: true },
    })
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    const docs = await prisma.collabTaskDocument.findMany({
      where: { taskId },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: docs })
  } catch (err) {
    next(err)
  }
}

export async function uploadCollabTaskDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
      select: { id: true },
    })
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    if (!req.file) throw new AppError(400, 'NO_FILE', 'No file provided')

    const { url } = await uploadToCloudinary(req.file.buffer, 'iventia/collab-task-docs', 'auto')

    const doc = await prisma.collabTaskDocument.create({
      data: {
        taskId,
        tenantId,
        fileName: req.file.originalname,
        blobKey: url,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    })

    await auditService.log(tenantId, userId, 'CollabTaskDocument', doc.id, 'CREATE', null, {
      taskId,
      fileName: doc.fileName,
    }, req?.ip)

    res.status(201).json({ success: true, data: doc })
  } catch (err) {
    next(err)
  }
}

export async function deleteCollabTaskDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId, docId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
      select: { id: true },
    })
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    const doc = await prisma.collabTaskDocument.findFirst({
      where: { id: docId, taskId },
    })
    if (!doc) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found')

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(doc.blobKey)
    } catch (err) {
      console.error('Cloudinary deletion error:', err)
      // Don't fail if Cloudinary deletion fails
    }

    // Delete from DB
    await prisma.collabTaskDocument.delete({ where: { id: docId } })

    await auditService.log(tenantId, userId, 'CollabTaskDocument', docId, 'DELETE', doc, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
