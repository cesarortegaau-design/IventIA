import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as classService from '../services/gallery-class.service'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

// Helper to get tenant ID from auth or query, default to first tenant
async function getTenantId(req: Request): Promise<string> {
  if (req.user?.tenantId) return req.user.tenantId
  if (req.query.tenantId) return req.query.tenantId as string
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) throw new AppError(400, 'NO_TENANT', 'No tenant found')
  return tenant.id
}

const createClassSchema = z.object({
  instructorId: z.string().min(1),
  locationId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  schedule: z.record(z.any()),
  capacity: z.number().int().positive().optional(),
})

const enrollSchema = z.object({
  classId: z.string().min(1),
})

export async function createClass(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const data = createClassSchema.parse(req.body)

    const galleryClass = await classService.createClass({ ...data, tenantId })

    res.status(201).json({
      success: true,
      data: galleryClass,
    })
  } catch (error) {
    next(error)
  }
}

export async function listClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req)
    const { locationId } = req.query

    const classes = await classService.listClasses(tenantId, locationId as string | undefined)

    res.json({
      success: true,
      data: classes,
    })
  } catch (error) {
    next(error)
  }
}

export async function getClassDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req)
    const { id } = req.params

    const galleryClass = await classService.getClassDetails(id, tenantId)

    res.json({
      success: true,
      data: galleryClass,
    })
  } catch (error) {
    next(error)
  }
}

export async function enrollInClass(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.id
    const data = enrollSchema.parse(req.body)

    const enrollment = await classService.enrollInClass(userId, data.classId, tenantId)

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in class',
    })
  } catch (error) {
    next(error)
  }
}

export async function getUserClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.id

    const classes = await classService.getUserClasses(userId, tenantId)

    res.json({
      success: true,
      data: classes,
    })
  } catch (error) {
    next(error)
  }
}

export async function cancelEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { enrollmentId } = req.params

    await classService.cancelEnrollment(enrollmentId, tenantId)

    res.json({
      success: true,
      message: 'Enrollment cancelled',
    })
  } catch (error) {
    next(error)
  }
}
