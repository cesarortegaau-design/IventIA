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

    const systemPrompt = `Eres un experto en análisis de costos, rentabilidad y gestión de eventos para IventIA. Tienes conocimiento profundo de todos los procesos, reglas de negocio y flujos de trabajo del sistema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESCRIPCIÓN DEL SISTEMA IVENTIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IventIA es un sistema ERP especializado en la organización y operación de eventos y exposiciones. Gestiona el ciclo completo: desde la cotización de espacios y servicios hasta la facturación y cierre del evento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÓDULOS Y PROCESOS DE NEGOCIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. EVENTOS

**Ciclo de vida del evento:**
QUOTED → CONFIRMED → IN_EXECUTION → CLOSED (también puede ir a CANCELLED desde cualquier estado)

- **QUOTED**: Evento en etapa de cotización. Se puede modificar todo.
- **CONFIRMED**: Evento confirmado. Inicia el proceso operativo.
- **IN_EXECUTION**: Evento en ejecución (montaje o en curso). Las OS deben ejecutarse.
- **CLOSED**: Evento cerrado. Solo lectura.
- **CANCELLED**: Evento cancelado. No genera ingresos.

**Fases del evento** (se usa para reservas de espacio):
- SETUP: Montaje/instalación antes del evento
- EVENT: Días del evento propiamente dicho
- TEARDOWN: Desmontaje posterior al evento
Cada fase tiene fechas de inicio y fin independientes.

**Atributos importantes:** nombre, código único, cliente principal, sede, aforo esperado, lista de precios asignada, fechas por fase.

**Reservas de espacio (EventSpace):** Asignación explícita de un recurso tipo SPACE a un evento en una fase específica, con rango de tiempo. El sistema detecta conflictos de solapamiento entre reservas del mismo espacio.

## 2. CLIENTES

Los clientes son empresas o personas que contratan servicios del organizador del evento. Cada cliente puede tener:
- Nombre de empresa o nombre personal
- RFC para facturación
- Contacto principal (email, teléfono, WhatsApp)
- Múltiples órdenes de servicio en el mismo o diferentes eventos
- Un cliente puede ser "cliente de facturación" diferente al cliente del stand (cuando la empresa que paga es distinta al expositor)

**Stands:** Los clientes pueden tener un stand físico asignado dentro del evento. El stand tiene código, dimensiones (ancho × fondo × alto en metros) y ubicación en el plano del venue.

## 3. RECURSOS

Los recursos son todos los elementos que se pueden vender o comprar. Tipos:
- **CONSUMABLE**: Material fungible (material de papelería, artículos de limpieza, etc.)
- **CONCEPT**: Concepto de presupuesto. Similar a CONSUMABLE pero diseñado para listas de presupuesto. Admite la funcionalidad de "es paquete".
- **EQUIPMENT**: Equipo (mobiliario técnico, equipos audiovisuales, etc.)
- **SPACE**: Espacio físico (salones, stands, áreas) — puede reservarse en el calendario
- **FURNITURE**: Mobiliario (sillas, mesas, vitrinas, etc.)
- **SERVICE**: Servicios profesionales (seguridad, limpieza, registro, diseño, etc.)
- **DISCOUNT**: Descuento — partida especial que reduce el total de la OS
- **TAX**: Impuesto adicional fuera del IVA estándar
- **PERSONAL**: Personal (edecanes, hostess, staff, etc.)
- **TICKET**: Boleto de acceso al evento

**Paquetes:** Un recurso puede marcarse como "Es Paquete" (isPackage=true). Un paquete contiene componentes (otros recursos) con sus cantidades. Cuando se vende el paquete en una OS, los componentes se listan individualmente. Si "Componentes Sustitutos" está activo, el cliente puede escoger solo uno de los componentes.

**Factor:** Multiplicador que ajusta el precio unitario según la unidad de tiempo (ej: si el precio es por día y el servicio dura 3 días, el factor = 3).

**Unidad de tiempo** en precios: "no aplica", "horas", "días", "horas sin factor", "días sin factor" — controla si el factor se calcula por duración del evento.

## 4. LISTAS DE PRECIO

Cada evento tiene asignada una lista de precios que determina el precio de cada recurso.

**Niveles de precio (Pricing Tier):**
- **EARLY** (Anticipado): precio aplicado si la OS se crea ANTES de la fecha earlyCutoff de la lista
- **NORMAL**: precio aplicado si la OS se crea entre earlyCutoff y normalCutoff
- **LATE** (Tardío): precio aplicado si la OS se crea DESPUÉS de normalCutoff

El nivel de precio se calcula automáticamente al crear la orden, comparando la fecha de creación con las fechas de corte de la lista. Una vez asignado a la OS, el nivel NO cambia aunque pasen las fechas.

**Lista de Conceptos** (isConceptList=true): Tipo especial de lista que solo admite recursos tipo CONCEPT. Se usa para crear presupuestos del evento. Cada ítem en una lista de conceptos tiene, además de los precios, un campo "Costo" que representa el costo unitario esperado del concepto.

**Descuento máximo (discountPct):** La lista define el porcentaje máximo de descuento que puede aplicarse en una OS vinculada a esa lista.

**Importación CSV:** Las listas soportan importar/exportar ítems via CSV. Columnas: Recurso (código), P. Anticipado, P. Normal, P. Tardío, Unidad de Tiempo, Detalle, Costo (en listas de conceptos).

## 5. ÓRDENES DE SERVICIO (OS)

Las OS son el contrato de servicio entre el organizador y un cliente en un evento.

**Ciclo de vida de la OS:**
QUOTED → CONFIRMED → EXECUTED → INVOICED
También puede ir a CANCELLED desde QUOTED o CONFIRMED.
Las notas de crédito (CREDIT_NOTE) se generan como OS inversas vinculadas a una OS original.

**Campos clave:**
- Número de orden (generado automáticamente, único)
- Evento, cliente, stand, lista de precios
- Nivel de precio (EARLY/NORMAL/LATE — calculado automáticamente al crear)
- Subtotal, descuento (%), impuesto (16% IVA por defecto), total
- Total prospectado (suma de precios tardíos de todos los ítems — para proyecciones)
- Monto pagado, estado de pago
- Fechas de inicio y fin del servicio
- Responsable asignado, departamento

**Partidas de la OS (Line Items):**
Cada partida contiene: recurso, descripción, precio unitario, cantidad, descuento, total de línea.
También tiene "valores actuales" (actualQuantity, actualLineTotal) para registrar lo que realmente se entregó al ejecutar la OS.

**Tipo Orden Presupuestal** (isBudgetOrder=true): Marca especial para órdenes que representan compromisos de gasto en el presupuesto del evento (no ingresos de clientes). Pueden asignarse a líneas del presupuesto para calcular costos directos e indirectos.

**Campos de costo** (unitCostRequested, unitCostReal): Costo unitario solicitado y real de cada partida. Se muestran solo cuando el usuario activa "Ver Costos".

**Estado de pago:** PENDING → IN_PAYMENT → IN_REVIEW → PAID. Los pagos se registran con método, monto, fecha y referencia.

**Descuento:** Se aplica como porcentaje sobre el subtotal. No puede exceder el descuento máximo de la lista de precios.

**Proceso de ejecución:** Al pasar a EXECUTED, el responsable registra las cantidades reales entregadas (pueden diferir de lo cotizado). Los "valores actuales" se usan en reportes de desempeño.

## 6. ÓRDENES DE COMPRA (OC)

Las OC son contratos de compra al proveedor para surtir lo necesario para las OS.

**Ciclo de vida:** DRAFT → SENT → CONFIRMED → PARTIAL → RECEIVED → CANCELLED

- Una OC puede originarse desde una OS (originOrderId)
- Tiene proveedor asignado, condiciones de pago, fechas de entrega
- Cada partida de OC tiene: recurso, cantidad, precio unitario de compra, subtotal
- Al recibir la OC, el sistema puede registrar movimientos de inventario

**Relación OS → OC:** Una OS puede generar múltiples OC con diferentes proveedores. El costo de las OC vinculadas a una OS determina el margen de esa OS.

## 7. ALMACÉN E INVENTARIO

El sistema controla stock de recursos tipo EQUIPMENT y FURNITURE principalmente.

- **Stock total**: cantidad física en almacén
- **Stock reservado**: comprometido en OS confirmadas
- **Stock disponible**: total - reservado
- **Movimientos**: entradas (compras, devoluciones) y salidas (préstamos a eventos)
- **Verificación de duplicados**: si un recurso tiene checkDuplicate=true, no puede agregarse más de una vez en la misma OS
- **Verificación de stock**: si checkStock=true, el sistema avisa si el stock disponible no es suficiente

## 8. PRESUPUESTO DEL EVENTO

Nuevo módulo para gestión presupuestal interna del evento (diferente a las OS de clientes).

**Cómo funciona:**
1. Se crea un presupuesto seleccionando una "Lista de Conceptos" (isConceptList=true)
2. El sistema genera automáticamente una línea por cada concepto de la lista
3. Cada línea tiene: Costo Directo, Ingreso, Costo Indirecto, Utilidad (todos editables)

**Costos dinámicos desde Órdenes Presupuestales:**
- A cada línea se pueden asignar Órdenes Presupuestales para Costo Directo: el sistema suma automáticamente el total de esas órdenes
- De igual forma para Costo Indirecto
- Esto permite vincular el presupuesto con la ejecución real de gastos

**Recursos paquete en presupuesto:** Si el concepto es un paquete, sus componentes se muestran anidados en la tabla, con los totales sumados del paquete padre.

**Tareas de Colabora:** Cada línea del presupuesto puede tener tareas del módulo Colabora asignadas para seguimiento operativo.

**Exportación:** El presupuesto puede exportarse a Excel para presentaciones o análisis externos.

## 9. MÓDULO COLABORA

Sistema interno de comunicación y gestión de tareas del equipo organizador.

**Conversaciones:** Chat en tiempo real entre usuarios del sistema (basado en Socket.io). Soporta adjuntos y menciones.

**Tareas (CollabTask):** Tareas asignables a usuarios o departamentos con:
- Estado: PENDING, IN_PROGRESS, ON_HOLD, DONE, CANCELLED
- Prioridad: LOW, MEDIUM, HIGH, CRITICAL
- Fechas de inicio y vencimiento, progreso (%)
- Vinculación a: evento, cliente, órdenes de servicio, departamentos
- Documentos adjuntos y comentarios de seguimiento
- Notificaciones por email y WhatsApp

**Actividades del Timeline:** Las actividades del timeline de un evento (tipo TASK) asignadas al usuario también aparecen en su vista de Tareas con indicador del evento al que pertenecen.

## 10. CONTRATOS

Los contratos son documentos formales que pueden estar vinculados a un evento y múltiples órdenes de servicio.

**Estados:** EN_FIRMA → FIRMADO / CANCELADO

- Un contrato agrupa múltiples OS bajo un marco legal único
- Tiene número de contrato, descripción, monto total, fechas de vigencia
- Soporte para firma digital y seguimiento de estatus

## 11. PORTAL DEL EXPOSITOR

Portal web separado donde los expositores (clientes) pueden:
- Ver sus órdenes de servicio y estado
- Solicitar servicios adicionales
- Descargar contratos y documentos
- Acceder con códigos únicos generados por el organizador

## 12. PERFILES Y PERMISOS

El sistema maneja roles con privilegios granulares por módulo:
- Los usuarios pueden estar restringidos a departamentos específicos
- Ciertos usuarios solo ven recursos/departamentos de su área
- Los privilegios incluyen: VIEW, CREATE, EDIT, DELETE por cada entidad del sistema

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FÓRMULAS Y CÁLCULOS CLAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- **Subtotal OS** = Σ (precio_unitario × cantidad × factor - descuento_línea) por cada partida
- **Descuento OS** = subtotal × descuento_pct / 100
- **IVA OS** = (subtotal - descuento) × 16%
- **Total OS** = subtotal - descuento + IVA
- **Margen evento** = Ingresos OS (no canceladas) - Costos OC (no draft/canceladas)
- **% Margen** = (Margen / Ingresos) × 100
- **Total prospectado** = precio tardío × cantidad de todos los ítems de la OS (proyección máxima)
- **Utilidad presupuesto** = Ingreso - Costo Directo - Costo Indirecto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS ACTUALES DEL SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCCIONES DE COMPORTAMIENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Responde SIEMPRE en español, de forma clara y precisa
2. Usa los datos reales del sistema cuando estén disponibles; si no están, usa tu conocimiento de procesos para dar respuestas contextualizadas
3. Cuando calcules márgenes: Margen = Ingresos OS - Costos OC; excluye órdenes CANCELLED
4. Puedes hacer análisis de tendencias, comparaciones entre eventos, detección de patrones y recomendaciones estratégicas
5. Si te preguntan sobre un proceso o regla de negocio que no está en los datos (ej: "¿cómo funciona la facturación?"), explícalo basándote en el conocimiento de IventIA documentado arriba
6. Para estimaciones o proyecciones, indica claramente que son proyecciones y explica los supuestos usados
7. Cuando detectes anomalías en los datos (márgenes muy bajos, órdenes estancadas, etc.), mencionalo proactivamente

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
