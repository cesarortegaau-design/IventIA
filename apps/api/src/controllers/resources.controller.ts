import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary'
import { auditService } from '../services/audit.service'

import { deptFilterForResource } from '../middleware/departmentScope'

const SLOT_FIELDS: Record<string, 'imageMain' | 'imageDesc' | 'imageExtra'> = {
  main: 'imageMain',
  desc: 'imageDesc',
  extra: 'imageExtra',
}

const packageComponentSchema = z.object({
  componentResourceId: z.string().uuid('componentResourceId debe ser un UUID válido'),
  quantity: z.number().positive('quantity debe ser mayor a 0'),
  sortOrder: z.number().int().nonnegative().default(0),
})

const resourceBaseSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.enum(['CONSUMABLE', 'EQUIPMENT', 'SPACE', 'FURNITURE', 'SERVICE', 'DISCOUNT', 'TAX', 'PERSONAL']),
  description: z.string().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  factor: z.coerce.number().positive().default(1).nullable().transform(v => v ?? 1),
  stock: z.coerce.number().int().min(0).default(0).nullable().transform(v => v ?? 0),
  stockLocation: z.string().optional().nullable(),
  checkStock: z.boolean().default(false),
  checkDuplicate: z.boolean().default(true),
  recoveryTime: z.coerce.number().int().min(0).default(0).nullable().transform(v => v ?? 0),
  areaSqm: z.coerce.number().optional().nullable(),
  capacity: z.coerce.number().int().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  portalVisible: z.boolean().default(false),
  portalDesc: z.string().optional().nullable(),
  isPackage: z.boolean().default(false),
  isSubstitute: z.boolean().default(false),
  packageComponents: z.array(packageComponentSchema).optional(),
})

const resourceSchema = resourceBaseSchema.refine(
  (data) => {
    if (data.isSubstitute && !data.isPackage) {
      return false
    }
    return true
  },
  {
    message: 'isSubstitute solo se puede usar si isPackage es true',
    path: ['isSubstitute'],
  }
)

export async function listResources(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, active, search, page = '1', pageSize = '20' } = req.query as Record<string, string>
    const tenantId = req.user!.tenantId

    const deptFilter = await deptFilterForResource(req)
    const where: any = { tenantId, ...deptFilter }
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
    const deptFilter = await deptFilterForResource(req)
    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, ...deptFilter },
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
    const { packageComponents, departmentId, ...data } = resourceSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const exists = await prisma.resource.findFirst({ where: { tenantId, code: data.code } })
    if (exists) throw new AppError(409, 'DUPLICATE_CODE', 'Resource code already exists')

    const resource = await prisma.resource.create({
      data: {
        ...data,
        tenantId,
        departmentId: departmentId || undefined,
      } as any,
    })

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
    const { packageComponents, ...data } = resourceBaseSchema.partial().parse(req.body)
    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!resource) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found')

    const updated = await prisma.resource.update({
      where: { id: req.params.id },
      data,
      include: { department: { select: { id: true, name: true } } },
    })

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

// ─── Package Components ────────────────────────────────────────────────────────

