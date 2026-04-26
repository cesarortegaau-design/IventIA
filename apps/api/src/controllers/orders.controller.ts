import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import * as orderService from '../services/order.service'
import { orgFilterForOrder } from '../middleware/departmentScope'

const createOrderSchema = z.object({
  clientId: z.string().min(1),
  billingClientId: z.string().min(1).optional(),
  standId: z.string().min(1).optional(),
  priceListId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  departamento: z.string().optional(),
  organizacionId: z.string().uuid().optional(),
  isCreditNote: z.boolean().default(false),
  originalOrderId: z.string().min(1).optional(),
  lineItems: z.array(z.object({
    resourceId: z.string().min(1),
    priceListItemId: z.string().optional(),
    quantity: z.number(),
    discountPct: z.number().min(0).max(100).default(0),
    observations: z.string().optional(),
    sortOrder: z.number().int().optional(),
    deliveryDate: z.string().datetime().optional().nullable(),
  })).min(1),
})

const addPaymentSchema = z.object({
  method: z.enum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'CHECK', 'SWIFT']),
  amount: z.number().positive(),
  paymentDate: z.string().datetime(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// ── Cross-event orders report ──────────────────────────────────────────────────
export async function listOrdersReport(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { eventId, status, dateFrom, dateTo, clientSearch } = req.query as Record<string, string>

    const orgScope = await orgFilterForOrder(req)
    const where: any = { tenantId, ...orgScope }

    if (eventId)  where.eventId = eventId
    if (status) {
      where.status = status
      if (status === 'CREDIT_NOTE') where.isCreditNote = true
      else where.isCreditNote = false
    } else {
      where.isCreditNote = false
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo)   where.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999))
    }
    if (clientSearch) {
      where.client = {
        OR: [
          { companyName: { contains: clientSearch, mode: 'insensitive' } },
          { firstName:   { contains: clientSearch, mode: 'insensitive' } },
          { lastName:    { contains: clientSearch, mode: 'insensitive' } },
          { email:       { contains: clientSearch, mode: 'insensitive' } },
          { rfc:         { contains: clientSearch, mode: 'insensitive' } },
        ],
      }
    }

    const [orders, totals] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          event:  { select: { id: true, code: true, name: true } },
          client: { select: { id: true, companyName: true, firstName: true, lastName: true, email: true, rfc: true, phone: true } },
          stand:  { select: { id: true, code: true } },
          organizacion: { select: { id: true, clave: true, descripcion: true } },
          lineItems: { select: { id: true, description: true, quantity: true, unitPrice: true, lineTotal: true, discountPct: true, observations: true } },
          _count: { select: { lineItems: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.aggregate({
        where,
        _sum: { subtotal: true, discountAmount: true, taxAmount: true, total: true, paidAmount: true },
        _count: { id: true },
      }),
    ])

    res.json({
      success: true,
      data: orders,
      totals: {
        count:          totals._count.id,
        subtotal:       Number(totals._sum.subtotal    ?? 0),
        discountAmount: Number(totals._sum.discountAmount ?? 0),
        taxAmount:      Number(totals._sum.taxAmount   ?? 0),
        total:          Number(totals._sum.total       ?? 0),
        paidAmount:     Number(totals._sum.paidAmount  ?? 0),
        balance:        Number(totals._sum.total ?? 0) - Number(totals._sum.paidAmount ?? 0),
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function listOrdersForEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const orgScope = await orgFilterForOrder(req)
    const orders = await prisma.order.findMany({
      where: { eventId, tenantId, ...orgScope },
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
    const orgScope = await orgFilterForOrder(req)
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId, ...orgScope },
      include: {
        client: true,
        billingClient: true,
        stand: true,
        priceList: true,
        lineItems: {
          select: {
            id: true,
            resourceId: true,
            description: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            discountPct: true,
            timeUnit: true,
            detail: true,
            observations: true,
            actualQuantity: true,
            actualDiscountPct: true,
            actualLineTotal: true,
            actualObservations: true,
            sortOrder: true,
            deliveryDate: true,
            resource: {
              include: {
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
                              },
                            },
                          },
                          orderBy: { sortOrder: 'asc' },
                        },
                      },
                    },
                  },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        payments: { orderBy: { paymentDate: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
        originalOrder: { select: { id: true, orderNumber: true } },
        creditNotes: { select: { id: true, orderNumber: true, total: true } },
        organizacion: { select: { id: true, clave: true, descripcion: true } },
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
      tenantId: req.user!.tenantId,
      eventId: req.params.eventId,
      clientId: input.clientId,
      billingClientId: input.billingClientId,
      standId: input.standId,
      priceListId: input.priceListId,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      notes: input.notes,
      departamento: input.departamento,
      organizacionId: input.organizacionId,
      isCreditNote: input.isCreditNote,
      originalOrderId: input.originalOrderId,
      initialStatus: input.isCreditNote ? 'CREDIT_NOTE' : undefined,
      createdById: req.user!.userId,
      lineItems: input.lineItems.map(li => ({
        resourceId: li.resourceId,
        quantity: li.quantity,
        discountPct: li.discountPct,
        observations: li.observations,
        sortOrder: li.sortOrder,
        deliveryDate: li.deliveryDate ? new Date(li.deliveryDate) : undefined,
      })),
    })
    res.status(201).json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

const updateOrderSchema = z.object({
  clientId: z.string().min(1).optional(),
  billingClientId: z.string().min(1).optional().nullable(),
  standId: z.string().min(1).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  organizacionId: z.string().uuid().optional().nullable(),
  lineItems: z.array(z.object({
    resourceId: z.string().min(1),
    priceListItemId: z.string().optional(),
    quantity: z.number().positive(),
    discountPct: z.number().min(0).max(100).default(0),
    observations: z.string().optional(),
    sortOrder: z.number().int().optional(),
    deliveryDate: z.string().datetime().optional().nullable(),
  })).min(1).optional(),
})

export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateOrderSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId },
      include: { lineItems: true },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

    if (order.status !== 'QUOTED') {
      throw new AppError(400, 'ORDER_NOT_EDITABLE', 'Solo se pueden editar órdenes en estado Cotizada sin pagos')
    }

    const paidAmount = Number(order.paidAmount)
    if (paidAmount > 0) {
      throw new AppError(400, 'ORDER_HAS_PAYMENTS', 'No se puede editar una orden que ya tiene pagos registrados')
    }

    // If lineItems provided, recalculate totals
    if (data.lineItems && data.lineItems.length > 0) {
      const { determinePricingTier, getPriceForTier, calculateLineTotal, calculateOrderTotals, calculateTimeUnitValue } = await import('../services/pricing.service')
      const { Decimal } = await import('decimal.js')

      const pricingTier = await determinePricingTier(order.priceListId)
      const resourceIds = data.lineItems.map(li => li.resourceId)
      const priceListItemIds = data.lineItems.map(li => li.priceListItemId).filter(Boolean) as string[]
      const priceListItems = await prisma.priceListItem.findMany({
        where: {
          priceListId: order.priceListId,
          OR: [
            { resourceId: { in: resourceIds } },
            ...(priceListItemIds.length ? [{ id: { in: priceListItemIds } }] : []),
          ],
        },
        include: { resource: true },
      })

      const foundResourceIds = new Set(priceListItems.map(i => i.resourceId))
      const missingIds = [...new Set(resourceIds)].filter(id => !foundResourceIds.has(id))
      if (missingIds.length > 0) {
        throw new AppError(400, 'INVALID_RESOURCES', 'Some resources are not in the price list')
      }

      const itemIdMap = new Map(priceListItems.map(i => [i.id, i]))
      const itemMap = new Map(priceListItems.map(i => [i.resourceId, i]))

      const newStartDate = data.startDate ? new Date(data.startDate) : (data.startDate === null ? null : order.startDate)
      const newEndDate = data.endDate ? new Date(data.endDate) : (data.endDate === null ? null : order.endDate)

      const lineItemData = data.lineItems.map((li, idx) => {
        const plItem = (li.priceListItemId ? itemIdMap.get(li.priceListItemId) : undefined) ?? itemMap.get(li.resourceId)!
        const unitPrice = getPriceForTier(plItem, pricingTier)
        const quantity = new Decimal(li.quantity)
        const discountPct = new Decimal(li.discountPct ?? 0)
        const timeUnitValue = calculateTimeUnitValue(
          (plItem as any).timeUnit,
          (plItem.resource as any).factor ?? 1,
          newStartDate,
          newEndDate
        )
        const lineTotal = calculateLineTotal(unitPrice, quantity, discountPct, timeUnitValue)

        return {
          resourceId: li.resourceId,
          description: plItem.resource.name,
          pricingTier,
          unitPrice,
          quantity,
          discountPct,
          lineTotal,
          timeUnit: (plItem as any).timeUnit ?? null,
          detail: (plItem as any).detail ?? null,
          observations: li.observations,
          sortOrder: li.sortOrder ?? idx,
          deliveryDate: li.deliveryDate ? new Date(li.deliveryDate) : undefined,
        }
      })

      const totals = calculateOrderTotals(
        lineItemData.map(li => ({ lineTotal: li.lineTotal })),
        new Decimal(Number(order.discountPct)),
        new Decimal(Number(order.taxPct))
      )

      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderLineItem.deleteMany({ where: { orderId: order.id } })
        return tx.order.update({
          where: { id: order.id },
          data: {
            ...(data.clientId && { clientId: data.clientId }),
            billingClientId: data.billingClientId ?? undefined,
            standId: data.standId ?? undefined,
            startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
            endDate: data.endDate ? new Date(data.endDate) : data.endDate === null ? null : undefined,
            notes: data.notes !== undefined ? data.notes : undefined,
            departamento: data.departamento !== undefined ? data.departamento : undefined,
            organizacionId: data.organizacionId !== undefined ? data.organizacionId : undefined,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            taxAmount: totals.taxAmount,
            total: totals.total,
            prospectedTotal: totals.total,
            lineItems: { create: lineItemData },
          },
          include: {
            client: true,
            billingClient: true,
            stand: true,
            priceList: true,
            lineItems: { include: { resource: true }, orderBy: { sortOrder: 'asc' } },
          },
        })
      })

      return res.json({ success: true, data: updated })
    }

    // Header-only update (no line items change)
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(data.clientId && { clientId: data.clientId }),
        billingClientId: data.billingClientId ?? undefined,
        standId: data.standId ?? undefined,
        startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
        endDate: data.endDate ? new Date(data.endDate) : data.endDate === null ? null : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        departamento: data.departamento !== undefined ? data.departamento : undefined,
        organizacionId: data.organizacionId !== undefined ? data.organizacionId : undefined,
      },
      include: {
        client: true,
        billingClient: true,
        stand: true,
        priceList: true,
        lineItems: { include: { resource: true }, orderBy: { sortOrder: 'asc' } },
      },
    })

    res.json({ success: true, data: updated })
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

