import ExcelJS from 'exceljs'

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  navy:      'FF1a3a5c',
  blue:      'FF2e7fc1',
  light:     'FFf0f6ff',
  lightBg:   'FFf8faff',
  gray:      'FF64748b',
  line:      'FFdde3ec',
  white:     'FFFFFFFF',
  green:     'FF16a34a',
  lightGray: 'FFe8f0fe',
  subRow:    'FFfcfcff',
  amber:     'FFd97706',
  purple:    'FF5b21b6',
  purpleBg:  'FFede9fe',
  purpleHdr: 'FF6d28d9',
  royal:     'FF1d4ed8',
  royalBg:   'FFdbeafe',
  royalHdr:  'FF1e40af',
  tcBg:      'FFf1f5f9',
  tcBorder:  'FFe2e8f0',
}

function currencyFmt(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : Number(n ?? 0)
  if (isNaN(v)) return '$0.00'
  return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function border(color = C.line): Partial<ExcelJS.Borders> {
  const s: ExcelJS.BorderStyle = 'thin'
  const c = { style: s, color: { argb: color } }
  return { top: c, bottom: c, left: c, right: c }
}

function effectiveCost(line: any, orderKey: 'directOrders' | 'indirectOrders', costField: string): number {
  const orders: any[] = line[orderKey] ?? []
  if (orders.length > 0) return orders.reduce((sum: number, o: any) => sum + Number(o.order?.total || 0), 0)
  return Number(line[costField] || 0)
}

// Columns:
//  1  Clave
//  2  Descripción
//  3  [PRES] C. Directo
//  4  [PRES] C. Indirecto
//  5  [PRES] Total Costo
//  6  [PRES] Total Presupuestado
//  7  [PRES] Utilidad
//  8  [REAL] C. Directo
//  9  [REAL] C. Indirecto
//  10 [REAL] Total Costo
//  11 [REAL] Total Real
//  12 [REAL] Utilidad

const COLS = 12
const PRES_START = 3
const PRES_END   = 7
const REAL_START = 8
const REAL_END   = 12

export async function downloadBudgetExcel(budget: any, event: any) {
  const ExcelJSMod = await import('exceljs')
  const ExcelJSLib = ExcelJSMod.default ?? ExcelJSMod
  const wb = new (ExcelJSLib as any).Workbook() as ExcelJS.Workbook

  wb.creator  = 'IventIA'
  wb.created  = new Date()
  wb.modified = new Date()

  const ws = wb.addWorksheet('Presupuesto', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const lines: any[] = budget?.lines ?? []
  const today = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const totals = lines.reduce(
    (acc, l) => {
      const dirP = Number(l.directCostBudgeted  ?? 0)
      const indP = Number(l.indirectCostBudgeted ?? 0)
      const totP = Number(l.utility             ?? 0)
      const dirR = effectiveCost(l, 'directOrders',   'directCost')
      const indR = effectiveCost(l, 'indirectOrders', 'indirectCost')
      const totR = Number(l.income              ?? 0)
      return {
        dirP: acc.dirP + dirP,
        indP: acc.indP + indP,
        tcP:  acc.tcP  + dirP + indP,
        totP: acc.totP + totP,
        dirR: acc.dirR + dirR,
        indR: acc.indR + indR,
        tcR:  acc.tcR  + dirR + indR,
        totR: acc.totR + totR,
      }
    },
    { dirP: 0, indP: 0, tcP: 0, totP: 0, dirR: 0, indR: 0, tcR: 0, totR: 0 },
  )
  const utP = totals.totP - totals.tcP
  const utR = totals.totR - totals.tcR

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = [
    { key: 'code',     width: 14 },
    { key: 'desc',     width: 38 },
    { key: 'dirP',     width: 18 },
    { key: 'indP',     width: 18 },
    { key: 'tcP',      width: 17 },
    { key: 'totP',     width: 20 },
    { key: 'utP',      width: 18 },
    { key: 'dirR',     width: 18 },
    { key: 'indR',     width: 18 },
    { key: 'tcR',      width: 17 },
    { key: 'totR',     width: 20 },
    { key: 'utR',      width: 18 },
  ]

  // ── Row 1: Main header ─────────────────────────────────────────────────────
  const r1 = ws.addRow(Array(COLS).fill(''))
  r1.getCell(1).value = 'IventIA'
  r1.getCell(COLS - 1).value = 'PRESUPUESTO'
  ws.mergeCells(1, 1, 1, 4)
  ws.mergeCells(1, 5, 1, COLS)
  r1.height = 28
  r1.fill = fill(C.navy)
  r1.getCell(1).font = { bold: true, size: 16, color: { argb: C.white } }
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
  r1.getCell(1).fill = fill(C.navy)
  r1.getCell(COLS - 1).font = { bold: true, size: 13, color: { argb: C.white } }
  r1.getCell(COLS - 1).alignment = { vertical: 'middle', horizontal: 'right' }
  r1.getCell(COLS - 1).fill = fill(C.navy)

  // ── Row 2: Subtitle ────────────────────────────────────────────────────────
  const r2 = ws.addRow(Array(COLS).fill(''))
  r2.getCell(1).value = 'Gestión de Eventos'
  r2.getCell(COLS - 1).value = budget?.name ?? ''
  ws.mergeCells(2, 1, 2, 4)
  ws.mergeCells(2, 5, 2, COLS)
  r2.height = 15
  r2.fill = fill('FF0f2a45')
  r2.getCell(1).font  = { size: 8, color: { argb: C.blue }, italic: true }
  r2.getCell(1).fill  = fill('FF0f2a45')
  r2.getCell(1).alignment = { vertical: 'middle' }
  r2.getCell(COLS - 1).font  = { size: 10, bold: true, color: { argb: C.blue } }
  r2.getCell(COLS - 1).fill  = fill('FF0f2a45')
  r2.getCell(COLS - 1).alignment = { vertical: 'middle', horizontal: 'right' }

  // Row 3: date
  const r3 = ws.addRow(Array(COLS).fill(''))
  r3.getCell(COLS - 1).value = `Generado: ${today}`
  ws.mergeCells(3, COLS - 1, 3, COLS)
  r3.height = 12
  r3.getCell(COLS - 1).font = { size: 7.5, color: { argb: C.gray }, italic: true }
  r3.getCell(COLS - 1).alignment = { horizontal: 'right' }

  ws.addRow([]) // blank

  // ── Info section ───────────────────────────────────────────────────────────
  const infoData: (string | number)[][] = [
    ['EVENTO', '', '', '', 'PRESUPUESTO', '', '', '', '', '', '', ''],
    ['Nombre', event?.name ?? '—', '', '', 'Nombre', budget?.name ?? '—', '', '', '', '', '', ''],
    ['Inicio', fmtDate(event?.eventStart), '', '', 'Partidas', String(lines.length), '', '', '', '', '', ''],
    ['Fin',    fmtDate(event?.eventEnd),   '', '', 'Notas',    budget?.notes ?? '—', '', '', '', '', '', ''],
  ]
  for (const [ri, row] of infoData.entries()) {
    const r = ws.addRow(row)
    r.height = ri === 0 ? 13 : 12
    ws.mergeCells(r.number, 2, r.number, 4)
    ws.mergeCells(r.number, 6, r.number, COLS)
    for (let c = 1; c <= COLS; c++) {
      const cell = r.getCell(c)
      cell.fill = fill(C.light)
      cell.border = border(C.line)
      cell.alignment = { vertical: 'middle' }
      if (ri === 0) {
        cell.font = { bold: true, size: 8, color: { argb: C.blue } }
      } else if (c === 1 || c === 5) {
        cell.font = { size: 8, color: { argb: C.gray } }
      } else {
        cell.font = { size: 8, bold: true, color: { argb: C.navy } }
      }
    }
  }

  // ── Financial summary ──────────────────────────────────────────────────────
  const rSumLabel = ws.addRow(Array(COLS).fill(''))
  rSumLabel.getCell(1).value = 'RESUMEN FINANCIERO'
  ws.mergeCells(rSumLabel.number, 1, rSumLabel.number, COLS)
  rSumLabel.height = 13
  rSumLabel.getCell(1).fill  = fill(C.navy)
  rSumLabel.getCell(1).font  = { bold: true, size: 8, color: { argb: C.white } }
  rSumLabel.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // Sub-header: labels
  const rSumHdr = ws.addRow(['', '', 'PRESUPUESTADO', '', '', '', '', 'REAL', '', '', '', ''])
  ws.mergeCells(rSumHdr.number, 3, rSumHdr.number, 7)
  ws.mergeCells(rSumHdr.number, 8, rSumHdr.number, COLS)
  rSumHdr.height = 13
  for (let c = 1; c <= COLS; c++) {
    const cell = rSumHdr.getCell(c)
    cell.fill = fill(C.navy)
    cell.font = { bold: true, size: 8, color: { argb: C.white } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }
  rSumHdr.getCell(3).font = { bold: true, size: 8, color: { argb: C.purpleBg } }
  rSumHdr.getCell(8).font = { bold: true, size: 8, color: { argb: C.royalBg } }

  // Summary data row
  const rSum = ws.addRow([
    'C. Directo', currencyFmt(totals.dirP),
    'C. Indirecto', currencyFmt(totals.indP),
    'Total Costo', currencyFmt(totals.tcP),
    'C. Directo', currencyFmt(totals.dirR),
    'C. Indirecto', currencyFmt(totals.indR),
    'Total Costo', currencyFmt(totals.tcR),
  ])
  rSum.height = 15
  for (let c = 1; c <= COLS; c++) {
    const cell = rSum.getCell(c)
    cell.fill = fill(C.navy)
    cell.border = border('FF0f2a45')
    cell.alignment = { vertical: 'middle' }
    if (c % 2 === 1) {
      cell.font = { size: 8, color: { argb: 'FF7ea8cc' } }
    } else {
      cell.font = { bold: true, size: 9, color: { argb: C.white } }
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
    }
  }

  // Totals / utilidad row
  const rUtil = ws.addRow([
    'Total Presupuestado', currencyFmt(totals.totP),
    'Utilidad Presup.', currencyFmt(utP),
    '', '',
    'Total Real', currencyFmt(totals.totR),
    'Utilidad Real', currencyFmt(utR),
    '', '',
  ])
  rUtil.height = 15
  for (let c = 1; c <= COLS; c++) {
    const cell = rUtil.getCell(c)
    cell.fill = fill(C.navy)
    cell.border = border('FF0f2a45')
    cell.alignment = { vertical: 'middle' }
  }
  const utilPColor = utP >= 0 ? 'FF4ade80' : 'FFf87171'
  const utilRColor = utR >= 0 ? 'FF4ade80' : 'FFf87171'
  rUtil.getCell(1).font = { size: 8, color: { argb: 'FF7ea8cc' } }
  rUtil.getCell(2).font = { bold: true, size: 10, color: { argb: C.white } }
  rUtil.getCell(2).alignment = { vertical: 'middle' }
  rUtil.getCell(3).font = { size: 8, color: { argb: 'FF7ea8cc' } }
  rUtil.getCell(4).font = { bold: true, size: 10, color: { argb: utilPColor } }
  rUtil.getCell(4).alignment = { vertical: 'middle' }
  rUtil.getCell(7).font = { size: 8, color: { argb: 'FF7ea8cc' } }
  rUtil.getCell(8).font = { bold: true, size: 10, color: { argb: C.white } }
  rUtil.getCell(8).alignment = { vertical: 'middle' }
  rUtil.getCell(9).font = { size: 8, color: { argb: 'FF7ea8cc' } }
  rUtil.getCell(10).font = { bold: true, size: 10, color: { argb: utilRColor } }
  rUtil.getCell(10).alignment = { vertical: 'middle' }

  ws.addRow([]) // blank

  // ── Table: group header ────────────────────────────────────────────────────
  const rGrp = ws.addRow(Array(COLS).fill(''))
  rGrp.getCell(1).value = 'CONCEPTO'
  rGrp.getCell(PRES_START).value = 'PRESUPUESTADO'
  rGrp.getCell(REAL_START).value = 'REAL'
  ws.mergeCells(rGrp.number, 1, rGrp.number, 2)
  ws.mergeCells(rGrp.number, PRES_START, rGrp.number, PRES_END)
  ws.mergeCells(rGrp.number, REAL_START, rGrp.number, REAL_END)
  rGrp.height = 16
  for (let c = 1; c <= COLS; c++) {
    const cell = rGrp.getCell(c)
    cell.fill   = fill(C.navy)
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.font = { bold: true, size: 8.5, color: { argb: C.white } }
  }
  rGrp.getCell(PRES_START).font = { bold: true, size: 8.5, color: { argb: C.purpleBg } }
  rGrp.getCell(REAL_START).font = { bold: true, size: 8.5, color: { argb: C.royalBg } }

  // ── Table: sub-header ─────────────────────────────────────────────────────
  const rHead = ws.addRow([
    'Clave', 'Descripción',
    'C. Directo', 'C. Indirecto', 'Total Costo', 'Total Presup.', 'Utilidad',
    'C. Directo', 'C. Indirecto', 'Total Costo', 'Total Real', 'Utilidad',
  ])
  rHead.height = 15
  for (let c = 1; c <= COLS; c++) {
    const cell = rHead.getCell(c)
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle', horizontal: c <= 2 ? 'left' : 'right' }
    cell.font = { bold: true, size: 8 }
    if (c <= 2) {
      cell.fill = fill(C.lightGray)
      cell.font = { bold: true, size: 8, color: { argb: C.navy } }
    } else if (c <= PRES_END) {
      cell.fill = fill(C.purpleBg)
      cell.font = { bold: true, size: 8, color: { argb: C.purple } }
    } else {
      cell.fill = fill(C.royalBg)
      cell.font = { bold: true, size: 8, color: { argb: C.royal } }
    }
  }

  // ── Data rows ─────────────────────────────────────────────────────────────
  let rowIndex = 0
  for (const line of lines) {
    const isAlt   = rowIndex % 2 !== 0
    const rowFill = isAlt ? C.lightBg : C.white
    rowIndex++

    const dirP = Number(line.directCostBudgeted  ?? 0)
    const indP = Number(line.indirectCostBudgeted ?? 0)
    const tcP  = dirP + indP
    const totP = Number(line.utility             ?? 0)
    const utlP = totP - tcP

    const dirR = effectiveCost(line, 'directOrders',   'directCost')
    const indR = effectiveCost(line, 'indirectOrders', 'indirectCost')
    const tcR  = dirR + indR
    const totR = Number(line.income              ?? 0)
    const utlR = totR - tcR

    const directNums   = (line.directOrders ?? []).map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')
    const indirectNums = (line.indirectOrders ?? []).map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')
    const descNote = [
      directNums   ? `D: ${directNums}`   : '',
      indirectNums ? `I: ${indirectNums}` : '',
    ].filter(Boolean).join(' | ')

    const codeText = (line.resource?.code ?? '') + (line.resource?.isPackage ? ' [Paq]' : '')

    const dr = ws.addRow([
      codeText,
      line.description + (descNote ? `\n${descNote}` : ''),
      dirP, indP, tcP, totP, utlP,
      dirR, indR, tcR, totR, utlR,
    ])
    dr.height = descNote ? 22 : 14

    for (let c = 1; c <= COLS; c++) {
      const cell = dr.getCell(c)
      cell.border = border(C.line)
      cell.alignment = { vertical: 'middle', wrapText: true }
      if (c === 1) {
        cell.fill = fill(rowFill)
        cell.font = { size: 8, color: { argb: C.gray }, bold: !!line.resource?.isPackage }
      } else if (c === 2) {
        cell.fill = fill(rowFill)
        cell.font = { size: 8, color: { argb: '1e293b' }, bold: !!line.resource?.isPackage }
      } else if (c === 5 || c === 10) {
        // Total Costo columns — subtle highlight
        cell.fill = fill(C.tcBg)
        cell.numFmt = '"$"#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.font = { size: 8, bold: true }
      } else if (c === 7 || c === 12) {
        // Utilidad — color by sign
        const val = c === 7 ? utlP : utlR
        cell.fill = fill(rowFill)
        cell.numFmt = '"$"#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.font = { size: 8, bold: true, color: { argb: val >= 0 ? C.green : 'FFdc2626' } }
      } else {
        cell.fill = fill(rowFill)
        cell.numFmt = '"$"#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.font = { size: 8 }
      }
    }

    // Package sub-components
    if (line.resource?.isPackage) {
      for (const pc of line.resource.packageComponents ?? []) {
        const sr = ws.addRow([
          `  ${pc.componentResource?.code ?? ''}`,
          `  ${pc.componentResource?.name ?? ''}${pc.quantity > 1 ? ` (×${pc.quantity})` : ''}`,
          ...Array(COLS - 2).fill(''),
        ])
        sr.height = 12
        for (let c = 1; c <= COLS; c++) {
          const cell = sr.getCell(c)
          cell.fill   = fill(C.subRow)
          cell.border = border('FFeef2ff')
          cell.font   = { size: 7.5, italic: true, color: { argb: C.gray } }
          cell.alignment = { vertical: 'middle' }
        }
      }
    }
  }

  // ── Totals row ─────────────────────────────────────────────────────────────
  const rTot = ws.addRow([
    'TOTALES', '',
    totals.dirP, totals.indP, totals.tcP, totals.totP, utP,
    totals.dirR, totals.indR, totals.tcR, totals.totR, utR,
  ])
  ws.mergeCells(rTot.number, 1, rTot.number, 2)
  rTot.height = 18
  for (let c = 1; c <= COLS; c++) {
    const cell = rTot.getCell(c)
    cell.fill   = fill(C.navy)
    cell.font   = { bold: true, color: { argb: C.white }, size: 9 }
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle' }
    if (c >= 3) {
      cell.numFmt = '"$"#,##0.00'
      cell.alignment = { vertical: 'middle', horizontal: 'right' }
    }
    if (c === 7) cell.font = { bold: true, size: 9, color: { argb: utP >= 0 ? 'FF4ade80' : 'FFf87171' } }
    if (c === 12) cell.font = { bold: true, size: 9, color: { argb: utR >= 0 ? 'FF4ade80' : 'FFf87171' } }
  }
  rTot.getCell(1).value = 'TOTALES'

  // ── Freeze header rows ─────────────────────────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: rHead.number }]

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `presupuesto-${budget?.name ?? 'reporte'}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
