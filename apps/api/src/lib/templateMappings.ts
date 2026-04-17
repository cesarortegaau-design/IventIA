import dayjs from 'dayjs'

function formatDate(d: any): string {
  return d ? dayjs(d).format('DD/MM/YYYY') : ''
}

function formatDateTime(d: any): string {
  return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : ''
}

function formatMoney(v: any): string {
  return Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

function clientName(c: any): string {
  if (!c) return ''
  return c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()
}

// Each mapping: label shown in Word *[Label] → function to extract value from loaded entity
export const EVENT_MAPPINGS: Record<string, (e: any) => string> = {
  'Código del Evento': (e) => e.code || '',
  'Nombre del Evento': (e) => e.name || '',
  'Estado del Evento': (e) => e.status || '',
  'Descripción del Evento': (e) => e.description || '',
  'Ubicación': (e) => e.venueLocation || '',
  'Tipo de Evento': (e) => e.eventType || '',
  'Clase de Evento': (e) => e.eventClass || '',
  'Categoría de Evento': (e) => e.eventCategory || '',
  'Coordinador': (e) => e.coordinator || '',
  'Ejecutivo': (e) => e.executive || '',
  'Fecha Montaje Inicio': (e) => formatDateTime(e.setupStart),
  'Fecha Montaje Fin': (e) => formatDateTime(e.setupEnd),
  'Fecha Evento Inicio': (e) => formatDateTime(e.eventStart),
  'Fecha Evento Fin': (e) => formatDateTime(e.eventEnd),
  'Fecha Desmontaje Inicio': (e) => formatDateTime(e.teardownStart),
  'Fecha Desmontaje Fin': (e) => formatDateTime(e.teardownEnd),
  'Cliente del Evento': (e) => clientName(e.primaryClient),
  'RFC Cliente Evento': (e) => e.primaryClient?.rfc || '',
  'Email Cliente Evento': (e) => e.primaryClient?.email || '',
  'Teléfono Cliente Evento': (e) => e.primaryClient?.phone || '',
  'Notas del Evento': (e) => e.notes || '',
  'Notas del Cliente': (e) => e.clientNotes || '',
}

export const ORDER_MAPPINGS: Record<string, (o: any) => string> = {
  'Número de Orden': (o) => o.orderNumber || '',
  'Estado de la Orden': (o) => o.status || '',
  'Cliente': (o) => clientName(o.client),
  'RFC del Cliente': (o) => o.client?.rfc || '',
  'Régimen Fiscal': (o) => o.client?.taxRegime || '',
  'Email del Cliente': (o) => o.client?.email || '',
  'Teléfono del Cliente': (o) => o.client?.phone || '',
  'Dirección del Cliente': (o) => {
    const c = o.client
    if (!c) return ''
    return [c.addressStreet, c.addressCity, c.addressState, c.addressZip].filter(Boolean).join(', ')
  },
  'Cliente Facturación': (o) => clientName(o.billingClient),
  'RFC Facturación': (o) => o.billingClient?.rfc || '',
  'Nombre del Evento': (o) => o.event?.name || '',
  'Código del Evento': (o) => o.event?.code || '',
  'Stand': (o) => o.stand?.code || '',
  'Lista de Precios': (o) => o.priceList?.name || '',
  'Subtotal': (o) => formatMoney(o.subtotal),
  'Descuento Porcentaje': (o) => `${Number(o.discountPct || 0)}%`,
  'Descuento Monto': (o) => formatMoney(o.discountAmount),
  'IVA Porcentaje': (o) => `${Number(o.taxPct || 0)}%`,
  'IVA Monto': (o) => formatMoney(o.taxAmount),
  'Total': (o) => formatMoney(o.total),
  'Monto Pagado': (o) => formatMoney(o.paidAmount),
  'Saldo': (o) => formatMoney(Number(o.total) - Number(o.paidAmount)),
  'Fecha Inicio': (o) => formatDateTime(o.startDate),
  'Fecha Fin': (o) => formatDateTime(o.endDate),
  'Notas de la Orden': (o) => o.notes || '',
  'Fecha Creación': (o) => formatDate(o.createdAt),
  'Número de Líneas': (o) => String((o.lineItems || []).length),
  'Detalle de la Orden': (o) => {
    const items = o.lineItems || []
    if (items.length === 0) return 'Sin detalle'
    return items.map((li: any, i: number) =>
      `${i + 1}. ${li.resource?.name || ''} - ${li.description || ''} | Cant: ${Number(li.quantity)} | P.U.: $${formatMoney(li.unitPrice)} | Desc: ${Number(li.discountPct || 0)}% | Total: $${formatMoney(li.lineTotal)}`
    ).join('\n')
  },
}

export const CONTRACT_MAPPINGS: Record<string, (c: any) => string> = {
  'Número de Contrato': (c) => c.contractNumber || '',
  'Descripción del Contrato': (c) => c.description || '',
  'Estado del Contrato': (c) => {
    const map: Record<string, string> = { EN_FIRMA: 'En Firma', FIRMADO: 'Firmado', CANCELADO: 'Cancelado' }
    return map[c.status] || c.status || ''
  },
  'Fecha de Firma': (c) => formatDate(c.signingDate),
  'Cliente del Contrato': (c) => clientName(c.client),
  'RFC del Cliente': (c) => c.client?.rfc || '',
  'Régimen Fiscal': (c) => c.client?.taxRegime || '',
  'Email del Cliente': (c) => c.client?.email || '',
  'Teléfono del Cliente': (c) => c.client?.phone || '',
  'Dirección del Cliente': (c) => {
    const cl = c.client
    if (!cl) return ''
    return [cl.addressStreet, cl.addressCity, cl.addressState, cl.addressZip].filter(Boolean).join(', ')
  },
  'Monto Total del Contrato': (c) => formatMoney(c.totalAmount),
  'Monto Pagado del Contrato': (c) => formatMoney(c.paidAmount),
  'Saldo del Contrato': (c) => formatMoney(Number(c.totalAmount) - Number(c.paidAmount)),
  'Notas del Contrato': (c) => c.notes || '',
  'Fecha Creación': (c) => formatDate(c.createdAt),
}

// ─── Table / loop mappings (for *[#Section]...*[/Section] in templates) ───────

export interface TableMapping {
  description: string
  fields: string[]
  resolver: (entity: any) => Record<string, string>[]
}

export const ORDER_TABLE_MAPPINGS: Record<string, TableMapping> = {
  'Detalle': {
    description: 'Líneas de la orden de servicio',
    fields: ['No', 'Recurso', 'Descripción', 'Cantidad', 'Precio Unitario', 'Descuento %', 'Total Línea', 'Observaciones', 'Tier'],
    resolver: (o) => (o.lineItems || []).map((li: any, i: number) => ({
      'No': String(i + 1),
      'Recurso': li.resource?.name || '',
      'Descripción': li.description || '',
      'Cantidad': String(Number(li.quantity)),
      'Precio Unitario': formatMoney(li.unitPrice),
      'Descuento %': `${Number(li.discountPct || 0)}%`,
      'Total Línea': formatMoney(li.lineTotal),
      'Observaciones': li.observations || '',
      'Tier': li.pricingTier || '',
    })),
  },
}

export const CONTRACT_TABLE_MAPPINGS: Record<string, TableMapping> = {
  'Órdenes': {
    description: 'Órdenes de servicio vinculadas al contrato',
    fields: [
      'No', 'Número de Orden', 'Estado', 'Evento', 'Código Evento',
      'Cliente', 'RFC del Cliente', 'Email del Cliente', 'Teléfono del Cliente',
      'Cliente Facturación', 'RFC Facturación',
      'Stand', 'Lista de Precios', 'Tier',
      'Subtotal', 'Descuento %', 'Descuento Monto', 'IVA %', 'IVA Monto',
      'Total', 'Monto Pagado', 'Saldo',
      'Fecha Inicio', 'Fecha Fin', 'Fecha Creación', 'Notas',
    ],
    resolver: (c) => (c.orders || []).map((o: any, i: number) => ({
      'No': String(i + 1),
      'Número de Orden': o.orderNumber || '',
      'Estado': o.status || '',
      'Evento': o.event ? `${o.event.code} - ${o.event.name}` : '',
      'Código Evento': o.event?.code || '',
      'Cliente': clientName(o.client),
      'RFC del Cliente': o.client?.rfc || '',
      'Email del Cliente': o.client?.email || '',
      'Teléfono del Cliente': o.client?.phone || '',
      'Cliente Facturación': clientName(o.billingClient),
      'RFC Facturación': o.billingClient?.rfc || '',
      'Stand': o.stand?.code || '',
      'Lista de Precios': o.priceList?.name || '',
      'Tier': o.pricingTier || '',
      'Subtotal': formatMoney(o.subtotal),
      'Descuento %': `${Number(o.discountPct || 0)}%`,
      'Descuento Monto': formatMoney(o.discountAmount),
      'IVA %': `${Number(o.taxPct || 0)}%`,
      'IVA Monto': formatMoney(o.taxAmount),
      'Total': formatMoney(o.total),
      'Monto Pagado': formatMoney(o.paidAmount),
      'Saldo': formatMoney(Number(o.total) - Number(o.paidAmount)),
      'Fecha Inicio': formatDateTime(o.startDate),
      'Fecha Fin': formatDateTime(o.endDate),
      'Fecha Creación': formatDate(o.createdAt),
      'Notas': o.notes || '',
    })),
  },
  'Detalle Órdenes': {
    description: 'Líneas de detalle de todas las órdenes del contrato',
    fields: [
      'No', 'Número de Orden', 'Recurso', 'Descripción', 'Cantidad',
      'Precio Unitario', 'Descuento %', 'Total Línea', 'Observaciones', 'Tier',
    ],
    resolver: (c) => {
      const rows: Record<string, string>[] = []
      let idx = 1
      for (const o of (c.orders || [])) {
        for (const li of (o.lineItems || [])) {
          rows.push({
            'No': String(idx++),
            'Número de Orden': o.orderNumber || '',
            'Recurso': li.resource?.name || '',
            'Descripción': li.description || '',
            'Cantidad': String(Number(li.quantity)),
            'Precio Unitario': formatMoney(li.unitPrice),
            'Descuento %': `${Number(li.discountPct || 0)}%`,
            'Total Línea': formatMoney(li.lineTotal),
            'Observaciones': li.observations || '',
            'Tier': li.pricingTier || '',
          })
        }
      }
      return rows
    },
  },
  'Pagos Programados': {
    description: 'Calendario de pagos del contrato',
    fields: [
      'No', 'Concepto', 'Vencimiento', 'Monto Esperado', 'Pagado',
      'Saldo', 'Estado', 'Método de Pago', 'Referencia', 'Fecha de Pago', 'Notas Pago',
    ],
    resolver: (c) => (c.scheduledPayments || []).map((sp: any, i: number) => {
      const lastPayment = (sp.payments || []).slice(-1)[0]
      return {
        'No': String(i + 1),
        'Concepto': sp.label || '',
        'Vencimiento': formatDate(sp.dueDate),
        'Monto Esperado': formatMoney(sp.expectedAmount),
        'Pagado': formatMoney(sp.paidAmount),
        'Saldo': formatMoney(Number(sp.expectedAmount) - Number(sp.paidAmount)),
        'Estado': sp.status || '',
        'Método de Pago': lastPayment?.method || '',
        'Referencia': lastPayment?.reference || '',
        'Fecha de Pago': lastPayment ? formatDate(lastPayment.paymentDate) : '',
        'Notas Pago': lastPayment?.notes || '',
      }
    }),
  },
}

export const EVENT_TABLE_MAPPINGS: Record<string, TableMapping> = {
  'Órdenes': {
    description: 'Órdenes de servicio del evento',
    fields: [
      'No', 'Número de Orden', 'Estado', 'Cliente', 'RFC del Cliente',
      'Email del Cliente', 'Teléfono del Cliente',
      'Cliente Facturación', 'RFC Facturación',
      'Stand', 'Lista de Precios', 'Tier',
      'Subtotal', 'Descuento %', 'Descuento Monto', 'IVA %', 'IVA Monto',
      'Total', 'Monto Pagado', 'Saldo',
      'Fecha Inicio', 'Fecha Fin', 'Fecha Creación', 'Notas',
    ],
    resolver: (e) => (e.orders || []).map((o: any, i: number) => ({
      'No': String(i + 1),
      'Número de Orden': o.orderNumber || '',
      'Estado': o.status || '',
      'Cliente': clientName(o.client),
      'RFC del Cliente': o.client?.rfc || '',
      'Email del Cliente': o.client?.email || '',
      'Teléfono del Cliente': o.client?.phone || '',
      'Cliente Facturación': clientName(o.billingClient),
      'RFC Facturación': o.billingClient?.rfc || '',
      'Stand': o.stand?.code || '',
      'Lista de Precios': o.priceList?.name || '',
      'Tier': o.pricingTier || '',
      'Subtotal': formatMoney(o.subtotal),
      'Descuento %': `${Number(o.discountPct || 0)}%`,
      'Descuento Monto': formatMoney(o.discountAmount),
      'IVA %': `${Number(o.taxPct || 0)}%`,
      'IVA Monto': formatMoney(o.taxAmount),
      'Total': formatMoney(o.total),
      'Monto Pagado': formatMoney(o.paidAmount),
      'Saldo': formatMoney(Number(o.total) - Number(o.paidAmount)),
      'Fecha Inicio': formatDateTime(o.startDate),
      'Fecha Fin': formatDateTime(o.endDate),
      'Fecha Creación': formatDate(o.createdAt),
      'Notas': o.notes || '',
    })),
  },
  'Detalle Órdenes': {
    description: 'Líneas de detalle de todas las órdenes del evento',
    fields: [
      'No', 'Número de Orden', 'Recurso', 'Descripción', 'Cantidad',
      'Precio Unitario', 'Descuento %', 'Total Línea', 'Observaciones', 'Tier',
    ],
    resolver: (e) => {
      const rows: Record<string, string>[] = []
      let idx = 1
      for (const o of (e.orders || [])) {
        for (const li of (o.lineItems || [])) {
          rows.push({
            'No': String(idx++),
            'Número de Orden': o.orderNumber || '',
            'Recurso': li.resource?.name || '',
            'Descripción': li.description || '',
            'Cantidad': String(Number(li.quantity)),
            'Precio Unitario': formatMoney(li.unitPrice),
            'Descuento %': `${Number(li.discountPct || 0)}%`,
            'Total Línea': formatMoney(li.lineTotal),
            'Observaciones': li.observations || '',
            'Tier': li.pricingTier || '',
          })
        }
      }
      return rows
    },
  },
  'Espacios Reservados': {
    description: 'Espacios/recursos reservados del evento',
    fields: [
      'No', 'Recurso', 'Código Recurso', 'Tipo Recurso', 'Fase',
      'Fecha Inicio', 'Fecha Fin', 'Notas',
    ],
    resolver: (e) => (e.spaces || []).map((s: any, i: number) => ({
      'No': String(i + 1),
      'Recurso': s.resource?.name || '',
      'Código Recurso': s.resource?.code || '',
      'Tipo Recurso': s.resource?.type || '',
      'Fase': s.phase || '',
      'Fecha Inicio': formatDateTime(s.startTime),
      'Fecha Fin': formatDateTime(s.endTime),
      'Notas': s.notes || '',
    })),
  },
  'Pagos Programados': {
    description: 'Calendario de pagos de los contratos del evento',
    fields: [
      'No', 'Contrato', 'Concepto', 'Vencimiento', 'Monto Esperado', 'Pagado',
      'Saldo', 'Estado', 'Método de Pago', 'Referencia', 'Fecha de Pago', 'Notas Pago',
    ],
    resolver: (e) => {
      const rows: Record<string, string>[] = []
      let idx = 1
      for (const c of (e.contracts || [])) {
        for (const sp of (c.scheduledPayments || [])) {
          const lastPayment = (sp.payments || []).slice(-1)[0]
          rows.push({
            'No': String(idx++),
            'Contrato': c.contractNumber || '',
            'Concepto': sp.label || '',
            'Vencimiento': formatDate(sp.dueDate),
            'Monto Esperado': formatMoney(sp.expectedAmount),
            'Pagado': formatMoney(sp.paidAmount),
            'Saldo': formatMoney(Number(sp.expectedAmount) - Number(sp.paidAmount)),
            'Estado': sp.status || '',
            'Método de Pago': lastPayment?.method || '',
            'Referencia': lastPayment?.reference || '',
            'Fecha de Pago': lastPayment ? formatDate(lastPayment.paymentDate) : '',
            'Notas Pago': lastPayment?.notes || '',
          })
        }
      }
      return rows
    },
  },
}

export const CONTEXT_MAPPINGS: Record<string, Record<string, (entity: any) => string>> = {
  EVENT: EVENT_MAPPINGS,
  ORDER: ORDER_MAPPINGS,
  CONTRACT: CONTRACT_MAPPINGS,
}

export const CONTEXT_TABLE_MAPPINGS: Record<string, Record<string, TableMapping>> = {
  EVENT: EVENT_TABLE_MAPPINGS,
  ORDER: ORDER_TABLE_MAPPINGS,
  CONTRACT: CONTRACT_TABLE_MAPPINGS,
}