const updateActualValuesSchema = z.object({
  lineItems: z.array(z.object({
    id: z.string().min(1),
    actualQuantity: z.number().positive(),
    actualDiscountPct: z.number().min(0).max(100).default(0),
    actualObservations: z.string().optional().nullable(),
  })).min(1),
})

export async function updateActualValues(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateActualValuesSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId },
      include: { lineItems: true },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

    if (order.status !== 'CONFIRMED') {
      throw new AppError(400, 'ORDER_NOT_EDITABLE', 'Solo se pueden editar valores reales en órdenes Confirmadas')
    }

    const lineItemIds = order.lineItems.map(li => li.id)
    const invalidIds = data.lineItems.filter(li => !lineItemIds.includes(li.id))
    if (invalidIds.length > 0) {
      throw new AppError(400, 'INVALID_LINE_ITEMS', 'Algunas partidas no pertenecen a esta orden')
    }

    const { Decimal } = await import('decimal.js')

    await prisma.$transaction(
      data.lineItems.map(li => {
        const unitPrice = order.lineItems.find(l => l.id === li.id)!.unitPrice
        const actualLineTotal = new Decimal(li.actualQuantity)
          .mul(unitPrice)
          .mul(new Decimal(1).minus(new Decimal(li.actualDiscountPct).div(100)))
        return prisma.orderLineItem.update({
          where: { id: li.id },
          data: {
            actualQuantity: new Decimal(li.actualQuantity),
            actualDiscountPct: new Decimal(li.actualDiscountPct),
            actualLineTotal,
            actualObservations: li.actualObservations ?? null,
          },
        })
      })
    )

    const updated = await prisma.order.findFirst({
      where: { id: req.params.id },
      include: {
        client: true,
        billingClient: true,
        stand: true,
        priceList: true,
        lineItems: {
          include: { resource: { include: { department: { select: { id: true, name: true } } } } },
          orderBy: { sortOrder: 'asc' },
        },
        payments: { orderBy: { paymentDate: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { firstName: true, lastName: true } } } },
      },
    })

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
      method: payment.method,
      amount: payment.amount,
      paymentDate: new Date(payment.paymentDate),
      reference: payment.reference,
      notes: payment.notes,
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
      where: { tenantId, paymentStatus: { in: ['IN_PAYMENT', 'IN_REVIEW', 'PAID'] } },
      include: {
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        event: { select: { id: true, name: true, code: true } },
        billingClient: { select: { id: true, companyName: true, rfc: true } },
        documents: {
          where: { documentType: 'COMPROBANTE_PAGO' },
          select: { id: true, fileName: true, blobKey: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
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

// Approve payment (accounting): updates paymentStatus based on paidAmount vs total
export async function approvePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

    if (order.paymentStatus !== 'IN_REVIEW' && order.paymentStatus !== 'IN_PAYMENT') {
      throw new AppError(400, 'INVALID_PAYMENT_STATUS', 'Solo se pueden aprobar pagos en revisión o en pago')
    }

    const updated = await orderService.updatePaymentStatus(req.params.id, req.user!.userId)
    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
