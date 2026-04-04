import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'

// ── Styles ─────────────────────────────────────────────────────────────────
const NAVY  = '#1a3a5c'
const BLUE  = '#2e7fc1'
const LIGHT = '#f0f6ff'
const GRAY  = '#64748b'
const LINE  = '#dde3ec'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 36, paddingBottom: 48,
    paddingLeft: 40, paddingRight: 40,
  },

  // ── Header ──
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  brandBlock: {},
  brandName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.5 },
  brandSub:  { fontSize: 8, color: BLUE, marginTop: 2 },
  docMeta:   { alignItems: 'flex-end' },
  docTitle:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },
  docNumber: { fontSize: 11, color: BLUE, fontFamily: 'Helvetica-Bold' },
  docDate:   { fontSize: 8, color: GRAY, marginTop: 3 },

  // ── Status badge ──
  statusRow:  { flexDirection: 'row', marginBottom: 18, gap: 6 },
  badge:      { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // ── Two-column info ──
  infoRow:   { flexDirection: 'row', gap: 14, marginBottom: 18 },
  infoCard:  { flex: 1, backgroundColor: LIGHT, borderRadius: 6, padding: 12 },
  infoTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoLine:  { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { fontSize: 8, color: GRAY, width: 72 },
  infoValue: { fontSize: 8, color: NAVY, fontFamily: 'Helvetica-Bold', flex: 1 },
  infoValueNorm: { fontSize: 8, color: '#1e293b', flex: 1 },

  // ── Section headers ──
  sectionHeader: {
    backgroundColor: NAVY, color: '#ffffff',
    fontFamily: 'Helvetica-Bold', fontSize: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 4, marginBottom: 0,
  },

  // ── Line items table ──
  table:      { marginBottom: 18 },
  tableHead:  { flexDirection: 'row', backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 5 },
  tableRow:   { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  tableRowAlt:{ flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#f8faff' },
  thText:     { fontSize: 7, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase' },
  tdText:     { fontSize: 8, color: '#1e293b' },
  tdRight:    { fontSize: 8, color: '#1e293b', textAlign: 'right' },
  tdBold:     { fontSize: 8, color: NAVY, fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  colDesc:  { flex: 3 },
  colQty:   { width: 36, textAlign: 'right' },
  colPrice: { width: 62, textAlign: 'right' },
  colDisc:  { width: 44, textAlign: 'right' },
  colTotal: { width: 68, textAlign: 'right' },

  // ── Totals block ──
  totalsBlock: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 18 },
  totalsCard:  { width: 220 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: LINE },
  totalRowFinal: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, marginTop: 2,
    backgroundColor: NAVY, borderRadius: 4,
    paddingHorizontal: 8,
  },
  totalLabel: { fontSize: 8, color: GRAY },
  totalValue: { fontSize: 8, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  totalLabelFinal: { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },
  totalValueFinal: { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },

  // ── Payments ──
  paymentsBlock: { marginBottom: 18 },
  payHead:  { flexDirection: 'row', backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 5 },
  payRow:   { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: LINE },

  // ── Balance summary ──
  balanceRow: {
    flexDirection: 'row', gap: 12, marginBottom: 20,
  },
  balanceCard: {
    flex: 1, borderRadius: 6, padding: 10,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 7, color: GRAY, marginBottom: 3, textTransform: 'uppercase' },
  balanceValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },

  // ── Notes ──
  notesBlock: { backgroundColor: '#fffbeb', borderRadius: 6, padding: 10, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: '#fbbf24' },
  notesTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 4, textTransform: 'uppercase' },
  notesText:  { fontSize: 8, color: '#78350f', lineHeight: 1.4 },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 24, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: LINE,
    paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#94a3b8' },

  // ── Divider ──
  divider: { borderBottomWidth: 1, borderBottomColor: LINE, marginBottom: 14 },
})

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number | string) {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  if (!withTime) return date
  return `${date}  ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
}

const STATUS_COLOR_BG: Record<string, string> = {
  QUOTED: '#dbeafe', CONFIRMED: '#dcfce7', IN_PAYMENT: '#ffedd5',
  PAID: '#f3e8ff', INVOICED: '#cffafe', CANCELLED: '#fee2e2',
}
const STATUS_COLOR_TXT: Record<string, string> = {
  QUOTED: '#1d4ed8', CONFIRMED: '#15803d', IN_PAYMENT: '#c2410c',
  PAID: '#7e22ce', INVOICED: '#0e7490', CANCELLED: '#b91c1c',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_PAYMENT: 'En Pago',
  PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}
const TIER_LABELS: Record<string, string> = {
  EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío',
}
const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Efectivo', TRANSFER: 'Transferencia', CREDIT_CARD: 'Tarjeta',
  CHECK: 'Cheque', SWIFT: 'Swift',
}

// ── PDF Document ───────────────────────────────────────────────────────────
export function OrderPdf({ order }: { order: any }) {
  const client     = order.client
  const billing    = order.billingClient
  const event      = order.event
  const lineItems  = order.lineItems  ?? []
  const payments   = order.payments   ?? []

  const clientName = client?.companyName
    ?? `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim()

  const billingName = billing?.companyName
    ?? (billing ? `${billing.firstName ?? ''} ${billing.lastName ?? ''}`.trim() : null)

  const balance = Number(order.total) - Number(order.paidAmount)
  const paidPct = Number(order.total) > 0
    ? Math.min(100, Math.round((Number(order.paidAmount) / Number(order.total)) * 100))
    : 0

  return (
    <Document
      title={`Orden ${order.orderNumber}`}
      author="IventIA"
      subject="Orden de Servicio"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.brandBlock}>
            <Text style={s.brandName}>IventIA</Text>
            <Text style={s.brandSub}>Sistema de Gestión de Eventos</Text>
          </View>
          <View style={s.docMeta}>
            <Text style={s.docTitle}>Orden de Servicio</Text>
            <Text style={s.docNumber}>{order.orderNumber}</Text>
            <Text style={s.docDate}>Emitida: {fmtDate(order.createdAt)}</Text>
            {order.startDate && (
              <Text style={s.docDate}>
                Periodo: {fmtDate(order.startDate)} → {fmtDate(order.endDate)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Status badges ──────────────────────────────────────────── */}
        <View style={s.statusRow}>
          <View style={[s.badge, { backgroundColor: STATUS_COLOR_BG[order.status] ?? '#f1f5f9' }]}>
            <Text style={{ color: STATUS_COLOR_TXT[order.status] ?? NAVY }}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: '#f1f5f9' }]}>
            <Text style={{ color: GRAY }}>Precio {TIER_LABELS[order.pricingTier] ?? order.pricingTier}</Text>
          </View>
          {order.stand && (
            <View style={[s.badge, { backgroundColor: '#f0fdf4' }]}>
              <Text style={{ color: '#15803d' }}>Stand {order.stand.code}</Text>
            </View>
          )}
          {order.isCreditNote && (
            <View style={[s.badge, { backgroundColor: '#fee2e2' }]}>
              <Text style={{ color: '#b91c1c' }}>NOTA DE CRÉDITO</Text>
            </View>
          )}
        </View>

        {/* ── Client + Event info ────────────────────────────────────── */}
        <View style={s.infoRow}>
          {/* Client block */}
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Cliente</Text>
            <View style={s.infoLine}>
              <Text style={s.infoLabel}>Nombre</Text>
              <Text style={s.infoValue}>{clientName || '—'}</Text>
            </View>
            {client?.rfc && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>RFC</Text>
                <Text style={s.infoValueNorm}>{client.rfc}</Text>
              </View>
            )}
            {client?.email && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValueNorm}>{client.email}</Text>
              </View>
            )}
            {client?.phone && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Teléfono</Text>
                <Text style={s.infoValueNorm}>{client.phone}</Text>
              </View>
            )}
            {(client?.addressCity || client?.addressState) && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Ubicación</Text>
                <Text style={s.infoValueNorm}>
                  {[client.addressCity, client.addressState].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
            {billingName && billingName !== clientName && (
              <>
                <View style={{ marginTop: 8, marginBottom: 4, borderTopWidth: 1, borderTopColor: LINE }} />
                <Text style={[s.infoTitle, { marginTop: 4 }]}>Facturación</Text>
                <View style={s.infoLine}>
                  <Text style={s.infoLabel}>Razón social</Text>
                  <Text style={s.infoValue}>{billingName}</Text>
                </View>
                {billing?.rfc && (
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>RFC</Text>
                    <Text style={s.infoValueNorm}>{billing.rfc}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Event block */}
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Evento</Text>
            {event && (
              <>
                <View style={s.infoLine}>
                  <Text style={s.infoLabel}>Nombre</Text>
                  <Text style={s.infoValue}>{event.name}</Text>
                </View>
                <View style={s.infoLine}>
                  <Text style={s.infoLabel}>Código</Text>
                  <Text style={s.infoValueNorm}>{event.code}</Text>
                </View>
                {event.venueLocation && (
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Sede</Text>
                    <Text style={s.infoValueNorm}>{event.venueLocation}</Text>
                  </View>
                )}
                {event.eventStart && (
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Inicio</Text>
                    <Text style={s.infoValueNorm}>{fmtDate(event.eventStart)}</Text>
                  </View>
                )}
                {event.eventEnd && (
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Fin</Text>
                    <Text style={s.infoValueNorm}>{fmtDate(event.eventEnd)}</Text>
                  </View>
                )}
              </>
            )}
            <View style={{ marginTop: 8, marginBottom: 4, borderTopWidth: 1, borderTopColor: LINE }} />
            <Text style={[s.infoTitle, { marginTop: 4 }]}>Lista de Precios</Text>
            <View style={s.infoLine}>
              <Text style={s.infoLabel}>Lista</Text>
              <Text style={s.infoValueNorm}>{order.priceList?.name ?? '—'}</Text>
            </View>
            {order.assignedTo && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Asignado a</Text>
                <Text style={s.infoValueNorm}>
                  {order.assignedTo.firstName} {order.assignedTo.lastName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Line items ─────────────────────────────────────────────── */}
        <Text style={s.sectionHeader}>Productos y Servicios</Text>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.thText, s.colDesc]}>Descripción</Text>
            <Text style={[s.thText, s.colQty, { textAlign: 'right' }]}>Cant.</Text>
            <Text style={[s.thText, s.colPrice, { textAlign: 'right' }]}>P. Unit.</Text>
            <Text style={[s.thText, s.colDisc, { textAlign: 'right' }]}>Desc.</Text>
            <Text style={[s.thText, s.colTotal, { textAlign: 'right' }]}>Subtotal</Text>
          </View>
          {lineItems.map((li: any, i: number) => (
            <View key={li.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.colDesc}>
                <Text style={s.tdText}>{li.description}</Text>
                {li.observations && (
                  <Text style={{ fontSize: 7, color: GRAY, marginTop: 1 }}>{li.observations}</Text>
                )}
              </View>
              <Text style={[s.tdRight, s.colQty]}>{Number(li.quantity)}</Text>
              <Text style={[s.tdRight, s.colPrice]}>{fmt(li.unitPrice)}</Text>
              <Text style={[s.tdRight, s.colDisc]}>
                {Number(li.discountPct) > 0 ? `${li.discountPct}%` : '—'}
              </Text>
              <Text style={[s.tdBold, s.colTotal]}>{fmt(li.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ─────────────────────────────────────────────────── */}
        <View style={s.totalsBlock}>
          <View style={s.totalsCard}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{fmt(order.subtotal)}</Text>
            </View>
            {Number(order.discountAmount) > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Descuento</Text>
                <Text style={[s.totalValue, { color: '#dc2626' }]}>-{fmt(order.discountAmount)}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>IVA ({Number(order.taxPct)}%)</Text>
              <Text style={s.totalValue}>{fmt(order.taxAmount)}</Text>
            </View>
            <View style={s.totalRowFinal}>
              <Text style={s.totalLabelFinal}>TOTAL</Text>
              <Text style={s.totalValueFinal}>{fmt(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Balance summary ─────────────────────────────────────────── */}
        <View style={s.balanceRow}>
          <View style={[s.balanceCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={s.balanceLabel}>Total</Text>
            <Text style={[s.balanceValue, { color: NAVY }]}>{fmt(order.total)}</Text>
          </View>
          <View style={[s.balanceCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={s.balanceLabel}>Cobrado</Text>
            <Text style={[s.balanceValue, { color: '#15803d' }]}>{fmt(order.paidAmount)}</Text>
          </View>
          <View style={[s.balanceCard, { backgroundColor: balance > 0 ? '#fff7ed' : '#f0fdf4' }]}>
            <Text style={s.balanceLabel}>Saldo pendiente</Text>
            <Text style={[s.balanceValue, { color: balance > 0 ? '#c2410c' : '#15803d' }]}>
              {fmt(balance)}
            </Text>
          </View>
          <View style={[s.balanceCard, { backgroundColor: '#eff6ff' }]}>
            <Text style={s.balanceLabel}>% Cobrado</Text>
            <Text style={[s.balanceValue, { color: BLUE }]}>{paidPct}%</Text>
          </View>
        </View>

        {/* ── Payments ───────────────────────────────────────────────── */}
        {payments.length > 0 && (
          <View style={s.paymentsBlock}>
            <Text style={s.sectionHeader}>Pagos Registrados</Text>
            <View style={s.payHead}>
              <Text style={[s.thText, { flex: 1 }]}>Fecha</Text>
              <Text style={[s.thText, { flex: 1 }]}>Método</Text>
              <Text style={[s.thText, { flex: 2 }]}>Referencia</Text>
              <Text style={[s.thText, { width: 72, textAlign: 'right' }]}>Monto</Text>
            </View>
            {payments.map((p: any, i: number) => (
              <View key={p.id} style={i % 2 === 0 ? s.payRow : { ...s.payRow, backgroundColor: '#f8faff' }}>
                <Text style={[s.tdText, { flex: 1 }]}>{fmtDate(p.paymentDate)}</Text>
                <Text style={[s.tdText, { flex: 1 }]}>{PAYMENT_METHODS[p.method] ?? p.method}</Text>
                <Text style={[s.tdText, { flex: 2, color: GRAY }]}>{p.reference ?? '—'}</Text>
                <Text style={[s.tdBold, { width: 72 }]}>{fmt(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Notes ──────────────────────────────────────────────────── */}
        {order.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesTitle}>Notas</Text>
            <Text style={s.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>IventIA — Gestión de Eventos</Text>
          <Text style={s.footerText}>{order.orderNumber}  ·  {fmtDate(order.createdAt)}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
