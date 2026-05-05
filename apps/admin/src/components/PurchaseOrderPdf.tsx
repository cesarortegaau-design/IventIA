import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer'

// ── Palette ────────────────────────────────────────────────────────────────────
const NAVY   = '#1a3a5c'
const BLUE   = '#2e7fc1'
const GREEN  = '#059669'
const ORANGE = '#d97706'
const RED    = '#dc2626'
const LIGHT  = '#f0f6ff'
const GRAY   = '#64748b'
const LINE   = '#dde3ec'
const AMBER  = '#92400e'

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 36, paddingBottom: 52,
    paddingLeft: 40, paddingRight: 40,
  },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  brandName:  { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.5 },
  brandSub:   { fontSize: 7.5, color: BLUE, marginTop: 2 },
  docMeta:    { alignItems: 'flex-end' },
  docTitle:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  docNumber:  { fontSize: 11, color: BLUE, fontFamily: 'Helvetica-Bold' },
  docDate:    { fontSize: 7.5, color: GRAY, marginTop: 3 },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: LINE, marginBottom: 14 },

  // Status badge row
  statusRow: { flexDirection: 'row', marginBottom: 16, gap: 6, flexWrap: 'wrap' },
  badge:     { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, fontSize: 7.5, fontFamily: 'Helvetica-Bold' },

  // Two-column info cards
  infoRow:   { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoCard:  { flex: 1, backgroundColor: LIGHT, borderRadius: 6, padding: 11 },
  infoTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoLine:  { flexDirection: 'row', marginBottom: 3, alignItems: 'flex-start' },
  infoLabel: { fontSize: 7.5, color: GRAY, width: 80 },
  infoVal:   { fontSize: 7.5, color: '#1e293b', flex: 1 },
  infoValB:  { fontSize: 7.5, color: NAVY,     flex: 1, fontFamily: 'Helvetica-Bold' },
  infoSep:   { borderTopWidth: 1, borderTopColor: LINE, marginVertical: 6 },

  // Section header bar
  sectionHeader: {
    backgroundColor: NAVY, color: '#fff',
    fontFamily: 'Helvetica-Bold', fontSize: 7.5,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 4, marginBottom: 0,
  },

  // Table
  table:       { marginBottom: 16 },
  tableHead:   { flexDirection: 'row', backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 5 },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  tableRowAlt: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#f8faff' },
  th:          { fontSize: 7, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase' },
  td:          { fontSize: 8, color: '#1e293b' },
  tdR:         { fontSize: 8, color: '#1e293b', textAlign: 'right' },
  tdB:         { fontSize: 8, color: NAVY, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  tdGray:      { fontSize: 7.5, color: GRAY, marginTop: 1 },

  // Column widths
  cCode:  { width: 52 },
  cDesc:  { flex: 3 },
  cUnit:  { width: 38, textAlign: 'center' },
  cQty:   { width: 36, textAlign: 'right' },
  cPrice: { width: 68, textAlign: 'right' },
  cRecv:  { width: 52, textAlign: 'right' },
  cTotal: { width: 72, textAlign: 'right' },

  // Totals
  totalsBlock:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  totalsCard:     { width: 230 },
  totalRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: LINE },
  totalRowFinal:  {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 5, paddingHorizontal: 8, marginTop: 2,
    backgroundColor: NAVY, borderRadius: 4,
  },
  totalLabel:      { fontSize: 8, color: GRAY },
  totalValue:      { fontSize: 8, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  totalLabelFinal: { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },
  totalValueFinal: { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },

  // Reception progress
  recepCard: { backgroundColor: '#f0fdf4', borderRadius: 6, padding: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recepLabel: { fontSize: 7.5, color: GREEN, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  recepVal:   { fontSize: 10, color: GREEN, fontFamily: 'Helvetica-Bold' },

  // Notes
  notesBlock: { backgroundColor: '#fffbeb', borderRadius: 6, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#fbbf24' },
  notesTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: AMBER, marginBottom: 4, textTransform: 'uppercase' },
  notesText:  { fontSize: 8, color: '#78350f', lineHeight: 1.4 },

  // History timeline
  historyBlock: { marginBottom: 14 },
  historyRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  historyDot:   { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  historyText:  { fontSize: 8, color: '#1e293b', flex: 1 },
  historyMeta:  { fontSize: 7.5, color: GRAY },

  // Footer
  footer: {
    position: 'absolute', bottom: 22, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: LINE,
    paddingTop: 7, flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
})

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number | string) {
  const v = Number(n)
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PO_STATUS_BG: Record<string, string> = {
  DRAFT:              '#f1f5f9',
  CONFIRMED:          '#dbeafe',
  PARTIALLY_RECEIVED: '#fff7ed',
  RECEIVED:           '#dcfce7',
  INVOICED:           '#f3e8ff',
  CANCELLED:          '#fee2e2',
}
const PO_STATUS_TXT: Record<string, string> = {
  DRAFT:              '#475569',
  CONFIRMED:          '#1d4ed8',
  PARTIALLY_RECEIVED: '#c2410c',
  RECEIVED:           '#15803d',
  INVOICED:           '#7e22ce',
  CANCELLED:          '#b91c1c',
}
const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT:              'Borrador',
  CONFIRMED:          'Confirmada',
  PARTIALLY_RECEIVED: 'Recibida parcial',
  RECEIVED:           'Recibida total',
  INVOICED:           'Facturada',
  CANCELLED:          'Anulada',
}
const PO_STATUS_DOT: Record<string, string> = {
  DRAFT:              GRAY,
  CONFIRMED:          BLUE,
  PARTIALLY_RECEIVED: ORANGE,
  RECEIVED:           GREEN,
  INVOICED:           '#7e22ce',
  CANCELLED:          RED,
}

// ── Component ──────────────────────────────────────────────────────────────────
export function PurchaseOrderPdf({ po }: { po: any }) {
  const supplier   = po.supplier   ?? {}
  const lineItems  = po.lineItems  ?? []
  const history    = po.statusHistory ?? []

  const subtotal = Number(po.subtotal  ?? 0)
  const taxAmt   = Number(po.taxAmount ?? 0)
  const total    = Number(po.total     ?? 0)
  const taxRate  = Number(po.taxRate   ?? 0)
  // taxRate stored as decimal (0.16) → display 16
  const taxPct   = taxRate <= 1 ? taxRate * 100 : taxRate

  const totalLines    = lineItems.length
  const receivedLines = lineItems.filter((li: any) => Number(li.receivedQty ?? 0) >= Number(li.quantity)).length
  const recepPct      = totalLines > 0 ? Math.round((receivedLines / totalLines) * 100) : 0
  const anyReceived   = lineItems.some((li: any) => Number(li.receivedQty ?? 0) > 0)

  const currency = po.currency || 'MXN'

  return (
    <Document
      title={`OC ${po.orderNumber}`}
      author="IventIA"
      subject="Orden de Compra"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>IventIA</Text>
            <Text style={s.brandSub}>Sistema de Gestión de Eventos</Text>
          </View>
          <View style={s.docMeta}>
            <Text style={s.docTitle}>Orden de Compra</Text>
            <Text style={s.docNumber}>{po.orderNumber}</Text>
            <Text style={s.docDate}>Emitida: {fmtDate(po.createdAt)}</Text>
            {po.confirmedAt && (
              <Text style={s.docDate}>Confirmada: {fmtDate(po.confirmedAt)}</Text>
            )}
            <Text style={s.docDate}>Divisa: {currency}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Status badges ── */}
        <View style={s.statusRow}>
          <View style={[s.badge, { backgroundColor: PO_STATUS_BG[po.status] ?? '#f1f5f9' }]}>
            <Text style={{ color: PO_STATUS_TXT[po.status] ?? NAVY }}>
              {PO_STATUS_LABEL[po.status] ?? po.status}
            </Text>
          </View>
          {po.originOrder && (
            <View style={[s.badge, { backgroundColor: '#eff6ff' }]}>
              <Text style={{ color: BLUE }}>OS Origen: {po.originOrder.orderNumber}</Text>
            </View>
          )}
          {po.organizacion && (
            <View style={[s.badge, { backgroundColor: '#f8fafc' }]}>
              <Text style={{ color: GRAY }}>{po.organizacion.clave} — {po.organizacion.descripcion}</Text>
            </View>
          )}
        </View>

        {/* ── Supplier + OC Details ── */}
        <View style={s.infoRow}>
          {/* Supplier */}
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Proveedor</Text>
            <View style={s.infoLine}>
              <Text style={s.infoLabel}>Nombre</Text>
              <Text style={s.infoValB}>{supplier.name || '—'}</Text>
            </View>
            {supplier.code && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Código</Text>
                <Text style={s.infoVal}>{supplier.code}</Text>
              </View>
            )}
            {supplier.rfc && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>RFC</Text>
                <Text style={s.infoVal}>{supplier.rfc}</Text>
              </View>
            )}
            {supplier.legalName && supplier.legalName !== supplier.name && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Razón social</Text>
                <Text style={s.infoVal}>{supplier.legalName}</Text>
              </View>
            )}
            {supplier.email && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoVal}>{supplier.email}</Text>
              </View>
            )}
            {supplier.phone && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Teléfono</Text>
                <Text style={s.infoVal}>{supplier.phone}</Text>
              </View>
            )}
            {(supplier.addressCity || supplier.addressState) && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Ciudad</Text>
                <Text style={s.infoVal}>
                  {[supplier.addressCity, supplier.addressState].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
            {/* Contact person */}
            {po.contact && (
              <>
                <View style={s.infoSep} />
                <Text style={s.infoTitle}>Contacto</Text>
                <View style={s.infoLine}>
                  <Text style={s.infoLabel}>Nombre</Text>
                  <Text style={s.infoVal}>{po.contact.name}</Text>
                </View>
                {po.contact.role && (
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Cargo</Text>
                    <Text style={s.infoVal}>{po.contact.role}</Text>
                  </View>
                )}
                {po.contact.email && (
                  <View style={s.infoLine}>
                    <Text style={s.infoLabel}>Email</Text>
                    <Text style={s.infoVal}>{po.contact.email}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* OC Details */}
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Datos de la Orden</Text>
            <View style={s.infoLine}>
              <Text style={s.infoLabel}>Número OC</Text>
              <Text style={s.infoValB}>{po.orderNumber}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLabel}>Creada</Text>
              <Text style={s.infoVal}>{fmtDate(po.createdAt)}</Text>
            </View>
            {po.createdBy && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Creado por</Text>
                <Text style={s.infoVal}>{po.createdBy.firstName} {po.createdBy.lastName}</Text>
              </View>
            )}
            {po.confirmedBy && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Confirmado por</Text>
                <Text style={s.infoVal}>{po.confirmedBy.firstName} {po.confirmedBy.lastName}</Text>
              </View>
            )}
            <View style={s.infoSep} />
            <View style={s.infoLine}>
              <Text style={s.infoLabel}>Fecha entrega</Text>
              <Text style={s.infoValB}>{fmtDate(po.requiredDeliveryDate)}</Text>
            </View>
            {po.deliveryLocation && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Lugar entrega</Text>
                <Text style={s.infoVal}>{po.deliveryLocation}</Text>
              </View>
            )}
            {po.priceList && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Lista precios</Text>
                <Text style={s.infoVal}>{po.priceList.name}</Text>
              </View>
            )}
            {supplier.defaultPaymentTerms && (
              <View style={s.infoLine}>
                <Text style={s.infoLabel}>Cond. pago</Text>
                <Text style={s.infoVal}>{supplier.defaultPaymentTerms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Reception summary (only if anything has been received) ── */}
        {anyReceived && (
          <View style={s.recepCard}>
            <View>
              <Text style={s.recepLabel}>Avance de recepción</Text>
              <Text style={s.recepVal}>{recepPct}%</Text>
            </View>
            <Text style={{ fontSize: 7.5, color: GRAY, flex: 1 }}>
              {receivedLines} de {totalLines} línea{totalLines !== 1 ? 's' : ''} recibida{receivedLines !== 1 ? 's' : ''} en su totalidad
            </Text>
          </View>
        )}

        {/* ── Line items ── */}
        <Text style={s.sectionHeader}>Líneas de Orden</Text>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, s.cCode]}>Código</Text>
            <Text style={[s.th, s.cDesc]}>Descripción</Text>
            <Text style={[s.th, s.cUnit]}>Unidad</Text>
            <Text style={[s.th, s.cQty]}>Cant.</Text>
            <Text style={[s.th, s.cPrice]}>P. Unit.</Text>
            {anyReceived && <Text style={[s.th, s.cRecv]}>Recibido</Text>}
            <Text style={[s.th, s.cTotal]}>Total</Text>
          </View>

          {lineItems.map((li: any, i: number) => (
            <View key={li.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.td, s.cCode, { fontFamily: 'Helvetica', fontSize: 7.5 }]}>
                {li.resource?.code ?? '—'}
              </Text>
              <View style={s.cDesc}>
                <Text style={s.td}>{li.description || li.resource?.name || '—'}</Text>
                {li.supplierSku && (
                  <Text style={s.tdGray}>SKU prov: {li.supplierSku}</Text>
                )}
                {li.notes && (
                  <Text style={s.tdGray}>{li.notes}</Text>
                )}
              </View>
              <Text style={[s.td, s.cUnit, { textAlign: 'center' }]}>
                {li.resource?.unit ?? '—'}
              </Text>
              <Text style={[s.tdR, s.cQty]}>{Number(li.quantity)}</Text>
              <Text style={[s.tdR, s.cPrice]}>{fmt(li.unitPrice)}</Text>
              {anyReceived && (
                <Text style={[s.tdR, s.cRecv, {
                  color: Number(li.receivedQty ?? 0) >= Number(li.quantity) ? GREEN : ORANGE,
                  fontFamily: 'Helvetica-Bold',
                }]}>
                  {Number(li.receivedQty ?? 0)}/{Number(li.quantity)}
                </Text>
              )}
              <Text style={[s.tdB, s.cTotal]}>{fmt(li.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsBlock}>
          <View style={s.totalsCard}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{fmt(subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>IVA ({taxPct.toFixed(0)}%)</Text>
              <Text style={s.totalValue}>{fmt(taxAmt)}</Text>
            </View>
            <View style={s.totalRowFinal}>
              <Text style={s.totalLabelFinal}>TOTAL {currency}</Text>
              <Text style={s.totalValueFinal}>{fmt(total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes / Description ── */}
        {(po.description || po.notes) && (
          <View style={s.notesBlock}>
            <Text style={s.notesTitle}>Notas</Text>
            {po.description && <Text style={s.notesText}>{po.description}</Text>}
            {po.notes && po.notes !== po.description && (
              <Text style={[s.notesText, { marginTop: po.description ? 4 : 0 }]}>{po.notes}</Text>
            )}
          </View>
        )}

        {/* ── Status history ── */}
        {history.length > 0 && (
          <View style={s.historyBlock}>
            <Text style={[s.sectionHeader, { marginBottom: 8 }]}>Historial de Estado</Text>
            {history.map((h: any, i: number) => (
              <View key={i} style={s.historyRow}>
                <View style={[s.historyDot, { backgroundColor: PO_STATUS_DOT[h.toStatus] ?? GRAY }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.historyText}>
                    {PO_STATUS_LABEL[h.fromStatus] ?? h.fromStatus}
                    {' → '}
                    {PO_STATUS_LABEL[h.toStatus] ?? h.toStatus}
                  </Text>
                  <Text style={s.historyMeta}>
                    {h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : '—'}
                    {' · '}
                    {fmtDate(h.createdAt)}
                    {h.notes ? `  "${h.notes}"` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>IventIA — Gestión de Eventos</Text>
          <Text style={s.footerText}>{po.orderNumber} · Proveedor: {supplier.name ?? '—'}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
