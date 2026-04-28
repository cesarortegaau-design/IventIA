import { prisma } from '../config/database'

export async function buildAIContext(tenantId: string): Promise<string> {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  // Events from last 12 months
  const events = await prisma.event.findMany({
    where: {
      tenantId,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      eventStart: true,
      eventEnd: true,
    },
    orderBy: { eventStart: 'desc' },
    take: 25,
  })

  // Orders grouped by event
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      eventId: true,
      status: true,
      total: true,
    },
  })

  // Aggregate orders by event
  const ordersByEvent: Record<string, { revenue: number; count: number; byStatus: Record<string, number> }> = {}
  const ordersByStatus: Record<string, number> = {}

  for (const o of orders) {
    if (!ordersByEvent[o.eventId]) {
      ordersByEvent[o.eventId] = { revenue: 0, count: 0, byStatus: {} }
    }
    if (o.status !== 'CANCELLED') {
      ordersByEvent[o.eventId].revenue += Number(o.total)
    }
    ordersByEvent[o.eventId].count++
    ordersByEvent[o.eventId].byStatus[o.status] = (ordersByEvent[o.eventId].byStatus[o.status] || 0) + 1
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
  }

  // Purchase orders by event (via originOrderId -> order -> eventId)
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      tenantId,
      createdAt: { gte: twelveMonthsAgo },
      status: { not: 'DRAFT' },
    },
    select: {
      originOrderId: true,
      total: true,
      status: true,
    },
  })

  // Build order->event mapping
  const orderEventMap: Record<string, string> = {}
  for (const o of orders) {
    // We need order IDs; refetch minimal
  }
  const orderIds = purchaseOrders.filter(p => p.originOrderId).map(p => p.originOrderId as string)
  let orderEventMapFull: Record<string, string> = {}
  if (orderIds.length > 0) {
    const linkedOrders = await prisma.order.findMany({
      where: { id: { in: orderIds }, tenantId },
      select: { id: true, eventId: true },
    })
    for (const lo of linkedOrders) {
      orderEventMapFull[lo.id] = lo.eventId
    }
  }

  const costsByEvent: Record<string, number> = {}
  let totalCostsPO = 0
  for (const po of purchaseOrders) {
    totalCostsPO += Number(po.total)
    if (po.originOrderId && orderEventMapFull[po.originOrderId]) {
      const evId = orderEventMapFull[po.originOrderId]
      costsByEvent[evId] = (costsByEvent[evId] || 0) + Number(po.total)
    }
  }

  // Top 10 resources by order line item frequency
  const lineItems = await prisma.orderLineItem.findMany({
    where: {
      order: { tenantId, createdAt: { gte: twelveMonthsAgo } },
    },
    select: {
      resourceId: true,
      lineTotal: true,
      resource: { select: { name: true } },
    },
  })

  const resourceFreq: Record<string, { name: string; count: number; total: number }> = {}
  for (const li of lineItems) {
    if (!resourceFreq[li.resourceId]) {
      resourceFreq[li.resourceId] = { name: li.resource.name, count: 0, total: 0 }
    }
    resourceFreq[li.resourceId].count++
    resourceFreq[li.resourceId].total += Number(li.lineTotal)
  }
  const topResources = Object.values(resourceFreq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Warehouse stock summary (top 20 by quantity)
  const inventory = await prisma.resourceInventory.findMany({
    where: { tenantId },
    select: {
      quantityTotal: true,
      quantityReserved: true,
      resource: { select: { name: true, type: true } },
    },
    orderBy: { quantityTotal: 'desc' },
    take: 20,
  })

  // Build context string
  const lines: string[] = []

  lines.push('=== EVENTOS (últimos 12 meses) ===')
  for (const e of events) {
    const rev = ordersByEvent[e.id]?.revenue ?? 0
    const costs = costsByEvent[e.id] ?? 0
    const margin = rev - costs
    const start = e.eventStart ? e.eventStart.toISOString().slice(0, 10) : 'N/A'
    lines.push(`- [${e.code}] ${e.name} | Estado: ${e.status} | Inicio: ${start} | Ingresos OS: $${rev.toFixed(0)} | Costos OC: $${costs.toFixed(0)} | Margen: $${margin.toFixed(0)}`)
  }

  lines.push('\n=== RESUMEN DE ÓRDENES DE SERVICIO (OS) ===')
  lines.push(`Total de OS en el periodo: ${orders.length}`)
  for (const [status, count] of Object.entries(ordersByStatus)) {
    lines.push(`- ${status}: ${count} órdenes`)
  }

  lines.push('\n=== ÓRDENES DE COMPRA (OC) ===')
  lines.push(`Total OC confirmadas en el periodo: ${purchaseOrders.length} | Costo total: $${totalCostsPO.toFixed(0)}`)

  lines.push('\n=== TOP 10 RECURSOS MÁS VENDIDOS ===')
  for (const r of topResources) {
    lines.push(`- ${r.name}: ${r.count} apariciones en OS | Total facturado: $${r.total.toFixed(0)}`)
  }

  lines.push('\n=== INVENTARIO EN ALMACÉN (top 20 por cantidad) ===')
  for (const inv of inventory) {
    const available = Number(inv.quantityTotal) - Number(inv.quantityReserved)
    lines.push(`- ${inv.resource.name} (${inv.resource.type}): Total ${Number(inv.quantityTotal).toFixed(0)}, Reservado ${Number(inv.quantityReserved).toFixed(0)}, Disponible ${available.toFixed(0)}`)
  }

  return lines.join('\n')
}
