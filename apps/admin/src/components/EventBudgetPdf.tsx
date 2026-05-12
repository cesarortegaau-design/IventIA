import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer'

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY   = '#1a3a5c'
const BLUE   = '#2e7fc1'
const LIGHT  = '#f0f6ff'
const GRAY   = '#64748b'
const LINE   = '#dde3ec'
const PURPLE = '#5b21b6'
const PURPLEBG = '#ede9fe'
const ROYALBG  = '#dbeafe'
const ROYAL    = '#1d4ed8'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number | string | null | undefined): string {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0)
  if (isNaN(n)) return '$0.00'
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function effectiveCost(line: any, orderKey: 'directOrders' | 'indirectOrders', costField: string): number {
  const orders: any[] = line[orderKey] ?? []
  if (orders.length > 0) return orders.reduce((sum: number, o: any) => sum + Number(o.order?.total || 0), 0)
  return Number(line[costField] || 0)
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 32, paddingBottom: 46,
    paddingLeft: 36, paddingRight: 36,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.4 },
  brandSub: { fontSize: 7.5, color: BLUE, marginTop: 2 },
  docTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  docSub: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  docDate: { fontSize: 7, color: GRAY, textAlign: 'right', marginTop: 3 },

  // Info cards
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  card: { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: 8 },
  cardDark: { flex: 1.4, backgroundColor: NAVY, borderRadius: 5, padding: 8 },
  cardTitle: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardTitleLight: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#7ea8cc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoLine: { flexDirection: 'row', marginBottom: 2 },
  infoLbl: { fontSize: 7, color: GRAY, width: 70 },
  infoVal: { fontSize: 7, color: NAVY, fontFamily: 'Helvetica-Bold', flex: 1 },
  infoValNorm: { fontSize: 7, color: '#1e293b', flex: 1 },
  infoLblLight: { fontSize: 7, color: '#7ea8cc', width: 100 },
  infoValLight: { fontSize: 7, color: '#ffffff', fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' },
  infoValGreen: { fontSize: 7, color: '#4ade80', fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' },
  infoValRed:   { fontSize: 7, color: '#f87171', fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' },

  // Section header band
  sectionHeader: {
    backgroundColor: NAVY, color: '#ffffff',
    fontFamily: 'Helvetica-Bold', fontSize: 7,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 3, marginBottom: 0,
  },

  // Table — group headers
  tableGroupRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3 },
  tableHead: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE },
  tableRowAlt: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: LINE, backgroundColor: '#f8faff' },
  tableRowSub: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: '#eef2ff', backgroundColor: '#fcfcff' },
  tableRowTotals: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 4, backgroundColor: NAVY, marginTop: 1, borderRadius: 2 },

  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: NAVY },
  thR: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  thPres: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: PURPLE, textAlign: 'right' },
  thReal: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: ROYAL, textAlign: 'right' },
  td: { fontSize: 7, color: '#1e293b' },
  tdSub: { fontSize: 6.5, color: GRAY },
  tdR: { fontSize: 7, color: '#1e293b', textAlign: 'right' },
  tdRB: { fontSize: 7, color: '#1e293b', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdPres: { fontSize: 7, color: '#4c1d95', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdReal: { fontSize: 7, color: '#1e3a8a', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdGreen: { fontSize: 7, color: '#16a34a', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdRed:   { fontSize: 7, color: '#dc2626', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  tdTL: { fontSize: 7, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  tdTV: { fontSize: 7, color: '#ffffff', fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  // Column widths
  cConcepto: { width: 115 },
  cAmt: { width: 63 },
  cAmtTC: { width: 60, backgroundColor: '#f1f5f9' },

  // Footer
  footer: {
    position: 'absolute', bottom: 18, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 4,
  },
  footerTxt: { fontSize: 6.5, color: GRAY },
})

// ── Component ─────────────────────────────────────────────────────────────────
export function EventBudgetPdf({ budget, event }: { budget: any; event: any }) {
  const lines: any[] = budget?.lines ?? []
  const today = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const totals = lines.reduce(
    (acc, l) => {
      const dirP  = Number(l.directCostBudgeted   ?? 0)
      const indP  = Number(l.indirectCostBudgeted  ?? 0)
      const totP  = Number(l.utility               ?? 0)
      const dirR  = effectiveCost(l, 'directOrders',   'directCost')
      const indR  = effectiveCost(l, 'indirectOrders', 'indirectCost')
      const totR  = Number(l.income                ?? 0)
      return {
        dirP:  acc.dirP  + dirP,
        indP:  acc.indP  + indP,
        tcP:   acc.tcP   + dirP + indP,
        totP:  acc.totP  + totP,
        dirR:  acc.dirR  + dirR,
        indR:  acc.indR  + indR,
        tcR:   acc.tcR   + dirR + indR,
        totR:  acc.totR  + totR,
      }
    },
    { dirP: 0, indP: 0, tcP: 0, totP: 0, dirR: 0, indR: 0, tcR: 0, totR: 0 },
  )

  const utP = totals.totP - totals.tcP
  const utR = totals.totR - totals.tcR

  return (
    <Document title={`Presupuesto – ${budget?.name ?? ''}`}>
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>IventIA</Text>
            <Text style={s.brandSub}>Gestión de Eventos</Text>
          </View>
          <View>
            <Text style={s.docTitle}>PRESUPUESTO</Text>
            <Text style={s.docSub}>{budget?.name ?? ''}</Text>
            <Text style={s.docDate}>Generado: {today}</Text>
          </View>
        </View>

        {/* ── Info cards ──────────────────────────────────────────────────── */}
        <View style={s.infoRow}>
          {/* Evento */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Evento</Text>
            <View style={s.infoLine}>
              <Text style={s.infoLbl}>Nombre</Text>
              <Text style={s.infoVal}>{event?.name ?? '—'}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLbl}>Inicio</Text>
              <Text style={s.infoValNorm}>{fmtDate(event?.eventStart)}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLbl}>Fin</Text>
              <Text style={s.infoValNorm}>{fmtDate(event?.eventEnd)}</Text>
            </View>
          </View>

          {/* Presupuesto */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Presupuesto</Text>
            <View style={s.infoLine}>
              <Text style={s.infoLbl}>Nombre</Text>
              <Text style={s.infoVal}>{budget?.name ?? '—'}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLbl}>Partidas</Text>
              <Text style={s.infoValNorm}>{lines.length}</Text>
            </View>
            {budget?.notes ? (
              <View style={s.infoLine}>
                <Text style={s.infoLbl}>Notas</Text>
                <Text style={s.infoValNorm}>{budget.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Resumen financiero */}
          <View style={s.cardDark}>
            <Text style={s.cardTitleLight}>Resumen Financiero</Text>
            {/* Header row */}
            <View style={{ flexDirection: 'row', marginBottom: 3, borderBottomWidth: 0.5, borderBottomColor: '#2d5a8a', paddingBottom: 2 }}>
              <Text style={{ width: 100, fontSize: 6, color: '#7ea8cc' }} />
              <Text style={{ flex: 1, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#7ea8cc', textAlign: 'right' }}>PRESUP.</Text>
              <Text style={{ flex: 1, fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#7ea8cc', textAlign: 'right' }}>REAL</Text>
            </View>
            {[
              ['Costo Directo',   fmt(totals.dirP),  fmt(totals.dirR)],
              ['Costo Indirecto', fmt(totals.indP),  fmt(totals.indR)],
              ['Total Costo',     fmt(totals.tcP),   fmt(totals.tcR)],
              ['Total Ingresos',  fmt(totals.totP),  fmt(totals.totR)],
            ].map(([lbl, vP, vR]) => (
              <View key={lbl} style={s.infoLine}>
                <Text style={[s.infoLblLight, { width: 100 }]}>{lbl}</Text>
                <Text style={s.infoValLight}>{vP}</Text>
                <Text style={s.infoValLight}>{vR}</Text>
              </View>
            ))}
            <View style={[s.infoLine, { marginTop: 3, borderTopWidth: 0.5, borderTopColor: '#2d5a8a', paddingTop: 3 }]}>
              <Text style={[s.infoLblLight, { width: 100 }]}>Utilidad</Text>
              <Text style={utP >= 0 ? s.infoValGreen : s.infoValRed}>{fmt(utP)}</Text>
              <Text style={utR >= 0 ? s.infoValGreen : s.infoValRed}>{fmt(utR)}</Text>
            </View>
          </View>
        </View>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <Text style={s.sectionHeader}>Líneas de Presupuesto</Text>
        <View>
          {/* Group header */}
          <View style={[s.tableGroupRow, { backgroundColor: '#1e293b' }]}>
            <View style={s.cConcepto}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#f8fafc' }}>CONCEPTO</Text>
            </View>
            {/* PRESUPUESTADO spans 5 cols */}
            <View style={{ width: 63 * 5, backgroundColor: PURPLE, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 2, marginRight: 2 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#ede9fe', textAlign: 'center', letterSpacing: 0.5 }}>PRESUPUESTADO</Text>
            </View>
            {/* REAL spans 5 cols */}
            <View style={{ width: 63 * 5, backgroundColor: ROYAL, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 2 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#dbeafe', textAlign: 'center', letterSpacing: 0.5 }}>REAL</Text>
            </View>
          </View>

          {/* Sub-header */}
          <View style={[s.tableHead, { backgroundColor: '#e8f0fe' }]}>
            <Text style={[s.th, s.cConcepto]}>Clave / Descripción</Text>
            <Text style={[s.thPres, s.cAmt]}>C. Directo</Text>
            <Text style={[s.thPres, s.cAmt]}>C. Indirecto</Text>
            <Text style={[s.thPres, { ...s.cAmtTC }]}>Tot. Costo</Text>
            <Text style={[s.thPres, s.cAmt]}>Total Pres.</Text>
            <Text style={[s.thPres, s.cAmt]}>Utilidad</Text>
            <Text style={[s.thReal, s.cAmt]}>C. Directo</Text>
            <Text style={[s.thReal, s.cAmt]}>C. Indirecto</Text>
            <Text style={[s.thReal, { ...s.cAmtTC }]}>Tot. Costo</Text>
            <Text style={[s.thReal, s.cAmt]}>Total Real</Text>
            <Text style={[s.thReal, s.cAmt]}>Utilidad</Text>
          </View>

          {/* Lines */}
          {lines.map((line: any, i: number) => {
            const dirP = Number(line.directCostBudgeted   ?? 0)
            const indP = Number(line.indirectCostBudgeted  ?? 0)
            const tcP  = dirP + indP
            const totP = Number(line.utility               ?? 0)
            const utlP = totP - tcP

            const dirR = effectiveCost(line, 'directOrders',   'directCost')
            const indR = effectiveCost(line, 'indirectOrders', 'indirectCost')
            const tcR  = dirR + indR
            const totR = Number(line.income                ?? 0)
            const utlR = totR - tcR

            const directNums  = (line.directOrders ?? []).map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')
            const indirectNums = (line.indirectOrders ?? []).map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')

            return (
              <View key={line.id} wrap={false}>
                <View style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  {/* Concepto */}
                  <View style={s.cConcepto}>
                    <Text style={s.tdSub}>{line.resource?.code ?? ''}{line.resource?.isPackage ? ' ▣' : ''}</Text>
                    <Text style={s.td}>{line.description}</Text>
                    {directNums ? <Text style={{ fontSize: 5.5, color: BLUE }}>D: {directNums}</Text> : null}
                    {indirectNums ? <Text style={{ fontSize: 5.5, color: '#d97706' }}>I: {indirectNums}</Text> : null}
                  </View>

                  {/* PRESUPUESTADO */}
                  <Text style={[s.tdR, s.cAmt]}>{fmt(dirP)}</Text>
                  <Text style={[s.tdR, s.cAmt]}>{fmt(indP)}</Text>
                  <Text style={[s.tdRB, s.cAmtTC]}>{fmt(tcP)}</Text>
                  <Text style={[s.tdPres, s.cAmt]}>{fmt(totP)}</Text>
                  <Text style={[utlP >= 0 ? s.tdGreen : s.tdRed, s.cAmt]}>{fmt(utlP)}</Text>

                  {/* REAL */}
                  <Text style={[s.tdR, s.cAmt]}>{fmt(dirR)}</Text>
                  <Text style={[s.tdR, s.cAmt]}>{fmt(indR)}</Text>
                  <Text style={[s.tdRB, s.cAmtTC]}>{fmt(tcR)}</Text>
                  <Text style={[s.tdReal, s.cAmt]}>{fmt(totR)}</Text>
                  <Text style={[utlR >= 0 ? s.tdGreen : s.tdRed, s.cAmt]}>{fmt(utlR)}</Text>
                </View>

                {/* Package sub-components */}
                {line.resource?.isPackage && (line.resource?.packageComponents ?? []).map((pc: any, ci: number) => (
                  <View key={ci} style={s.tableRowSub}>
                    <Text style={[s.tdSub, s.cConcepto, { paddingLeft: 10 }]}>
                      {pc.componentResource?.code ?? ''}{' '}{pc.componentResource?.name ?? ''}{pc.quantity > 1 ? ` ×${pc.quantity}` : ''}
                    </Text>
                    {[...Array(10)].map((_, k) => (
                      <Text key={k} style={s.cAmt} />
                    ))}
                  </View>
                ))}
              </View>
            )
          })}

          {/* Totals row */}
          <View style={s.tableRowTotals}>
            <Text style={[s.tdTL, s.cConcepto]}>TOTALES</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.dirP)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.indP)}</Text>
            <Text style={[s.tdTV, s.cAmtTC]}>{fmt(totals.tcP)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.totP)}</Text>
            <Text style={[{ fontSize: 7, textAlign: 'right', fontFamily: 'Helvetica-Bold' }, s.cAmt, { color: utP >= 0 ? '#4ade80' : '#f87171' }]}>{fmt(utP)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.dirR)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.indR)}</Text>
            <Text style={[s.tdTV, s.cAmtTC]}>{fmt(totals.tcR)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.totR)}</Text>
            <Text style={[{ fontSize: 7, textAlign: 'right', fontFamily: 'Helvetica-Bold' }, s.cAmt, { color: utR >= 0 ? '#4ade80' : '#f87171' }]}>{fmt(utR)}</Text>
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>IventIA · {event?.name ?? ''} · {budget?.name ?? ''}</Text>
          <Text
            style={s.footerTxt}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