export async function getPackageComponents(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const tenantId = req.user!.tenantId

    const packageResource = await prisma.resource.findFirst({
      where: { id, tenantId },
    })

    if (!packageResource) {
      return next(new AppError(404, 'RESOURCE_NOT_FOUND', 'Recurso no encontrado'))
    }

    if (!packageResource.isPackage) {
      return next(new AppError(400, 'NOT_A_PACKAGE', 'El recurso no es un paquete'))
    }

    const components = await prisma.packageComponent.findMany({
      where: { packageResourceId: id },
      include: {
        componentResource: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            isPackage: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    res.json({
      success: true,
      data: {
        packageResourceId: id,
        isPackage: packageResource.isPackage,
        isSubstitute: packageResource.isSubstitute,
        components,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function addPackageComponent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const tenantId = req.user!.tenantId

    const parsedData = packageComponentSchema.parse(req.body)

    const packageResource = await prisma.resource.findFirst({
      where: { id, tenantId },
    })

    if (!packageResource) {
      return next(new AppError(404, 'RESOURCE_NOT_FOUND', 'Recurso padre no encontrado'))
    }

    if (!packageResource.isPackage) {
      return next(new AppError(400, 'NOT_A_PACKAGE', 'El recurso no es un paquete'))
    }

    const componentResource = await prisma.resource.findFirst({
      where: { id: parsedData.componentResourceId, tenantId },
    })

    if (!componentResource) {
      return next(new AppError(404, 'COMPONENT_NOT_FOUND', 'Recurso componente no encontrado'))
    }

    // Evitar referencias cíclicas: un paquete no puede contenerse a sí mismo
    if (parsedData.componentResourceId === id) {
      return next(new AppError(400, 'CIRCULAR_REFERENCE', 'Un paquete no puede contenerse a sí mismo'))
    }

    // Evitar duplicados
    const existing = await prisma.packageComponent.findUnique({
      where: {
        packageResourceId_componentResourceId: {
          packageResourceId: id,
          componentResourceId: parsedData.componentResourceId,
        },
      },
    })

    if (existing) {
      return next(new AppError(409, 'DUPLICATE_COMPONENT', 'Este componente ya está en el paquete'))
    }

    const component = await prisma.packageComponent.create({
      data: {
        packageResourceId: id,
        componentResourceId: parsedData.componentResourceId,
        quantity: new Decimal(parsedData.quantity),
        sortOrder: parsedData.sortOrder ?? 0,
      },
      include: {
        componentResource: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            isPackage: true,
          },
        },
      },
    })

    await auditService.log(
      tenantId,
      req.user!.userId,
      'PackageComponent',
      component.id,
      'CREATE',
      null,
      {
        packageResourceId: component.packageResourceId,
        componentResourceId: component.componentResourceId,
        quantity: component.quantity.toString(),
      },
      req?.ip
    )

    res.status(201).json({ success: true, data: component })
  } catch (err) {
    if (err instanceof ZodError) {
      return next(new AppError(400, 'VALIDATION_ERROR', err.errors[0].message))
    }
    next(err)
  }
}

export async function removePackageComponent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, componentId } = req.params
    const tenantId = req.user!.tenantId

    const packageResource = await prisma.resource.findFirst({
      where: { id, tenantId },
    })

    if (!packageResource) {
      return next(new AppError(404, 'RESOURCE_NOT_FOUND', 'Recurso padre no encontrado'))
    }

    const component = await prisma.packageComponent.findUnique({
      where: {
        packageResourceId_componentResourceId: {
          packageResourceId: id,
          componentResourceId: componentId,
        },
      },
    })

    if (!component) {
      return next(new AppError(404, 'COMPONENT_NOT_FOUND', 'Componente no encontrado en este paquete'))
    }

    await prisma.packageComponent.delete({
      where: {
        packageResourceId_componentResourceId: {
          packageResourceId: id,
          componentResourceId: componentId,
        },
      },
    })

    await auditService.log(
      tenantId,
      req.user!.userId,
      'PackageComponent',
      component.id,
      'DELETE',
      {
        packageResourceId: component.packageResourceId,
        componentResourceId: component.componentResourceId,
        quantity: component.quantity.toString(),
      },
      null,
      req?.ip
    )

    res.json({ success: true, message: 'Componente removido del paquete' })
  } catch (err) {
    next(err)
  }
}

export async function updatePackageComponent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, componentId } = req.params
    const tenantId = req.user!.tenantId
    const { quantity, sortOrder } = req.body

    const packageResource = await prisma.resource.findFirst({
      where: { id, tenantId },
    })

    if (!packageResource) {
      return next(new AppError(404, 'RESOURCE_NOT_FOUND', 'Recurso padre no encontrado'))
    }

    const component = await prisma.packageComponent.findUnique({
      where: {
        packageResourceId_componentResourceId: {
          packageResourceId: id,
          componentResourceId: componentId,
        },
      },
    })

    if (!component) {
      return next(new AppError(404, 'COMPONENT_NOT_FOUND', 'Componente no encontrado en este paquete'))
    }

    const updateData: any = {}
    if (quantity !== undefined) {
      if (quantity <= 0) {
        return next(new AppError(400, 'INVALID_QUANTITY', 'La cantidad debe ser mayor a 0'))
      }
      updateData.quantity = new Decimal(quantity)
    }
    if (sortOrder !== undefined) {
      if (sortOrder < 0) {
        return next(new AppError(400, 'INVALID_SORT_ORDER', 'El orden debe ser no negativo'))
      }
      updateData.sortOrder = sortOrder
    }

    const updated = await prisma.packageComponent.update({
      where: {
        packageResourceId_componentResourceId: {
          packageResourceId: id,
          componentResourceId: componentId,
        },
      },
      data: updateData,
      include: {
        componentResource: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            isPackage: true,
          },
        },
      },
    })

    await auditService.log(
      tenantId,
      req.user!.userId,
      'PackageComponent',
      component.id,
      'UPDATE',
      {
        quantity: component.quantity.toString(),
        sortOrder: component.sortOrder,
      },
      {
        quantity: updated.quantity.toString(),
        sortOrder: updated.sortOrder,
      },
      req?.ip
    )

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
