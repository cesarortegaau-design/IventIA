import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer'

// ── Palette (same as OrderPdf) ────────────────────────────────────────────────
const NAVY  = '#1a3a5c'
const BLUE  = '#2e7fc1'
const LIGHT = '#f0f6ff'
const GRAY  = '#64748b'
const LINE  = '#dde3ec'

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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 36, paddingBottom: 46,
    paddingLeft: 40, paddingRight: 40,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  brandName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.4 },
  brandSub: { fontSize: 8, color: BLUE, marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  docSub: { fontSize: 10, color: BLUE, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  docDate: { fontSize: 7.5, color: GRAY, textAlign: 'right', marginTop: 3 },

  // Info cards
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  card: { flex: 1, backgroundColor: LIGHT, borderRadius: 6, padding: 10 },
  cardDark: { flex: 1, backgroundColor: NAVY, borderRadius: 6, padding: 10 },
  cardTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  cardTitleLight: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#7ea8cc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  infoLine: { flexDirection: 'row', marginBottom: 2 },
  infoLbl: { fontSize: 7.5, color: GRAY, width: 84 },
  infoVal: { fontSize: 7.5, color: NAVY, fontFamily: 'Helvetica-Bold', flex: 1 },
  infoValNorm: { fontSize: 7.5, color: '#1e293b', flex: 1 },
  infoLblLight: { fontSize: 7.5, color: '#7ea8cc', width: 84 },
  infoValLight: { fontSize: 7.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', flex: 1 },
  infoValGreen: { fontSize: 7.5, color: '#4ade80', fontFamily: 'Helvetica-Bold', flex: 1 },

  // Section header band
  sectionHeader: {
    backgroundColor: NAVY, color: '#ffffff',
    fontFamily: 'Helvetica-Bold', fontSize: 7.5,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, marginBottom: 0,
  },

  // Table
  tableHead: { flexDirection: 'row', backgroundColor: '#e8f0fe', paddingHorizontal: 6, paddingVertical: 4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  tableRowAlt: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#f8faff' },
  tableRowSub: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: '#eef2ff', backgroundColor: '#fcfcff' },
  tableRowTotals: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 5, backgroundColor: NAVY, marginTop: 1, borderRadius: 2 },

  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase' },
  td: { fontSize: 7.5, color: '#1e293b' },
  tdSub: { fontSize: 7, color: GRAY },
  tdR: { fontSize: 7.5, color: '#1e293b', textAlign: 'right' },
  tdTL: { fontSize: 7.5, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
  tdTV: { fontSize: 7.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', textAlign: 'right' },

  cCode: { width: 72 },
  cDesc: { flex: 1 },
  cAmt: { width: 90 },

  // Footer
  footer: {
    position: 'absolute', bottom: 20, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5,
  },
  footerTxt: { fontSize: 7, color: GRAY },
})

// ── Component ─────────────────────────────────────────────────────────────────
export function EventBudgetPdf({ budget, event }: { budget: any; event: any }) {
  const lines: any[] = budget?.lines ?? []
  const today = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const totals = lines.reduce(
    (acc, l) => ({
      direct:   acc.direct   + Number(l.directCost   ?? 0),
      income:   acc.income   + Number(l.income       ?? 0),
      indirect: acc.indirect + Number(l.indirectCost ?? 0),
      utility:  acc.utility  + Number(l.utility      ?? 0),
    }),
    { direct: 0, income: 0, indirect: 0, utility: 0 },
  )

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
            <View style={s.infoLine}>
              <Text style={s.infoLblLight}>Costo Directo</Text>
              <Text style={s.infoValLight}>{fmt(totals.direct)}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLblLight}>Ingreso</Text>
              <Text style={s.infoValLight}>{fmt(totals.income)}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLblLight}>Costo Indirecto</Text>
              <Text style={s.infoValLight}>{fmt(totals.indirect)}</Text>
            </View>
            <View style={s.infoLine}>
              <Text style={s.infoLblLight}>Utilidad</Text>
              <Text style={s.infoValGreen}>{fmt(totals.utility)}</Text>
            </View>
          </View>
        </View>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <Text style={s.sectionHeader}>Líneas de Presupuesto</Text>
        <View>
          {/* Table header */}
          <View style={s.tableHead}>
            <Text style={[s.th, s.cCode]}>Clave</Text>
            <Text style={[s.th, s.cDesc]}>Descripción</Text>
            <Text style={[s.th, s.cAmt, { textAlign: 'right' }]}>Costo Directo</Text>
            <Text style={[s.th, s.cAmt, { textAlign: 'right' }]}>Ingreso</Text>
            <Text style={[s.th, s.cAmt, { textAlign: 'right' }]}>Costo Indirecto</Text>
            <Text style={[s.th, s.cAmt, { textAlign: 'right' }]}>Utilidad</Text>
          </View>

          {/* Lines */}
          {lines.map((line: any, i: number) => (
            <View key={line.id} wrap={false}>
              {/* Main row */}
              <View style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <View style={s.cCode}>
                  <Text style={s.tdSub}>{line.resource?.code ?? ''}</Text>
                  {line.resource?.isPackage ? (
                    <Text style={{ fontSize: 6.5, color: BLUE }}>▣ Paquete</Text>
                  ) : null}
                </View>

                <View style={s.cDesc}>
                  <Text style={s.td}>{line.description}</Text>
                  {line.directOrders?.length > 0 ? (
                    <Text style={{ fontSize: 6.5, color: BLUE }}>
                      {'D: ' + line.directOrders.map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                  {line.indirectOrders?.length > 0 ? (
                    <Text style={{ fontSize: 6.5, color: '#d97706' }}>
                      {'I: ' + line.indirectOrders.map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                </View>

                <Text style={[s.tdR, s.cAmt]}>{fmt(line.directCost)}</Text>
                <Text style={[s.tdR, s.cAmt]}>{fmt(line.income)}</Text>
                <Text style={[s.tdR, s.cAmt]}>{fmt(line.indirectCost)}</Text>
                <Text style={[s.tdR, s.cAmt]}>{fmt(line.utility)}</Text>
              </View>

              {/* Package sub-components */}
              {line.resource?.isPackage && (line.resource?.packageComponents ?? []).map((pc: any, ci: number) => (
                <View key={ci} style={s.tableRowSub}>
                  <Text style={[s.tdSub, s.cCode, { paddingLeft: 10 }]}>
                    {pc.componentResource?.code ?? ''}
                  </Text>
                  <Text style={[s.td, s.cDesc, { paddingLeft: 10, color: GRAY, fontSize: 7 }]}>
                    {pc.componentResource?.name ?? ''}{pc.quantity > 1 ? ` (×${pc.quantity})` : ''}
                  </Text>
                  <Text style={s.cAmt} />
                  <Text style={s.cAmt} />
                  <Text style={s.cAmt} />
                  <Text style={s.cAmt} />
                </View>
              ))}
            </View>
          ))}

          {/* Totals row */}
          <View style={s.tableRowTotals}>
            <Text style={[s.tdTL, s.cCode]}>TOTALES</Text>
            <Text style={[s.tdTL, s.cDesc]} />
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.direct)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.income)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.indirect)}</Text>
            <Text style={[s.tdTV, s.cAmt]}>{fmt(totals.utility)}</Text>
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
