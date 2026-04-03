import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

export async function portalListOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!

    // Get portal user's linked client (if any)
    const portalUser = await prisma.portalUser.findUnique({
      where: { id: portalUserId },
      include: { client: { select: { id: true } } },
    })

    // Get accessible event IDs
    const userEvents = await prisma.portalUserEvent.findMany({
      where: { portalUserId },
      select: { eventId: true },
    })
    const eventIds = userEvents.map((e) => e.eventId)

    const where: any = { tenantId, eventId: { in: eventIds } }
    if (portalUser?.client) {
      where.clientId = portalUser.client.id
    } else {
      // No linked client — return empty
      return res.json({ success: true, data: [], meta: { total: 0, page: 1, pageSize: 20 } })
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        event: { select: { id: true, code: true, name: true } },
        lineItems: {
          include: { resource: { select: { id: true, name: true, type: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        payments: true,
        documents: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

export async function portalGetOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const { orderId } = req.params

    const portalUser = await prisma.portalUser.findUnique({
      where: { id: portalUserId },
      include: { client: { select: { id: true } } },
    })
    if (!portalUser?.client) throw new AppError(403, 'FORBIDDEN', 'Sin acceso')

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId, clientId: portalUser.client.id },
      include: {
        event: { select: { id: true, code: true, name: true } },
        lineItems: {
          include: { resource: { select: { id: true, name: true, type: true, unit: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        payments: true,
        documents: { select: { id: true, documentType: true, fileName: true, createdAt: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Orden no encontrada')

    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function portalCreateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const { eventId } = req.params

    // Verify event access
    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    const schema = z.object({
      items: z.array(z.object({
        priceListItemId: z.string().min(1),
        quantity: z.number().positive(),
        observations: z.string().optional(),
      })).min(1),
      notes: z.string().optional(),
    })
    const { items, notes } = schema.parse(req.body)

    const portalUser = await prisma.portalUser.findUnique({
      where: { id: portalUserId },
      include: { client: true },
    })
    if (!portalUser?.client) {
      throw new AppError(400, 'NO_CLIENT', 'Tu cuenta no está vinculada a un cliente. Contacta al administrador.')
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, portalEnabled: true },
      include: { priceList: true },
    })
    if (!event?.priceListId) throw new AppError(400, 'NO_PRICE_LIST', 'El evento no tiene lista de precios')

    // Determine pricing tier
    const now = new Date()
    let tier: 'EARLY' | 'NORMAL' | 'LATE' = 'LATE'
    if (event.priceList?.earlyCutoff && now <= event.priceList.earlyCutoff) tier = 'EARLY'
    else if (event.priceList?.normalCutoff && now <= event.priceList.normalCutoff) tier = 'NORMAL'

    // Fetch price list items
    const itemIds = items.map((i) => i.priceListItemId)
    const priceListItems = await prisma.priceListItem.findMany({
      where: { id: { in: itemIds }, priceListId: event.priceListId, isActive: true },
      include: { resource: true },
    })

    // Get system user for createdById (first admin of tenant)
    const systemUser = await prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN', isActive: true },
    })
    if (!systemUser) throw new AppError(500, 'NO_SYSTEM_USER', 'Error de configuración del sistema')

    // Generate order number
    const year = new Date().getFullYear()
    const prefix = `POR-${year}-`
    const last = await prisma.order.findFirst({
      where: { tenantId, orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    })
    const lastNum = last ? parseInt(last.orderNumber.replace(prefix, ''), 10) : 0
    const orderNumber = `${prefix}${String(lastNum + 1).padStart(4, '0')}`

    // Build line items and calculate totals
    const lineItems = items.map((item, idx) => {
      const pli = priceListItems.find((p) => p.id === item.priceListItemId)
      if (!pli) throw new AppError(400, 'ITEM_NOT_FOUND', `Ítem de precio no encontrado: ${item.priceListItemId}`)

      const unitPrice = new Decimal(
        tier === 'EARLY' ? pli.earlyPrice : tier === 'NORMAL' ? pli.normalPrice : pli.latePrice
      )
      const qty = new Decimal(item.quantity)
      const lineTotal = unitPrice.mul(qty)

      return {
        resourceId: pli.resourceId,
        description: pli.resource.name,
        pricingTier: tier,
        unitPrice,
        quantity: qty,
        discountPct: new Decimal(0),
        lineTotal,
        observations: item.observations,
        sortOrder: idx,
      }
    })

    const subtotal = lineItems.reduce((sum, li) => sum.add(li.lineTotal), new Decimal(0))
    const taxPct = new Decimal(16)
    const taxAmount = subtotal.mul(taxPct).div(100).toDecimalPlaces(2)
    const total = subtotal.add(taxAmount)

    const order = await prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        eventId,
        clientId: portalUser.client.id,
        priceListId: event.priceListId,
        status: 'QUOTED',
        pricingTier: tier,
        subtotal,
        taxPct,
        taxAmount,
        total,
        prospectedTotal: total,
        notes: notes ?? 'Orden creada desde Portal de Expositores',
        createdById: systemUser.id,
        lineItems: {
          create: lineItems.map((li) => ({
            resourceId: li.resourceId,
            description: li.description,
            pricingTier: li.pricingTier,
            unitPrice: li.unitPrice,
            quantity: li.quantity,
            discountPct: li.discountPct,
            lineTotal: li.lineTotal,
            observations: li.observations,
            sortOrder: li.sortOrder,
          })),
        },
        statusHistory: {
          create: { toStatus: 'QUOTED', changedById: systemUser.id, notes: 'Creada desde Portal de Expositores' },
        },
      },
      include: {
        lineItems: { include: { resource: { select: { id: true, name: true, type: true } } } },
      },
    })

    res.status(201).json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}
