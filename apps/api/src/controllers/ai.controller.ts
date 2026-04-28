import { Request, Response, NextFunction } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../config/database'
import { buildAIContext } from '../services/ai.context.service'

const STATUS_COLORS: Record<string, string> = {
  QUOTED: '#3b82f6',
  CONFIRMED: '#6B46C1',
  EXECUTED: '#22c55e',
  INVOICED: '#f59e0b',
  CANCELLED: '#ef4444',
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId

    // Total revenue (non-cancelled orders)
    const revenueAgg = await prisma.order.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' } },
      _sum: { total: true },
      _count: { id: true },
    })
    const totalRevenue = Number(revenueAgg._sum.total ?? 0)
    const totalOrders = revenueAgg._count.id

    // Total costs (confirmed+ purchase orders)
    const costsAgg = await prisma.purchaseOrder.aggregate({
      where: { tenantId, status: { not: 'DRAFT' } },
      _sum: { total: true },
    })
    const totalCosts = Number(costsAgg._sum.total ?? 0)
    const grossMargin = totalRevenue - totalCosts
    const marginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0

    // Active events
    const activeEvents = await prisma.event.count({
      where: { tenantId, status: { in: ['IN_EXECUTION', 'CONFIRMED'] } },
    })

    // Revenue vs Costs by event (top 10 events by revenue)
    const orders = await prisma.order.findMany({
      where: { tenantId, status: { not: 'CANCELLED' } },
      select: {
        eventId: true,
        total: true,
        event: { select: { name: true, code: true } },
      },
    })

    const eventRevMap: Record<string, { name: string; ingresos: number }> = {}
    for (const o of orders) {
      if (!eventRevMap[o.eventId]) {
        eventRevMap[o.eventId] = { name: o.event.code + ' ' + o.event.name, ingresos: 0 }
      }
      eventRevMap[o.eventId].ingresos += Number(o.total)
    }

    // PO costs per event (via originOrderId)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { tenantId, status: { not: 'DRAFT' }, originOrderId: { not: null } },
      select: { originOrderId: true, total: true },
    })

    const originIds = purchaseOrders.map(p => p.originOrderId as string)
    const originOrders =
      originIds.length > 0
        ? await prisma.order.findMany({
            where: { id: { in: originIds }, tenantId },
            select: { id: true, eventId: true },
          })
        : []

    const orderEventMap: Record<string, string> = {}
    for (const o of originOrders) orderEventMap[o.id] = o.eventId

    const eventCostMap: Record<string, number> = {}
    for (const po of purchaseOrders) {
      if (po.originOrderId && orderEventMap[po.originOrderId]) {
        const evId = orderEventMap[po.originOrderId]
        eventCostMap[evId] = (eventCostMap[evId] || 0) + Number(po.total)
      }
    }

    const revenueByEvent = Object.entries(eventRevMap)
      .map(([eventId, { name, ingresos }]) => ({
        event: name.length > 30 ? name.slice(0, 28) + '…' : name,
        ingresos,
        costos: eventCostMap[eventId] ?? 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8)

    // Orders by status
    const statusGroups = await prisma.order.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    })
    const ordersByStatus = statusGroups.map(g => ({
      status: g.status,
      count: g._count.id,
      color: STATUS_COLORS[g.status] ?? '#888',
    }))

    // Top resources by line item count
    const lineItems = await prisma.orderLineItem.findMany({
      where: { order: { tenantId } },
      select: {
        resourceId: true,
        lineTotal: true,
        resource: { select: { name: true } },
      },
    })

    const resMap: Record<string, { name: string; count: number; total: number }> = {}
    for (const li of lineItems) {
      if (!resMap[li.resourceId]) resMap[li.resourceId] = { name: li.resource.name, count: 0, total: 0 }
      resMap[li.resourceId].count++
      resMap[li.resourceId].total += Number(li.lineTotal)
    }
    const topResources = Object.values(resMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalCosts,
          grossMargin,
          marginPct,
          activeEvents,
          totalOrders,
        },
        revenueByEvent,
        ordersByStatus,
        topResources,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      res.json({
        success: true,
        data: {
          text: 'El módulo de IA no está configurado. Por favor, configura la variable de entorno ANTHROPIC_API_KEY en el servidor.',
        },
      })
      return
    }

    const tenantId = req.user!.tenantId
    const { message, history = [] } = req.body as {
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'message es requerido' })
      return
    }

    const context = await buildAIContext(tenantId)

    const systemPrompt = `Eres un experto en análisis de costos, rentabilidad y gestión de eventos para IventIA.

IventIA es un sistema de gestión de eventos que incluye:
- EVENTOS: con ciclo de vida QUOTED→CONFIRMED→IN_EXECUTION→CLOSED
- ÓRDENES DE SERVICIO (OS): contratos de servicio para clientes en eventos. Tienen estados: QUOTED, CONFIRMED, EXECUTED, INVOICED, CANCELLED
- ÓRDENES DE COMPRA (OC): para adquirir recursos de proveedores para surtir las OS
- ALMACÉN: control de inventario y stock de recursos
- RECURSOS: lo que se vende/compra (EQUIPMENT, FURNITURE, SERVICE, SPACE, CONSUMABLE)
- CLIENTES: empresas que contratan servicios para sus stands en eventos

DATOS ACTUALES DEL SISTEMA:
${context}

INSTRUCCIONES:
1. Responde SIEMPRE en español, de forma clara y precisa
2. Usa los datos reales proporcionados arriba para responder
3. Cuando calcules márgenes, usa: Margen = Ingresos OS - Costos OC
4. Puedes hacer análisis de tendencias, comparaciones entre eventos, y recomendaciones

GENERACIÓN DE GRÁFICAS:
Cuando el usuario pida una gráfica, chart, visualización o análisis visual, incluye al final de tu respuesta un bloque con este formato exacto (NO uses markdown code fences, usa las etiquetas XML directamente):

<chart>{"type":"bar","title":"Título","data":[{"evento":"X","ingresos":1000,"costos":800}],"xKey":"evento","series":[{"key":"ingresos","label":"Ingresos","color":"#6B46C1"},{"key":"costos","label":"Costos","color":"#ef4444"}]}</chart>

Tipos de gráfica disponibles:
- "bar": gráfica de barras. Requiere xKey + series[{key,label,color}]
- "line": gráfica de líneas. Mismo formato que bar
- "pie": gráfica de pastel. data=[{name,value,color}], sin xKey/series
- "area": gráfica de área. Mismo formato que bar

El JSON dentro de <chart> debe ser válido y en UNA SOLA LÍNEA.`

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: message }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    res.json({ success: true, data: { text } })
  } catch (err) {
    next(err)
  }
}
