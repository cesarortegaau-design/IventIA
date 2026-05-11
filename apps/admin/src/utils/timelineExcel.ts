import ExcelJS from 'exceljs'

// ── Palettes ──────────────────────────────────────────────────────────────────
const C = {
  navy:    'FF1a3a5c',
  blue:    'FF2e7fc1',
  light:   'FFf0f6ff',
  lightBg: 'FFf8faff',
  gray:    'FF64748b',
  line:    'FFdde3ec',
  white:   'FFFFFFFF',
  lightGray: 'FFe8f0fe',
}

const TYPE_COLORS: Record<string, string> = {
  TASK:      'FF3B82F6',
  MILESTONE: 'FF8B5CF6',
  PHASE:     'FF1a3a5c',
  MEETING:   'FFF59E0B',
  REHEARSAL: 'FFEC4899',
  LOGISTICS: 'FF10B981',
  CATERING:  'FFF97316',
  TECHNICAL: 'FF6366F1',
  SECURITY:  'FFEF4444',
  CUSTOM:    'FF64748b',
}

const TYPE_LABELS: Record<string, string> = {
  TASK: 'Tarea', MILESTONE: 'Hito', PHASE: 'Fase',
  MEETING: 'Reunión', REHEARSAL: 'Ensayo', LOGISTICS: 'Logística',
  CATERING: 'Catering', TECHNICAL: 'Técnico', SECURITY: 'Seguridad', CUSTOM: 'Personalizado',
}

const STATUS_BG: Record<string, string>  = {
  PENDING: 'FFe2e8f0', IN_PROGRESS: 'FFdbeafe', DONE: 'FFdcfce7', CANCELLED: 'FFfee2e2', BLOCKED: 'FFfef9c3',
}
const STATUS_TXT: Record<string, string> = {
  PENDING: 'FF475569', IN_PROGRESS: 'FF1d4ed8', DONE: 'FF15803d', CANCELLED: 'FFb91c1c', BLOCKED: 'FFa16207',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', IN_PROGRESS: 'En Progreso', DONE: 'Listo', CANCELLED: 'Cancelado', BLOCKED: 'Bloqueado',
}

