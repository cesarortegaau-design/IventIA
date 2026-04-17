import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { getUserDepartmentIds } from '../middleware/departmentScope'

/**
 * Resource planning: returns aggregated resource demands from CONFIRMED and EXECUTED orders,
 * cross-referenced with purchase orders and warehouse inventory.
 */
export async function getResourcePlanning(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { eventId, departmentId, dateFrom, dateTo } = req.query as Record<string, string>

    // Build order filter
    const orderWhere: any = {
      tenantId,
      status: { in: ['CONFIRMED', 'EXECUTED'] },
      isCreditNote: false,
    }
    if (eventId) orderWhere.eventId = eventId
    if (dateFrom || dateTo) {
      orderWhere.createdAt = {}
      if (dateFrom) orderWhere.createdAt.gte = new Date(dateFrom)
      if (dateTo) orderWhere.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999))
    }

    // Department scoping: non-admin users see resources in their departments + unassigned
    const userDeptIds = await getUserDepartmentIds(req)
    const resourceFilter: any = {}
    if (departmentId) {
      // Explicit department filter from UI dropdown
      resourceFilter.departmentId = departmentId
    } else if (userDeptIds !== null) {
      // Non-admin user: their departments + resources with no department
      resourceFilter.OR = [{ departmentId: { in: userDeptIds } }, { departmentId: null }]
    }

    // Fetch line items with actual values (real values preferred)
    const lineItems = await prisma.orderLineItem.findMany({
      where: {
        order: orderWhere,
        ...(Object.keys(resourceFilter).length ? { resource: resourceFilter } : {}),
      },
      include: {
        resource: {
          select: {
            id: true, code: true, name: true, unit: true, type: true, stock: true,
            department: { select: { id: true, name: true } },
          },
        },
        order: {
          select: { id: true, orderNumber: true, status: true, eventId: true,
            event: { select: { id: true, code: true, name: true } },
          },
        },
      },
    })

    // Aggregate by resource
    const resourceMap = new Map<string, {
      resource: any
      totalRequested: number
      totalReal: number
      orders: Array<{ orderId: string; orderNumber: string; eventCode: string; eventName: string; requested: number; real: number }>
    }>()

    for (const li of lineItems) {
      const key = li.resourceId
      if (!resourceMap.has(key)) {
        resourceMap.set(key, {
          resource: li.resource,
          totalRequested: 0,
          totalReal: 0,
          orders: [],
        })
      }
      const entry = resourceMap.get(key)!
      const requested = Number(li.quantity)
      const real = li.actualQuantity != null ? Number(li.actualQuantity) : requested
      entry.totalRequested += requested
      entry.totalReal += real
      entry.orders.push({
        orderId: li.order.id,
        orderNumber: li.order.orderNumber,
        eventCode: li.order.event?.code ?? '',
        eventName: li.order.event?.name ?? '',
        requested,
        real,
      })
    }

    // Fetch purchase order line items for these resources
    const resourceIds = Array.from(resourceMap.keys())
    const poItems = await prisma.purchaseOrderLineItem.findMany({
      where: {
        purchaseOrder: {
          tenantId,
          status: { in: ['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
        },
        resourceId: { in: resourceIds },
      },
      include: {
        purchaseOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    })

    const poByResource = new Map<string, { ordered: number; received: number; items: any[] }>()
    for (const poi of poItems) {
      if (!poByResource.has(poi.resourceId)) {
        poByResource.set(poi.resourceId, { ordered: 0, received: 0, items: [] })
      }
      const entry = poByResource.get(poi.resourceId)!
      entry.ordered += Number(poi.quantity)
      entry.received += Number(poi.receivedQty)
      entry.items.push({
        poId: poi.purchaseOrder.id,
        poNumber: poi.purchaseOrder.orderNumber,
        poStatus: poi.purchaseOrder.status,
        quantity: Number(poi.quantity),
        received: Number(poi.receivedQty),
      })
    }

    // Fetch warehouse inventory for these resources
    const inventory = await prisma.resourceInventory.findMany({
      where: {
        tenantId,
        resourceId: { in: resourceIds },
      },
      include: {
        warehouse: { select: { id: true, name: true } },
      },
    })

    const inventoryByResource = new Map<string, { total: number; warehouses: any[] }>()
    for (const inv of inventory) {
      if (!inventoryByResource.has(inv.resourceId)) {
        inventoryByResource.set(inv.resourceId, { total: 0, warehouses: [] })
      }
      const entry = inventoryByResource.get(inv.resourceId)!
      const qty = Number(inv.quantityTotal)
      entry.total += qty
      entry.warehouses.push({
        warehouseId: inv.warehouse.id,
        warehouseName: inv.warehouse.name,
        quantity: qty,
      })
    }

    // Combine into response
    const planning = Array.from(resourceMap.entries()).map(([resourceId, data]) => {
      const po = poByResource.get(resourceId) ?? { ordered: 0, received: 0, items: [] }
      const warehouseInv = inventoryByResource.get(resourceId)
      const inv = warehouseInv ?? { total: data.resource.stock ?? 0, warehouses: [] }
      const available = inv.total + po.received
      const gap = data.totalReal - available - (po.ordered - po.received)

      return {
        resource: data.resource,
        demand: {
          totalRequested: data.totalRequested,
          totalReal: data.totalReal,
          orders: data.orders,
        },
        supply: {
          inventoryTotal: inv.total,
          inventoryWarehouses: inv.warehouses,
          poOrdered: po.ordered,
          poReceived: po.received,
          poPending: po.ordered - po.received,
          poItems: po.items,
        },
        gap: Math.max(0, gap),
        surplus: Math.max(0, -gap),
      }
    })

    // Sort by gap descending (resources needing most additional purchase first)
    planning.sort((a, b) => b.gap - a.gap)

    res.json({ success: true, data: planning })
  } catch (err) {
    next(err)
  }
}

/**
 * Profitability analysis: income (service orders) vs expenses (purchase orders) per event and per order.
 */
export async function getProfitability(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { eventId, dateFrom, dateTo } = req.query as Record<string, string>

    const orderWhere: any = {
      tenantId,
      status: { in: ['CONFIRMED', 'EXECUTED', 'INVOICED'] },
      isCreditNote: false,
    }
    if (eventId) orderWhere.eventId = eventId
    if (dateFrom || dateTo) {
      orderWhere.createdAt = {}
      if (dateFrom) orderWhere.createdAt.gte = new Date(dateFrom)
      if (dateTo) orderWhere.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999))
    }

    // Department scoping for profitability
    const userDeptIds = await getUserDepartmentIds(req)
    if (userDeptIds !== null) {
      orderWhere.lineItems = { some: { resource: { OR: [{ departmentId: { in: userDeptIds } }, { departmentId: null }] } } }
    }

    // Service orders (income)
    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true, orderNumber: true, status: true, total: true, paidAmount: true,
        subtotal: true, discountAmount: true, taxAmount: true,
        event: { select: { id: true, code: true, name: true } },
        client: { select: { companyName: true, firstName: true, lastName: true } },
        lineItems: {
          select: {
            resourceId: true, quantity: true, unitPrice: true, lineTotal: true,
            actualQuantity: true, actualLineTotal: true,
          },
        },
        creditNotes: { select: { id: true, total: true } },
      },
    })

    // Purchase orders (expenses) - group by originOrderId
    const poWhere: any = {
      tenantId,
      status: { notIn: ['CANCELLED'] },
    }
    if (eventId) {
      poWhere.originOrder = { eventId }
    }
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: poWhere,
      select: {
        id: true, orderNumber: true, total: true, status: true,
        originOrderId: true,
        originOrder: { select: { eventId: true } },
      },
    })

    // Group PO expenses by event and by origin order
    const poByOrder = new Map<string, number>()
    const poByEvent = new Map<string, number>()
    for (const po of purchaseOrders) {
      const poTotal = Number(po.total)
      if (po.originOrderId) {
        poByOrder.set(po.originOrderId, (poByOrder.get(po.originOrderId) ?? 0) + poTotal)
      }
      const evId = po.originOrder?.eventId
      if (evId) {
        poByEvent.set(evId, (poByEvent.get(evId) ?? 0) + poTotal)
      }
    }

    // Per-order profitability
    const orderProfitability = orders.map(o => {
      const income = Number(o.total)
      const creditNoteTotal = o.creditNotes.reduce((sum: number, cn: any) => sum + Math.abs(Number(cn.total)), 0)
      const netIncome = income - creditNoteTotal
      const expenses = poByOrder.get(o.id) ?? 0
      const profit = netIncome - expenses
      const margin = netIncome > 0 ? (profit / netIncome) * 100 : 0

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        event: o.event,
        client: o.client?.companyName || `${o.client?.firstName} ${o.client?.lastName}`,
        income: netIncome,
        expenses,
        profit,
        margin: Math.round(margin * 100) / 100,
        creditNoteTotal,
      }
    })

    // Per-event aggregation
    const eventMap = new Map<string, { event: any; income: number; expenses: number; creditNotes: number; orderCount: number }>()
    for (const op of orderProfitability) {
      if (!op.event) continue
      if (!eventMap.has(op.event.id)) {
        eventMap.set(op.event.id, { event: op.event, income: 0, expenses: 0, creditNotes: 0, orderCount: 0 })
      }
      const entry = eventMap.get(op.event.id)!
      entry.income += op.income
      entry.expenses += op.expenses
      entry.creditNotes += op.creditNoteTotal
      entry.orderCount++
    }

    const eventProfitability = Array.from(eventMap.values()).map(e => ({
      ...e,
      profit: e.income - e.expenses,
      margin: e.income > 0 ? Math.round(((e.income - e.expenses) / e.income) * 10000) / 100 : 0,
    }))

    // Summary totals
    const totalIncome = orderProfitability.reduce((sum, o) => sum + o.income, 0)
    const totalExpenses = orderProfitability.reduce((sum, o) => sum + o.expenses, 0)
    const totalProfit = totalIncome - totalExpenses

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          totalProfit,
          totalMargin: totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 10000) / 100 : 0,
          orderCount: orders.length,
        },
        byOrder: orderProfitability,
        byEvent: eventProfitability,
      },
    })
  } catch (err) {
    next(err)
  }
}
