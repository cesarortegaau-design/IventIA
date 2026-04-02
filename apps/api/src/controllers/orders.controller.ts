import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import * as orderService from '../services/order.service'

const createOrderSchema = z.object({
  clientId: z.string().min(1),
  billingClientId: z.string().min(1).optional(),
  standId: z.string().min(1).optional(),
  priceListId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  isCreditNote: z.boolean().default(false),
  originalOrderId: z.string().min(1).optional(),
  lineItems: z.array(z.object({
    resourceId: z.string().min(1),
    quantity: z.number().positive(),
    discountPct: z.number().min(0).max(100).default(0),
    observations: z.string().optional(),
    sortOrder: z.number().int().optional(),
  })).min(1),
})

const addPaymentSchema = z.object({
  method: z.enum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'CHECK', 'SWIFT']),
  amount: z.number().positive(),
  paymentDate: z.string().datetime(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function listOrdersForEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const orders = await prisma.order.findMany({
      where: { eventId, tenantId },
      include: {
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        stand: { select: { id: true, code: true } },
        _count: { select: { lineItems: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        client: true,
        billingClient: true,
        stand: true,
        priceList: true,
        lineItems: { include: { resource: true }, orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
        originalOrder: { select: { id: true, orderNumber: true } },
        creditNotes: { select: { id: true, orderNumber: true, total: true } },
      },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body)
    const order = await orderService.createOrder({
      ...input,
      tenantId: req.user!.tenantId,
      eventId: req.params.eventId,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      createdById: req.user!.userId,
    })
    res.status(201).json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, notes } = z.object({
      status: z.string(),
      notes: z.string().optional(),
    }).parse(req.body)

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

    const updated = await orderService.transitionOrderStatus(
      req.params.id,
      status as any,
      req.user!.userId,
      notes
    )
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function addPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = addPaymentSchema.parse(req.body)
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

    const updated = await orderService.addPayment(req.params.id, req.user!.userId, {
      ...payment,
      paymentDate: new Date(payment.paymentDate),
    })
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function getDashboardAccounting(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const orders = await prisma.order.findMany({
      where: { tenantId, status: { in: ['PAID', 'IN_PAYMENT'] } },
      include: {
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        event: { select: { id: true, name: true, code: true } },
        billingClient: { select: { id: true, companyName: true, rfc: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

export async function getDashboardOperations(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const orders = await prisma.order.findMany({
      where: { tenantId, status: 'INVOICED' },
      include: {
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        event: { select: { id: true, name: true, code: true } },
        stand: { select: { id: true, code: true } },
        lineItems: { include: { resource: { select: { name: true, departmentId: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}