const PRIORITY_BG: Record<string, string> = {
  LOW: 'FFf1f5f9', MEDIUM: 'FFdbeafe', HIGH: 'FFffedd5', CRITICAL: 'FFfee2e2',
}
const PRIORITY_TXT: Record<string, string> = {
  LOW: 'FF64748b', MEDIUM: 'FF1d4ed8', HIGH: 'FFc2410c', CRITICAL: 'FFb91c1c',
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}
function border(color = C.line): Partial<ExcelJS.Borders> {
  const s: ExcelJS.BorderStyle = 'thin'
  const c = { style: s, color: { argb: color } }
  return { top: c, bottom: c, left: c, right: c }
}
function fmtDt(iso?: string | null): string {
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
      for (const child of a.children) result.push({ ...child, _isChild: true })
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 1: Activities table
// ─────────────────────────────────────────────────────────────────────────────
function buildActivitiesSheet(ws: ExcelJS.Worksheet, flat: any[], event: any, today: string) {
  const COLS = 10

  ws.columns = [
    { key: 'pos',       width: 6  },
    { key: 'title',     width: 38 },
    { key: 'type',      width: 16 },
    { key: 'status',    width: 16 },
    { key: 'priority',  width: 14 },
    { key: 'start',     width: 20 },
    { key: 'end',       width: 20 },
    { key: 'duration',  width: 12 },
    { key: 'assigned',  width: 22 },
    { key: 'orders',    width: 22 },
  ]

  // ── Header ──────────────────────────────────────────────────────────────────
  const r1 = ws.addRow(['IventIA', '', '', '', '', '', '', '', 'TIMELINE', ''])
  ws.mergeCells(1, 1, 1, 5)
  ws.mergeCells(1, 6, 1, 10)
  r1.height = 28
  r1.fill = fill(C.navy)
  const brand = r1.getCell(1); brand.value = 'IventIA'
  brand.font = { bold: true, size: 15, color: { argb: C.white } }
  brand.alignment = { vertical: 'middle' }
  brand.fill = fill(C.navy)
  const title = r1.getCell(6); title.value = 'TIMELINE'
  title.font = { bold: true, size: 13, color: { argb: C.white } }
  title.alignment = { vertical: 'middle', horizontal: 'right' }
  title.fill = fill(C.navy)

  const r2 = ws.addRow(['Gestión de Eventos', '', '', '', '', event?.name ?? '', '', '', `Generado: ${today}`, ''])
  ws.mergeCells(2, 1, 2, 5)
  ws.mergeCells(2, 6, 2, 7)
  ws.mergeCells(2, 8, 2, 10)
  r2.height = 15; r2.fill = fill('FF0f2a45')
  r2.getCell(1).value = 'Gestión de Eventos'
  r2.getCell(1).font = { size: 8, italic: true, color: { argb: C.blue } }
  r2.getCell(1).fill = fill('FF0f2a45')
  r2.getCell(6).value = event?.name ?? ''
  r2.getCell(6).font = { size: 9, bold: true, color: { argb: C.blue } }
  r2.getCell(6).fill = fill('FF0f2a45')
  r2.getCell(8).value = `Generado: ${today}`
  r2.getCell(8).font = { size: 7.5, italic: true, color: { argb: C.gray } }
  r2.getCell(8).fill = fill('FF0f2a45')
  r2.getCell(8).alignment = { horizontal: 'right' }

  ws.addRow([])

  // ── Stats cards ─────────────────────────────────────────────────────────────
  const total = flat.length
  const done  = flat.filter(a => a.status === 'DONE').length
  const inPrg = flat.filter(a => a.status === 'IN_PROGRESS').length
  const pend  = flat.filter(a => a.status === 'PENDING').length

  const rStL = ws.addRow(['ESTADÍSTICAS', '', '', '', '', '', '', '', '', ''])
  ws.mergeCells(rStL.number, 1, rStL.number, COLS)
  rStL.height = 13
  rStL.getCell(1).fill = fill(C.lightGray)
  rStL.getCell(1).font = { bold: true, size: 8, color: { argb: C.navy } }
  rStL.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }

  const rStat = ws.addRow([
    'Total', total, 'Listas', done, `${total ? Math.round((done/total)*100) : 0}%`,
    'En Progreso', inPrg, 'Pendientes', pend, '',
  ])
  rStat.height = 17
  const statColors = ['FFf0f6ff', 'FFdcfce7', 'FFdcfce7', 'FFdbeafe', 'FFf1f5f9']
  const statTxt    = [C.navy, 'FF15803d', 'FF15803d', 'FF1d4ed8', 'FF475569']
  ;[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((c, i) => {
    const cell = rStat.getCell(c)
    const ci = Math.floor(i / 2)
    cell.fill = fill(statColors[Math.min(ci, statColors.length-1)])
    cell.font = { size: 9, bold: i % 2 !== 0, color: { argb: statTxt[Math.min(ci, statTxt.length-1)] } }
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle', horizontal: i % 2 !== 0 ? 'center' : 'right' }
  })

  ws.addRow([])

  // ── Table header ────────────────────────────────────────────────────────────
  const heads = ['#', 'Título', 'Tipo', 'Estado', 'Prioridad', 'Inicio', 'Fin', 'Duración', 'Asignado', 'Órdenes']
  const rHead = ws.addRow(heads)
  rHead.height = 15
  for (let c = 1; c <= COLS; c++) {
    const cell = rHead.getCell(c)
    cell.fill   = fill(C.lightGray)
    cell.font   = { bold: true, size: 8, color: { argb: C.navy } }
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : 'left' }
  }

  // ── Data rows ───────────────────────────────────────────────────────────────
  for (const [i, a] of flat.entries()) {
    const isChild = a._isChild || !!a.parentId
    const altFill = i % 2 !== 0 ? C.lightBg : C.white
    const orders = a.activityOrders?.length
      ? a.activityOrders.map((ao: any) => ao.order?.orderNumber).filter(Boolean).join(', ')
      : (a.order?.orderNumber ?? '—')
    const depts = (a.activityDepartments ?? []).map((d: any) => d.department?.name).filter(Boolean).join(', ')
    const assignedName = a.assignedTo
      ? `${a.assignedTo.firstName ?? ''} ${a.assignedTo.lastName ?? ''}`.trim() : '—'

    const row = ws.addRow([
      a.position ?? '',
      (isChild ? '  ' : '') + (a.title ?? ''),
      TYPE_LABELS[a.activityType] ?? (a.activityType ?? '—'),
      STATUS_LABELS[a.status] ?? (a.status ?? '—'),
      PRIORITY_LABELS[a.priority] ?? (a.priority ?? '—'),
      fmtDt(a.startDate),
      fmtDt(a.endDate),
      fmtDuration(a.durationMins),
      assignedName,
      orders + (depts ? ` [${depts}]` : ''),
    ])
    row.height = 13

    for (let c = 1; c <= COLS; c++) {
      const cell = row.getCell(c)
      cell.border = border(C.line)
      cell.alignment = { vertical: 'middle', wrapText: false }

      if (c === 3 && a.activityType) {
        const tc = TYPE_COLORS[a.activityType] ?? 'FF64748b'
        cell.fill = fill(tc + '33')
        cell.font = { size: 8, bold: true, color: { argb: tc } }
      } else if (c === 4 && a.status) {
        cell.fill = fill(STATUS_BG[a.status] ?? C.white)
        cell.font = { size: 8, bold: true, color: { argb: STATUS_TXT[a.status] ?? C.gray } }
      } else if (c === 5 && a.priority) {
        cell.fill = fill(PRIORITY_BG[a.priority] ?? C.white)
        cell.font = { size: 8, bold: true, color: { argb: PRIORITY_TXT[a.priority] ?? C.gray } }
      } else {
        cell.fill = fill(altFill)
        if (c === 1) {
          cell.font = { size: 8, color: { argb: C.gray } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        } else if (c === 2) {
          cell.font = { size: 8, bold: !isChild, color: { argb: isChild ? C.gray : C.navy } }
        } else {
          cell.font = { size: 8, color: { argb: '1e293b' } }
        }
      }
    }
  }

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: rHead.number }]
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 2: Visual Gantt
// ─────────────────────────────────────────────────────────────────────────────
function buildGanttSheet(ws: ExcelJS.Worksheet, flat: any[], event: any) {
  const withDates = flat.filter(a => a.startDate && a.endDate)
  if (withDates.length === 0) {
    ws.addRow(['Sin actividades con fechas para mostrar el Gantt.'])
    return
  }

  // Date range
  const allMs = withDates.flatMap(a => [new Date(a.startDate).getTime(), new Date(a.endDate).getTime()])
  if (event?.eventStart) allMs.push(new Date(event.eventStart).getTime())
  if (event?.eventEnd)   allMs.push(new Date(event.eventEnd).getTime())
  const rangeStart = new Date(Math.min(...allMs))
  const rangeEnd   = new Date(Math.max(...allMs))

  // Determine granularity (days or weeks)
  const rangeDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1
  const useWeeks  = rangeDays > 60
  const COL_W     = useWeeks ? 5 : 3.5

  // Build tick dates
  const ticks: Date[] = []
  if (useWeeks) {
    // Weekly ticks — align to Monday
    const d = new Date(rangeStart)
    d.setDate(d.getDate() - d.getDay() + 1) // Monday
    while (d <= rangeEnd) {
      ticks.push(new Date(d))
      d.setDate(d.getDate() + 7)
    }
  } else {
    // Daily ticks
    const d = new Date(rangeStart)
    d.setHours(0, 0, 0, 0)
    while (d <= rangeEnd) {
      ticks.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
  }

  const TITLE_COL = 1
  const FIRST_DATE_COL = 2

  // Column widths
  ws.getColumn(TITLE_COL).width = 32
  ticks.forEach((_, i) => {
    ws.getColumn(FIRST_DATE_COL + i).width = COL_W
  })

  // ── Header ──────────────────────────────────────────────────────────────────
  const r1 = ws.addRow(['Diagrama de Gantt — ' + (event?.name ?? '')])
  ws.mergeCells(1, 1, 1, FIRST_DATE_COL + ticks.length - 1)
  r1.height = 22
  r1.getCell(1).fill  = fill(C.navy)
  r1.getCell(1).font  = { bold: true, size: 12, color: { argb: C.white } }
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }

  // Date range sub-header
  const r2 = ws.addRow([
    rangeStart.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' → '
    + rangeEnd.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
  ])
  ws.mergeCells(2, 1, 2, FIRST_DATE_COL + ticks.length - 1)
  r2.height = 13
  r2.getCell(1).fill = fill('FF0f2a45')
  r2.getCell(1).font = { size: 8, italic: true, color: { argb: C.blue } }
  r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }

  ws.addRow([])

  // ── Date header row ──────────────────────────────────────────────────────────
  const rDates = ws.addRow([
    'Actividad',
    ...ticks.map(d => useWeeks
      ? d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
    ),
  ])
  rDates.height = 14
  rDates.getCell(TITLE_COL).fill  = fill(C.lightGray)
  rDates.getCell(TITLE_COL).font  = { bold: true, size: 8, color: { argb: C.navy } }
  rDates.getCell(TITLE_COL).border = border(C.line)
  rDates.getCell(TITLE_COL).alignment = { vertical: 'middle' }
  for (let t = 0; t < ticks.length; t++) {
    const cell = rDates.getCell(FIRST_DATE_COL + t)
    cell.fill  = fill(C.lightGray)
    cell.font  = { size: 6.5, bold: true, color: { argb: C.gray } }
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle', horizontal: 'center', textRotation: useWeeks ? 0 : 90 }
  }

  // ── Activity rows ───────────────────────────────────────────────────────────
  for (const [i, a] of withDates.entries()) {
    const isChild = a._isChild || !!a.parentId
    const startMs = new Date(a.startDate).getTime()
    const endMs   = new Date(a.endDate).getTime()
    const altFill = i % 2 === 0 ? C.white : C.lightBg
    const barColor = a.color || TYPE_COLORS[a.activityType] || 'FF3B82F6'

    const rowData: any[] = [(isChild ? '  ' : '') + (a.title ?? '')]
    for (const tick of ticks) {
      const tickMs  = tick.getTime()
      const tickEnd = tickMs + (useWeeks ? 7 * 86_400_000 : 86_400_000)
      // Cell is "in range" if the tick period overlaps with the activity duration
      const overlap = tickMs < endMs && tickEnd > startMs
      rowData.push(overlap ? '' : '')
    }

    const row = ws.addRow(rowData)
    row.height = 14

    // Title cell
    const titleCell = row.getCell(TITLE_COL)
    titleCell.fill   = fill(altFill)
    titleCell.font   = { size: 8, bold: !isChild, color: { argb: isChild ? C.gray : C.navy } }
    titleCell.border = border(C.line)
    titleCell.alignment = { vertical: 'middle' }

    // Bar cells
    for (let t = 0; t < ticks.length; t++) {
      const tick    = ticks[t]
      const tickMs  = tick.getTime()
      const tickEnd = tickMs + (useWeeks ? 7 * 86_400_000 : 86_400_000)
      const overlap = tickMs < endMs && tickEnd > startMs
      const cell    = row.getCell(FIRST_DATE_COL + t)
      if (overlap) {
        cell.fill = fill(barColor)
        // First cell of bar: show truncated title
        if (t === 0 || (t > 0 && !(ticks[t-1].getTime() < endMs && (ticks[t-1].getTime() + (useWeeks ? 7*86_400_000 : 86_400_000)) > startMs))) {
          cell.value = a.title?.length > 12 ? a.title.slice(0, 10) + '…' : (a.title ?? '')
          cell.font  = { size: 6, bold: true, color: { argb: C.white } }
        }
      } else {
        cell.fill = fill(altFill)
      }
      cell.border = border('FFe5e7eb')
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
    }
  }

  // ── Legend ──────────────────────────────────────────────────────────────────
  ws.addRow([])
  const rLegTitle = ws.addRow(['LEYENDA DE TIPOS'])
  ws.mergeCells(rLegTitle.number, 1, rLegTitle.number, FIRST_DATE_COL + Math.min(ticks.length, 10) - 1)
  rLegTitle.getCell(1).fill = fill(C.lightGray)
  rLegTitle.getCell(1).font = { bold: true, size: 8, color: { argb: C.navy } }
  rLegTitle.height = 12

  const typeEntries = Object.entries(TYPE_LABELS)
  for (let i = 0; i < typeEntries.length; i += 4) {
    const chunk = typeEntries.slice(i, i + 4)
    const legRow = ws.addRow(chunk.flatMap(([type, label]) => [label, '']))
    legRow.height = 13
    chunk.forEach(([type], ci) => {
      const colIdx = 1 + ci * 2
      const cell = legRow.getCell(colIdx)
      cell.fill  = fill(TYPE_COLORS[type] ?? C.gray)
      cell.font  = { size: 7.5, bold: true, color: { argb: C.white } }
      cell.border = border(C.line)
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  }

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: rDates.number }]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadTimelineExcel(activities: any[], event: any) {
  const ExcelJSMod = await import('exceljs')
  const ExcelJSLib = ExcelJSMod.default ?? ExcelJSMod
  const wb = new (ExcelJSLib as any).Workbook() as ExcelJS.Workbook

  wb.creator  = 'IventIA'
  wb.created  = new Date()
  wb.modified = new Date()

  const flat  = flattenTree(activities)
  const today = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const wsActs = wb.addWorksheet('Actividades', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  buildActivitiesSheet(wsActs, flat, event, today)

  const wsGantt = wb.addWorksheet('Gantt', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  buildGanttSheet(wsGantt, flat, event)

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `timeline-${event?.name ?? 'reporte'}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
