import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

export async function listEventBudgets(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const budgets = await prisma.budget.findMany({
      where: { tenantId, eventId, isActive: true },
      include: {
        priceList: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: budgets })
  } catch (err) {
    next(err)
  }
}

export async function getBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId } = req.params
    const tenantId = req.user!.tenantId
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, tenantId },
      include: {
        priceList: { select: { id: true, name: true, isConceptList: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        lines: {
          include: {
            resource: {
              select: {
                id: true, code: true, name: true, type: true, unit: true,
                isPackage: true,
                packageComponents: {
                  include: {
                    componentResource: { select: { id: true, code: true, name: true, unit: true, type: true } }
                  },
                  orderBy: { sortOrder: 'asc' }
                }
              }
            },
            directOrders: {
              include: { order: { select: { id: true, orderNumber: true, total: true } } }
            },
            indirectOrders: {
              include: { order: { select: { id: true, orderNumber: true, total: true } } }
            },
            collabTasks: {
              include: { collabTask: { select: { id: true, title: true, status: true } } }
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')
    res.json({ success: true, data: budget })
  } catch (err) {
    next(err)
  }
}

const budgetSchema = z.object({
  name: z.string().min(1).max(200),
  priceListId: z.string().uuid(),
  notes: z.string().optional().nullable(),
})

export async function createBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const data = budgetSchema.parse(req.body)

    // Verify the event exists
    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento no encontrado')

    // Verify the price list is a concept list
    const priceList = await prisma.priceList.findFirst({
      where: { id: data.priceListId, tenantId, isConceptList: true },
      include: { items: { include: { resource: true }, where: { isActive: true } } }
    })
    if (!priceList) throw new AppError(404, 'PRICE_LIST_NOT_FOUND', 'Lista de conceptos no encontrada')

    const budget = await prisma.$transaction(async (tx) => {
      const b = await tx.budget.create({
        data: {
          tenantId,
          eventId,
          priceListId: data.priceListId,
          name: data.name,
          notes: data.notes ?? null,
          createdById: req.user!.userId,
        },
      })

      // Create a line for each item in the price list
      for (let i = 0; i < priceList.items.length; i++) {
        const item = priceList.items[i]
        await tx.budgetLine.create({
          data: {
            budgetId: b.id,
            resourceId: item.resourceId,
            description: item.resource.name,
            directCost: item.cost ?? 0,
            income: item.normalPrice,
            indirectCost: 0,
            utility: 0,
            sortOrder: i,
          },
        })
      }

      return b
    })

    await auditService.log(tenantId, req.user!.userId, 'Budget', budget.id, 'CREATE', null, { name: budget.name }, req?.ip)
    res.status(201).json({ success: true, data: budget })
  } catch (err) {
    next(err)
  }
}

const budgetLineSchema = z.object({
  directCost: z.number().min(0).optional(),
  income: z.number().min(0).optional(),
  indirectCost: z.number().min(0).optional(),
  utility: z.number().min(0).optional(),
  description: z.string().optional(),
})

export async function updateBudgetLine(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId } = req.params
    const tenantId = req.user!.tenantId
    const data = budgetLineSchema.parse(req.body)

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    const line = await prisma.budgetLine.update({
      where: { id: lineId },
      data,
    })
    res.json({ success: true, data: line })
  } catch (err) {
    next(err)
  }
}

export async function assignDirectOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId } = req.params
    const { orderId } = req.body
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    // Verify it's a budget order
    const order = await prisma.order.findFirst({ where: { id: orderId, tenantId, isBudgetOrder: true } })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Orden presupuestal no encontrada')

    await prisma.budgetLineDirectOrder.upsert({
      where: { budgetLineId_orderId: { budgetLineId: lineId, orderId } },
      create: { budgetLineId: lineId, orderId },
      update: {},
    })

    // Recalculate direct cost
    await recalcDirectCost(lineId)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function removeDirectOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId, orderId } = req.params
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    await prisma.budgetLineDirectOrder.deleteMany({ where: { budgetLineId: lineId, orderId } })
    await recalcDirectCost(lineId)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function assignIndirectOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId } = req.params
    const { orderId } = req.body
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    const order = await prisma.order.findFirst({ where: { id: orderId, tenantId, isBudgetOrder: true } })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Orden presupuestal no encontrada')

    await prisma.budgetLineIndirectOrder.upsert({
      where: { budgetLineId_orderId: { budgetLineId: lineId, orderId } },
      create: { budgetLineId: lineId, orderId },
      update: {},
    })

    await recalcIndirectCost(lineId)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function removeIndirectOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId, orderId } = req.params
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    await prisma.budgetLineIndirectOrder.deleteMany({ where: { budgetLineId: lineId, orderId } })
    await recalcIndirectCost(lineId)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

async function recalcDirectCost(lineId: string) {
  const orders = await prisma.budgetLineDirectOrder.findMany({
    where: { budgetLineId: lineId },
    include: { order: { select: { total: true } } },
  })
  const totalCost = orders.reduce((sum, o) => sum + Number(o.order.total), 0)
  await prisma.budgetLine.update({ where: { id: lineId }, data: { directCost: totalCost } })
}

async function recalcIndirectCost(lineId: string) {
  const orders = await prisma.budgetLineIndirectOrder.findMany({
    where: { budgetLineId: lineId },
    include: { order: { select: { total: true } } },
  })
  const totalCost = orders.reduce((sum, o) => sum + Number(o.order.total), 0)
  await prisma.budgetLine.update({ where: { id: lineId }, data: { indirectCost: totalCost } })
}

export async function assignCollabTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId } = req.params
    const { collabTaskId } = req.body
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    await prisma.collabTaskBudgetLine.upsert({
      where: { collabTaskId_budgetLineId: { collabTaskId, budgetLineId: lineId } },
      create: { collabTaskId, budgetLineId: lineId },
      update: {},
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function removeCollabTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId, lineId, taskId } = req.params
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    await prisma.collabTaskBudgetLine.deleteMany({ where: { collabTaskId: taskId, budgetLineId: lineId } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function deleteBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const { budgetId } = req.params
    const tenantId = req.user!.tenantId

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId } })
    if (!budget) throw new AppError(404, 'BUDGET_NOT_FOUND', 'Presupuesto no encontrado')

    await prisma.budget.update({ where: { id: budgetId }, data: { isActive: false } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
