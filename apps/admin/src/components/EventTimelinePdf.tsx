import {
  Document, Page, View, Text, StyleSheet,
  Svg, Rect, Line, G,
} from '@react-pdf/renderer'

// ── Palette ───────────────────────────────────────────────────────────────────
const NAVY  = '#1a3a5c'
const BLUE  = '#2e7fc1'
const LIGHT = '#f0f6ff'
const GRAY  = '#64748b'
const LINE  = '#dde3ec'

// ── Domain maps ───────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  TASK:      'Tarea',
  MILESTONE: 'Hito',
  PHASE:     'Fase',
  MEETING:   'Reunión',
  REHEARSAL: 'Ensayo',
  LOGISTICS: 'Logística',
  CATERING:  'Catering',
  TECHNICAL: 'Técnico',
  SECURITY:  'Seguridad',
  CUSTOM:    'Personalizado',
}

const TYPE_COLORS: Record<string, string> = {
  TASK:      '#3B82F6',
  MILESTONE: '#8B5CF6',
  PHASE:     '#1a3a5c',
  MEETING:   '#F59E0B',
  REHEARSAL: '#EC4899',
  LOGISTICS: '#10B981',
  CATERING:  '#F97316',
  TECHNICAL: '#6366F1',
  SECURITY:  '#EF4444',
  CUSTOM:    '#64748b',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING:     'Pendiente',
  IN_PROGRESS: 'En Progreso',
  DONE:        'Listo',
  CANCELLED:   'Cancelado',
  BLOCKED:     'Bloqueado',
}

const STATUS_BG: Record<string, string> = {
  PENDING:     '#e2e8f0',
  IN_PROGRESS: '#dbeafe',
  DONE:        '#dcfce7',
  CANCELLED:   '#fee2e2',
  BLOCKED:     '#fef9c3',
}

const STATUS_TXT: Record<string, string> = {
  PENDING:     '#475569',
  IN_PROGRESS: '#1d4ed8',
  DONE:        '#15803d',
  CANCELLED:   '#b91c1c',
  BLOCKED:     '#a16207',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW:      'Baja',
  MEDIUM:   'Media',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const PRIORITY_BG: Record<string, string> = {
  LOW:      '#f1f5f9',
  MEDIUM:   '#dbeafe',
  HIGH:     '#ffedd5',
  CRITICAL: '#fee2e2',
}

const PRIORITY_TXT: Record<string, string> = {
  LOW:      '#64748b',
  MEDIUM:   '#1d4ed8',
  HIGH:     '#c2410c',
  CRITICAL: '#b91c1c',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(mins?: number | null): string {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function flattenTree(activities: any[]): any[] {
  const result: any[] = []
  for (const a of activities) {
    result.push(a)
    if (a.children?.length) {
      for (const child of a.children) {
        result.push({ ...child, _isChild: true })
      }
    }
  }
  return result
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 32, paddingBottom: 44,
    paddingLeft: 36, paddingRight: 36,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.4 },
  brandSub: { fontSize: 7.5, color: BLUE, marginTop: 2 },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, textAlign: 'right' },
  docSub: { fontSize: 9, color: BLUE, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  docDate: { fontSize: 7, color: GRAY, textAlign: 'right', marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: 8 },
  statLabel: { fontSize: 6.5, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  statValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  statSub: { fontSize: 6.5, color: GRAY, marginTop: 1 },

  sectionHeader: {
    backgroundColor: NAVY, color: '#ffffff',
    fontFamily: 'Helvetica-Bold', fontSize: 7.5,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, marginBottom: 0,
  },

  tableHead: { flexDirection: 'row', backgroundColor: '#e8f0fe', paddingHorizontal: 4, paddingVertical: 3.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: LINE },
  tableRowAlt: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#f8faff' },

  th: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: NAVY, textTransform: 'uppercase' },
  td: { fontSize: 7, color: '#1e293b' },
  tdMuted: { fontSize: 6.5, color: GRAY },

  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5 },

  // Column widths – landscape A4 usable: ~770pt (36+36 margins)
  c0:  { width: 22 },   // #
  c1:  { flex: 1 },     // Título
  c2:  { width: 60 },   // Tipo
  c3:  { width: 65 },   // Estado
  c4:  { width: 55 },   // Prioridad
  c5:  { width: 78 },   // Inicio
  c6:  { width: 78 },   // Fin
  c7:  { width: 50 },   // Duración
  c8:  { width: 100 },  // Asignado
  c9:  { width: 80 },   // Órdenes

  footer: {
    position: 'absolute', bottom: 18, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5,
  },
  footerTxt: { fontSize: 6.5, color: GRAY },

  ganttPage: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 32, paddingBottom: 44,
    paddingLeft: 36, paddingRight: 36,
  },
  ganttHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ganttTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  ganttSub: { fontSize: 8, color: GRAY },
})

