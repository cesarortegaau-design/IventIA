import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary'
import { auditService } from '../services/audit.service'

const SLOT_FIELDS: Record<string, 'imageMain' | 'imageDesc' | 'imageExtra'> = {
  main: 'imageMain',
  desc: 'imageDesc',
  extra: 'imageExtra',
}

const resourceSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.enum(['CONSUMABLE', 'EQUIPMENT', 'SPACE', 'FURNITURE', 'SERVICE', 'DISCOUNT', 'TAX']),
  description: z.string().optional(),
  unit: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  stockLocation: z.string().optional(),
  checkStock: z.boolean().default(false),
  checkDuplicate: z.boolean().default(false),
  recoveryTime: z.number().int().min(0).default(0),
  areaSqm: z.number().optional(),
  capacity: z.number().int().optional(),
  departmentId: z.string().uuid().optional(),
  portalVisible: z.boolean().default(false),
  portalDesc: z.string().optional(),
})

export async function listResources(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, active, search, page = '1', pageSize = '20' } = req.query as Record<string, string>
    const tenantId = req.user!.tenantId

    const where: any = { tenantId }
    if (type) where.type = type
    if (active !== undefined) where.isActive = active === 'true'
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const p = parseInt(page), ps = parseInt(pageSize)
    const [total, resources] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: { department: { select: { id: true, name: true } } },
      }),
    ])

    res.json({ success: true, data: resources, meta: { total, page: p, pageSize: ps } })
  } catch (err) {
    next(err)
  }
}

export async function getResource(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: { department: true },
    })
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')
    res.json({ success: true, data: resource })
  } catch (err) {
    next(err)
  }
}

export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resourceSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const exists = await prisma.resource.findFirst({ where: { tenantId, code: data.code } })
    if (exists) throw new AppError(409, 'DUPLICATE_CODE', 'Resource code already exists')

    const resource = await prisma.resource.create({ data: { ...data, tenantId } })

    await auditService.log(tenantId, req.user!.userId, 'Resource', resource.id, 'CREATE', null, {
      code: resource.code,
      name: resource.name,
      type: resource.type,
      description: resource.description,
      stock: resource.stock,
      isActive: resource.isActive,
    }, req?.ip)

    res.status(201).json({ success: true, data: resource })
  } catch (err) {
    next(err)
  }
}

export async function updateResource(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resourceSchema.partial().parse(req.body)
    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')

    const updated = await prisma.resource.update({ where: { id: req.params.id }, data })

    const oldValues: any = {
      code: resource.code,
      name: resource.name,
      type: resource.type,
      description: resource.description,
      stock: resource.stock,
      isActive: resource.isActive,
    }
    const newValues: any = {
      code: updated.code,
      name: updated.name,
      type: updated.type,
      description: updated.description,
      stock: updated.stock,
      isActive: updated.isActive,
    }

    await auditService.log(req.user!.tenantId, req.user!.userId, 'Resource', req.params.id, 'UPDATE', oldValues, newValues, req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function toggleResourceActive(req: Request, res: Response, next: NextFunction) {
  try {
    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')

    const updated = await prisma.resource.update({
      where: { id: req.params.id },
      data: { isActive: !resource.isActive },
    })

    await auditService.log(req.user!.tenantId, req.user!.userId, 'Resource', req.params.id, 'UPDATE',
      { isActive: resource.isActive },
      { isActive: updated.isActive },
      req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function uploadResourceImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, slot } = req.params
    const field = SLOT_FIELDS[slot]
    if (!field) throw new AppError(400, 'INVALID_SLOT', 'Slot must be main, desc or extra')

    const resource = await prisma.resource.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    })
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')

    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió ningún archivo')

    // Delete old image from Cloudinary if it was a cloud URL
    const oldPath = (resource as any)[field] as string | null
    if (oldPath?.includes('cloudinary.com')) {
      await deleteFromCloudinary(oldPath, 'image')
    }

    const { url: imageUrl } = await uploadToCloudinary(req.file.buffer, 'iventia/resources', 'image')
    const updated = await prisma.resource.update({
      where: { id },
      data: { [field]: imageUrl },
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteResourceImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, slot } = req.params
    const field = SLOT_FIELDS[slot]
    if (!field) throw new AppError(400, 'INVALID_SLOT', 'Slot must be main, desc or extra')

    const resource = await prisma.resource.findFirst({
      where: { id, tenantId: req.user!.tenantId },
    })
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')

    const oldPath = (resource as any)[field] as string | null
    if (oldPath?.includes('cloudinary.com')) {
      await deleteFromCloudinary(oldPath, 'image')
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { [field]: null },
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
