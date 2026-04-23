import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'
import { getUserDepartmentIds } from '../middleware/departmentScope'

const priceListSchema = z.object({
  name: z.string().min(1).max(200),
  earlyCutoff: z.string().datetime().optional(),
  normalCutoff: z.string().datetime().optional(),
  discountPct: z.number().min(0).max(100).default(0),
})

const priceListItemSchema = z.object({
  resourceId: z.string().uuid(),
  earlyPrice: z.number().min(0),
  normalPrice: z.number().min(0),
  latePrice: z.number().min(0),
  timeUnit: z.enum(['no aplica', 'horas', 'días']).optional().nullable(),
  detail: z.string().optional().nullable(),
})

export async function listPriceLists(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const priceLists = await prisma.priceList.findMany({
      where: { tenantId },
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: priceLists })
  } catch (err) {
    next(err)
  }
}

export async function getPriceList(req: Request, res: Response, next: NextFunction) {
  try {
    // Server-side department scoping: non-admin users see their departments + unassigned resources
    const deptIds = await getUserDepartmentIds(req)

    const itemWhere: any = { isActive: true }
    if (deptIds !== null) {
      itemWhere.resource = { OR: [{ departmentId: { in: deptIds } }, { departmentId: null }] }
    }

    const priceList = await prisma.priceList.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        items: {
          include: {
            resource: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                unit: true,
                factor: true,
                isPackage: true,
                checkDuplicate: true,
                department: { select: { id: true, name: true } },
                packageComponents: {
                  select: {
                    id: true,
                    componentResourceId: true,
                    quantity: true,
                    sortOrder: true,
                    componentResource: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        unit: true,
                        isPackage: true,
                        isSubstitute: true,
                      },
                    },
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          where: itemWhere,
          orderBy: { resource: { name: 'asc' } },
        },
      },
    })
    if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')
    res.json({ success: true, data: priceList })
  } catch (err) {
    next(err)
  }
}

export async function createPriceList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceListSchema.parse(req.body)
    const tenantId = req.user!.tenantId
    const priceList = await prisma.priceList.create({
      data: {
        ...data,
        tenantId,
        earlyCutoff: data.earlyCutoff ? new Date(data.earlyCutoff) : undefined,
        normalCutoff: data.normalCutoff ? new Date(data.normalCutoff) : undefined,
      },
    })

    await auditService.log(tenantId, req.user!.userId, 'PriceList', priceList.id, 'CREATE', null, {
      name: priceList.name,
      discountPct: priceList.discountPct,
    }, req?.ip)

    res.status(201).json({ success: true, data: priceList })
  } catch (err) {
    next(err)
  }
}

export async function updatePriceList(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceListSchema.partial().parse(req.body)
    const tenantId = req.user!.tenantId
    const priceList = await prisma.priceList.findFirst({
      where: { id: req.params.id, tenantId },
    })
    if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')
    const updated = await prisma.priceList.update({
      where: { id: req.params.id },
      data: {
        ...data,
        earlyCutoff: data.earlyCutoff ? new Date(data.earlyCutoff) : undefined,
        normalCutoff: data.normalCutoff ? new Date(data.normalCutoff) : undefined,
      },
    })

    await auditService.log(tenantId, req.user!.userId, 'PriceList', req.params.id, 'UPDATE',
      { name: priceList.name, discountPct: priceList.discountPct },
      { name: updated.name, discountPct: updated.discountPct },
      req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function upsertPriceListItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = priceListItemSchema.parse(req.body)
    const priceList = await prisma.priceList.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')

    const { resourceId, ...itemData } = data
    const item = await prisma.priceListItem.upsert({
      where: { priceListId_resourceId: { priceListId: req.params.id, resourceId } },
      create: { priceListId: req.params.id, resourceId, ...itemData },
      update: itemData,
    })
    res.json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}

export async function removePriceListItem(req: Request, res: Response, next: NextFunction) {
  try {
    const priceList = await prisma.priceList.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')

    await prisma.priceListItem.update({
      where: { priceListId_resourceId: { priceListId: req.params.id, resourceId: req.params.resourceId } },
      data: { isActive: false },
    })
    res.json({ success: true, data: { message: 'Item removed from price list' } })
  } catch (err) {
    next(err)
  }
}

const importRowSchema = z.object({
  resourceCode: z.string().min(1),
  earlyPrice: z.number().min(0),
  normalPrice: z.number().min(0),
  latePrice: z.number().min(0),
  timeUnit: z.enum(['no aplica', 'horas', 'días']),
})

export async function importPriceListItems(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const priceList = await prisma.priceList.findFirst({
      where: { id: req.params.id, tenantId },
    })
    if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Price list not found')

    const rows = z.array(importRowSchema).parse(req.body.rows)

    // Validate all resource codes exist
    const codes = rows.map(r => r.resourceCode)
    const resources = await prisma.resource.findMany({
      where: { tenantId, code: { in: codes }, isActive: true },
    })
    const resourceMap = new Map(resources.map(r => [r.code, r]))

    const missing = codes.filter(c => !resourceMap.has(c))
    if (missing.length > 0) {
      throw new AppError(400, 'INVALID_RESOURCES', `Recursos no encontrados: ${missing.join(', ')}`)
    }

    // Replace all items in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.priceListItem.deleteMany({ where: { priceListId: req.params.id } })
      await tx.priceListItem.createMany({
        data: rows.map(r => ({
          priceListId: req.params.id,
          resourceId: resourceMap.get(r.resourceCode)!.id,
          earlyPrice: r.earlyPrice,
          normalPrice: r.normalPrice,
          latePrice: r.latePrice,
          timeUnit: r.timeUnit,
        })),
      })
    })

    res.json({ success: true, data: { imported: rows.length } })
  } catch (err) {
    next(err)
  }
}