// ── Gantt SVG page ────────────────────────────────────────────────────────────
// A4 landscape usable: 770 × 521 pt  (842 - 72 padding, 595 - 74 padding/footer)
const CONTENT_W = 770
const TITLE_COL = 190
const BAR_AREA  = CONTENT_W - TITLE_COL
const HDR_H     = 26
const MAX_ROWS_PER_PAGE = 36  // fits comfortably on one gantt page

function GanttPage({
  pageActivities,
  rangeStartMs,
  totalMs,
  event,
  pageNum,
  totalPages,
}: {
  pageActivities: any[]
  rangeStartMs: number
  totalMs: number
  event: any
  pageNum: number
  totalPages: number
}) {
  const ROW_H = Math.max(10, Math.min(20, Math.floor((490 - HDR_H) / pageActivities.length)))
  const GANTT_H = HDR_H + pageActivities.length * ROW_H + 2

  // Compute 6 evenly-spaced tick marks
  const NUM_TICKS = 6
  const ticks = Array.from({ length: NUM_TICKS + 1 }, (_, i) => ({
    ms: rangeStartMs + (totalMs * i) / NUM_TICKS,
    pct: i / NUM_TICKS,
  }))

  function fmtTick(ms: number): string {
    const d = new Date(ms)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
  }

  const today = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <Page size="A4" orientation="landscape" style={s.ganttPage}>
      {/* Page header */}
      <View style={s.ganttHeader}>
        <View>
          <Text style={s.ganttTitle}>Diagrama de Gantt — {event?.name ?? ''}</Text>
          <Text style={s.ganttSub}>
            {new Date(rangeStartMs).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' → '}
            {new Date(rangeStartMs + totalMs).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Text style={{ fontSize: 7, color: GRAY }}>Generado: {today}</Text>
      </View>

      {/* Type legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ fontSize: 6.5, color: GRAY }}>{TYPE_LABELS[type] ?? type}</Text>
          </View>
        ))}
      </View>

      {/* Gantt SVG */}
      <Svg width={CONTENT_W} height={GANTT_H}>
        {/* White base */}
        <Rect x={0} y={0} width={CONTENT_W} height={GANTT_H} fill="#ffffff" />

        {/* Title column background */}
        <Rect x={0} y={0} width={TITLE_COL} height={GANTT_H} fill="#f8faff" />

        {/* Header row background */}
        <Rect x={0} y={0} width={CONTENT_W} height={HDR_H} fill="#e8f0fe" />

        {/* "Actividad" header label */}
        <Text x={6} y={HDR_H * 0.66} fontSize={7} fill={NAVY} fontFamily="Helvetica-Bold">
          Actividad
        </Text>

        {/* Date tick labels in header */}
        {ticks.map((tick, i) => {
          const x = TITLE_COL + tick.pct * BAR_AREA
          // Shift rightmost label left so it doesn't overflow
          const labelX = i === NUM_TICKS ? x - 28 : x + 2
          return (
            <Text key={i} x={labelX} y={HDR_H * 0.66} fontSize={6} fill={GRAY}>
              {fmtTick(tick.ms)}
            </Text>
          )
        })}

        {/* Vertical grid lines */}
        {ticks.map((tick, i) => {
          const x = TITLE_COL + tick.pct * BAR_AREA
          return (
            <Line
              key={i}
              x1={x} y1={HDR_H}
              x2={x} y2={GANTT_H}
              stroke={LINE}
              strokeWidth={i === 0 || i === NUM_TICKS ? 0.8 : 0.3}
            />
          )
        })}

        {/* Activity rows */}
        {pageActivities.map((a: any, i: number) => {
          const rowY = HDR_H + i * ROW_H
          const isChild = a._isChild || !!a.parentId
          const startMs = new Date(a.startDate).getTime()
          const endMs   = new Date(a.endDate).getTime()
          const leftPct  = (startMs - rangeStartMs) / totalMs
          const widthPct = (endMs - startMs) / totalMs
          const barX = TITLE_COL + Math.max(0, leftPct) * BAR_AREA
          const barW = Math.max(widthPct * BAR_AREA, 3)
          const barColor = a.color || TYPE_COLORS[a.activityType] || '#3B82F6'
          const barH = Math.max(ROW_H - 6, 4)
          const barY = rowY + (ROW_H - barH) / 2
          const bgFill = i % 2 === 0 ? '#ffffff' : '#f9fafb'
          const textFS = ROW_H >= 16 ? 7 : ROW_H >= 12 ? 6 : 5.5
          const maxLen = isChild ? 27 : 30
          const title = (a.title?.length ?? 0) > maxLen
            ? a.title.slice(0, maxLen - 1) + '…'
            : (a.title ?? '')

          return (
            <G key={a.id}>
              {/* Row background */}
              <Rect x={0} y={rowY} width={CONTENT_W} height={ROW_H} fill={bgFill} />
              {/* Row separator */}
              <Line x1={0} y1={rowY + ROW_H} x2={CONTENT_W} y2={rowY + ROW_H} stroke="#eef2f7" strokeWidth={0.3} />

              {/* Activity title */}
              <Text
                x={isChild ? 14 : 5}
                y={rowY + ROW_H * 0.67}
                fontSize={textFS}
                fill={isChild ? GRAY : NAVY}
              >
                {title}
              </Text>

              {/* Gantt bar */}
              <Rect x={barX} y={barY} width={barW} height={barH} fill={barColor} rx={2} />

              {/* Bar label – only when bar is wide enough */}
              {barW > 45 && ROW_H >= 13 ? (
                <Text
                  x={barX + 3}
                  y={barY + barH * 0.7}
                  fontSize={Math.min(textFS - 0.5, 5.5)}
                  fill="#ffffff"
                >
                  {title.length > 18 ? title.slice(0, 16) + '…' : title}
                </Text>
              ) : null}
            </G>
          )
        })}

        {/* Title / bar area separator */}
        <Line x1={TITLE_COL} y1={0} x2={TITLE_COL} y2={GANTT_H} stroke={LINE} strokeWidth={1} />

        {/* Outer border */}
        <Rect x={0} y={0} width={CONTENT_W} height={GANTT_H} fill="none" stroke={LINE} strokeWidth={0.5} />
      </Svg>

      {/* Footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerTxt}>IventIA · {event?.name ?? ''} · Timeline</Text>
        <Text style={s.footerTxt}>
          {totalPages > 1 ? `Gantt ${pageNum} de ${totalPages}` : 'Gantt'}
        </Text>
      </View>
    </Page>
  )
}

// ── Main PDF component ────────────────────────────────────────────────────────
export function EventTimelinePdf({ activities, event }: { activities: any[]; event: any }) {
  const flat = flattenTree(activities)

  // ── Statistics ──────────────────────────────────────────────────────────────
  const total = flat.length
  const done  = flat.filter(a => a.status === 'DONE').length
  const inPrg = flat.filter(a => a.status === 'IN_PROGRESS').length
  const pend  = flat.filter(a => a.status === 'PENDING').length

  const today = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // ── Gantt date range ────────────────────────────────────────────────────────
  const withDates = flat.filter(a => a.startDate && a.endDate)
  const allMs = withDates.flatMap(a => [
    new Date(a.startDate).getTime(),
    new Date(a.endDate).getTime(),
  ])
  if (event?.eventStart) allMs.push(new Date(event.eventStart).getTime())
  if (event?.eventEnd)   allMs.push(new Date(event.eventEnd).getTime())

  const rangeStartMs = allMs.length ? Math.min(...allMs) : Date.now()
  const rangeEndMs   = allMs.length ? Math.max(...allMs) : Date.now() + 86400_000
  const totalMs = Math.max(rangeEndMs - rangeStartMs, 1)

  // Split Gantt into pages of MAX_ROWS_PER_PAGE
  const ganttPages: any[][] = []
  for (let i = 0; i < withDates.length; i += MAX_ROWS_PER_PAGE) {
    ganttPages.push(withDates.slice(i, i + MAX_ROWS_PER_PAGE))
  }

  return (
    <Document title={`Timeline – ${event?.name ?? ''}`}>

      {/* ── Page 1: Activities table ──────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>IventIA</Text>
            <Text style={s.brandSub}>Gestión de Eventos</Text>
          </View>
          <View>
            <Text style={s.docTitle}>TIMELINE</Text>
            <Text style={s.docSub}>{event?.name ?? ''}</Text>
            <Text style={s.docDate}>Generado: {today}</Text>
          </View>
        </View>

        {/* Stats cards */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Total actividades</Text>
            <Text style={s.statValue}>{total}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={[s.statLabel, { color: '#15803d' }]}>Listas</Text>
            <Text style={[s.statValue, { color: '#15803d' }]}>{done}</Text>
            <Text style={s.statSub}>{total ? Math.round((done / total) * 100) : 0}%</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: '#dbeafe' }]}>
            <Text style={[s.statLabel, { color: '#1d4ed8' }]}>En Progreso</Text>
            <Text style={[s.statValue, { color: '#1d4ed8' }]}>{inPrg}</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[s.statLabel, { color: '#475569' }]}>Pendientes</Text>
            <Text style={[s.statValue, { color: '#475569' }]}>{pend}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Con fechas (Gantt)</Text>
            <Text style={s.statValue}>{withDates.length}</Text>
            <Text style={s.statSub}>
              {event?.eventStart
                ? new Date(event.eventStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                : '—'}
              {' → '}
              {event?.eventEnd
                ? new Date(event.eventEnd).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                : '—'}
            </Text>
          </View>
        </View>

        {/* Table header band */}
        <Text style={s.sectionHeader}>Actividades</Text>

        {/* Table */}
        <View>
          <View style={s.tableHead}>
            <Text style={[s.th, s.c0]}>#</Text>
            <Text style={[s.th, s.c1]}>Título</Text>
            <Text style={[s.th, s.c2]}>Tipo</Text>
            <Text style={[s.th, s.c3]}>Estado</Text>
            <Text style={[s.th, s.c4]}>Prioridad</Text>
            <Text style={[s.th, s.c5]}>Inicio</Text>
            <Text style={[s.th, s.c6]}>Fin</Text>
            <Text style={[s.th, s.c7]}>Duración</Text>
            <Text style={[s.th, s.c8]}>Asignado</Text>
            <Text style={[s.th, s.c9]}>Órdenes</Text>
          </View>

          {flat.map((a: any, i: number) => {
            const isChild = a._isChild || !!a.parentId
            const orders = a.activityOrders?.length
              ? a.activityOrders.map((ao: any) => ao.order?.orderNumber).filter(Boolean).join(', ')
              : a.order?.orderNumber ?? '—'
            const depts = (a.activityDepartments ?? [])
              .map((d: any) => d.department?.name).filter(Boolean).join(', ')
            const assignedName = a.assignedTo
              ? `${a.assignedTo.firstName ?? ''} ${a.assignedTo.lastName ?? ''}`.trim()
              : '—'

            return (
              <View key={a.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                {/* # */}
                <Text style={[s.tdMuted, s.c0]}>{a.position ?? '—'}</Text>

                {/* Título */}
                <View style={s.c1}>
                  <Text style={[s.td, { paddingLeft: isChild ? 10 : 0, fontFamily: isChild ? 'Helvetica' : 'Helvetica-Bold', fontSize: isChild ? 6.5 : 7 }]}>
                    {a.title}
                  </Text>
                  {depts ? (
                    <Text style={[s.tdMuted, { paddingLeft: isChild ? 10 : 0 }]}>{depts}</Text>
                  ) : null}
                </View>

                {/* Tipo */}
                <View style={s.c2}>
                  {a.activityType ? (
                    <View style={[s.badge, { backgroundColor: TYPE_COLORS[a.activityType] + '22' }]}>
                      <Text style={{ fontSize: 6.5, color: TYPE_COLORS[a.activityType] ?? NAVY }}>
                        {TYPE_LABELS[a.activityType] ?? a.activityType}
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.tdMuted}>—</Text>
                  )}
                </View>

                {/* Estado */}
                <View style={s.c3}>
                  {a.status ? (
                    <View style={[s.badge, { backgroundColor: STATUS_BG[a.status] ?? '#f1f5f9' }]}>
                      <Text style={{ fontSize: 6.5, color: STATUS_TXT[a.status] ?? GRAY }}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.tdMuted}>—</Text>
                  )}
                </View>

                {/* Prioridad */}
                <View style={s.c4}>
                  {a.priority ? (
                    <View style={[s.badge, { backgroundColor: PRIORITY_BG[a.priority] ?? '#f1f5f9' }]}>
                      <Text style={{ fontSize: 6.5, color: PRIORITY_TXT[a.priority] ?? GRAY }}>
                        {PRIORITY_LABELS[a.priority] ?? a.priority}
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.tdMuted}>—</Text>
                  )}
                </View>

                {/* Inicio */}
                <Text style={[s.td, s.c5]}>{fmtDate(a.startDate)}</Text>

                {/* Fin */}
                <Text style={[s.td, s.c6]}>{fmtDate(a.endDate)}</Text>

                {/* Duración */}
                <Text style={[s.td, s.c7]}>{fmtDuration(a.durationMins)}</Text>

                {/* Asignado */}
                <Text style={[s.td, s.c8]}>{assignedName}</Text>

                {/* Órdenes */}
                <Text style={[s.tdMuted, s.c9, { fontSize: 6.5 }]}>{orders}</Text>
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>IventIA · {event?.name ?? ''} · Timeline</Text>
          <Text
            style={s.footerTxt}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ── Gantt pages ───────────────────────────────────────────────────── */}
      {ganttPages.map((pageActs, pi) => (
        <GanttPage
          key={pi}
          pageActivities={pageActs}
          rangeStartMs={rangeStartMs}
          totalMs={totalMs}
          event={event}
          pageNum={pi + 1}
          totalPages={ganttPages.length}
        />
      ))}

    </Document>
  )
}
