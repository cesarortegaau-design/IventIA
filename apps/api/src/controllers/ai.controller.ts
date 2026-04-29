import { Request, Response, NextFunction } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../config/database'
import { buildAIContext } from '../services/ai.context.service'
import { toolSearchEvents, toolCopyEvent, toolCopyEventSpaces, toolCopyEventOrders, toolCheckSpaceAvailability, toolCreateOrder } from '../services/ai.tools.service'

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

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_events',
    description: 'Busca eventos en el sistema por nombre. Úsalo ANTES de copiar un evento para obtener su ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Texto a buscar en el nombre del evento' },
        status: { type: 'string', description: 'Filtrar por estado: QUOTED, CONFIRMED, IN_EXECUTION, CLOSED' },
      },
      required: ['query'],
    },
  },
  {
    name: 'copy_event',
    description: 'Copia un evento existente a una nueva fecha. SIEMPRE debes pedir al usuario: 1) el nombre del nuevo evento, 2) si quiere copiar reservas de espacio, 3) si quiere copiar órdenes de servicio. Pide confirmación con todos estos datos ANTES de ejecutar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sourceEventId: { type: 'string', description: 'ID del evento a copiar (obtenido con search_events)' },
        newStartDate: { type: 'string', description: 'Fecha de inicio del nuevo evento en formato YYYY-MM-DD' },
        newName: { type: 'string', description: 'Nombre del nuevo evento. OBLIGATORIO — siempre pregúntalo al usuario.' },
        copySpaces: { type: 'boolean', description: 'Si true, copia también las reservas de espacio ajustando fechas.' },
        copyOrders: { type: 'boolean', description: 'Si true, copia también las órdenes de servicio con sus partidas, en estado QUOTED.' },
      },
      required: ['sourceEventId', 'newStartDate', 'newName'],
    },
  },
  {
    name: 'copy_event_spaces',
    description: 'Copia las reservas de espacio (EventSpaces) de un evento a otro existente. Las fechas se ajustan automáticamente según la diferencia entre los inicios de ambos eventos. IMPORTANTE: Pide confirmación antes de ejecutar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sourceEventId: { type: 'string', description: 'ID del evento origen' },
        targetEventId: { type: 'string', description: 'ID del evento destino' },
      },
      required: ['sourceEventId', 'targetEventId'],
    },
  },
  {
    name: 'copy_event_orders',
    description: 'Copia las órdenes de servicio (OS) de un evento a otro existente, incluyendo todas sus partidas. Las órdenes se crean en estado QUOTED. IMPORTANTE: Pide confirmación antes de ejecutar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sourceEventId: { type: 'string', description: 'ID del evento origen' },
        targetEventId: { type: 'string', description: 'ID del evento destino' },
      },
      required: ['sourceEventId', 'targetEventId'],
    },
  },
  {
    name: 'check_space_availability',
    description: 'Verifica si hay conflictos de reservas de espacios en un rango de fechas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        resourceId: { type: 'string', description: 'ID del recurso/espacio a verificar (opcional)' },
        startDate: { type: 'string', description: 'Fecha inicio en formato YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Fecha fin en formato YYYY-MM-DD' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'create_order',
    description: 'Crea una nueva Orden de Servicio (OS) en estado QUOTED para un cliente en un evento. IMPORTANTE: Pide confirmación al usuario ANTES de ejecutar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string', description: 'ID del evento' },
        clientId: { type: 'string', description: 'ID del cliente' },
        notes: { type: 'string', description: 'Notas opcionales para la orden' },
      },
      required: ['eventId', 'clientId'],
    },
  },
]

async function executeTool(name: string, input: any, tenantId: string, userId: string): Promise<any> {
  switch (name) {
    case 'search_events': return toolSearchEvents(input, tenantId)
    case 'copy_event': return toolCopyEvent(input, tenantId, userId)
    case 'copy_event_spaces': return toolCopyEventSpaces(input, tenantId)
    case 'copy_event_orders': return toolCopyEventOrders(input, tenantId, userId)
    case 'check_space_availability': return toolCheckSpaceAvailability(input, tenantId)
    case 'create_order': return toolCreateOrder(input, tenantId, userId)
    default: throw new Error(`Tool desconocido: ${name}`)
  }
}

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      res.json({ success: true, data: { text: 'El módulo de IA no está configurado. Por favor, configura ANTHROPIC_API_KEY en el servidor.', actions: [] } })
      return
    }

    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { message, history = [] } = req.body as {
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'message es requerido' })
      return
    }

    let context = ''
    try {
      context = await buildAIContext(tenantId)
    } catch (ctxErr: any) {
      res.json({ success: true, data: { text: `⚠️ Error al obtener datos del sistema: ${ctxErr?.message ?? ctxErr}`, actions: [] } })
      return
    }

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

El JSON dentro de <chart> debe ser válido y en UNA SOLA LÍNEA.

HERRAMIENTAS DISPONIBLES:
Tienes herramientas para ejecutar acciones en el sistema. Úsalas cuando el usuario pida realizar una acción (copiar evento, crear orden, verificar disponibilidad). Para acciones que modifican datos (copy_event, create_order), SIEMPRE pide confirmación explícita al usuario antes de llamar la herramienta. Describe qué vas a hacer y espera un "sí" o "confirma" antes de proceder.`

    const anthropic = new Anthropic({ apiKey })

    // Build messages (history only contains text messages from user/assistant turns)
    const messages: Anthropic.MessageParam[] = [
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message },
    ]

    const executedActions: Array<{ tool: string; input: any; result: any }> = []
    let text = ''

    try {
      let continueLoop = true
      while (continueLoop) {
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          system: systemPrompt,
          tools: AI_TOOLS,
          messages,
        })

        // Extract text from this turn
        for (const block of response.content) {
          if (block.type === 'text') text = block.text
        }

        if (response.stop_reason === 'tool_use') {
          messages.push({ role: 'assistant', content: response.content })

          const toolResults: Anthropic.ToolResultBlockParam[] = []
          for (const block of response.content) {
            if (block.type !== 'tool_use') continue
            let result: any
            try {
              result = await executeTool(block.name, block.input as any, tenantId, userId)
              executedActions.push({ tool: block.name, input: block.input, result })
            } catch (e: any) {
              result = { error: e.message }
            }
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
          messages.push({ role: 'user', content: toolResults })
        } else {
          continueLoop = false
        }
      }
    } catch (aiErr: any) {
      const detail = aiErr?.message ?? aiErr?.error?.message ?? String(aiErr)
      res.json({ success: true, data: { text: `⚠️ Error al conectar con Claude: ${detail}`, actions: [] } })
      return
    }

    res.json({ success: true, data: { text, actions: executedActions } })
  } catch (err) {
    next(err)
  }
}
