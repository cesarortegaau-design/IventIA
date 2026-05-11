import ExcelJS from 'exceljs'

// ── Palette (same as PDF) ─────────────────────────────────────────────────────
const C = {
  navy:    'FF1a3a5c',
  blue:    'FF2e7fc1',
  light:   'FFf0f6ff',
  lightBg: 'FFf8faff',
  gray:    'FF64748b',
  line:    'FFdde3ec',
  white:   'FFFFFFFF',
  green:   'FF16a34a',
  lightGray: 'FFe8f0fe',
  subRow:  'FFfcfcff',
  amber:   'FFd97706',
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

function applyNavyRow(row: ExcelJS.Row, colCount: number) {
  row.fill = fill(C.navy)
  row.height = 18
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i)
    cell.fill = fill(C.navy)
    cell.font = { bold: true, color: { argb: C.white }, size: 9 }
    cell.alignment = { vertical: 'middle' }
    if (i >= 3) cell.alignment = { vertical: 'middle', horizontal: 'right' }
  }
}

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
    (acc, l) => ({
      direct:   acc.direct   + Number(l.directCost   ?? 0),
      income:   acc.income   + Number(l.income       ?? 0),
      indirect: acc.indirect + Number(l.indirectCost ?? 0),
      utility:  acc.utility  + Number(l.utility      ?? 0),
    }),
    { direct: 0, income: 0, indirect: 0, utility: 0 },
  )

  // ── Column widths ──────────────────────────────────────────────────────────
  ws.columns = [
    { key: 'code',     width: 14 },
    { key: 'desc',     width: 42 },
    { key: 'direct',   width: 20 },
    { key: 'income',   width: 20 },
    { key: 'indirect', width: 20 },
    { key: 'utility',  width: 18 },
  ]
  const COLS = 6

  // ── Row 1: Main header ─────────────────────────────────────────────────────
  const r1 = ws.addRow(['IventIA', '', '', '', 'PRESUPUESTO', ''])
  ws.mergeCells(1, 1, 1, 3)
  ws.mergeCells(1, 4, 1, 6)
  r1.height = 30
  r1.fill = fill(C.navy)
  const brandCell = r1.getCell(1)
  brandCell.font = { bold: true, size: 16, color: { argb: C.white } }
  brandCell.alignment = { vertical: 'middle', horizontal: 'left' }
  brandCell.fill = fill(C.navy)
  const titleCell = r1.getCell(4)
  titleCell.value = 'PRESUPUESTO'
  titleCell.font = { bold: true, size: 14, color: { argb: C.white } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'right' }
  titleCell.fill = fill(C.navy)

  // ── Row 2: Subtitle ────────────────────────────────────────────────────────
  const r2 = ws.addRow(['Gestión de Eventos', '', '', '', budget?.name ?? '', ''])
  ws.mergeCells(2, 1, 2, 3)
  ws.mergeCells(2, 4, 2, 6)
  r2.height = 16
  r2.fill = fill('FF0f2a45')
  r2.getCell(1).value = 'Gestión de Eventos'
  r2.getCell(1).font  = { size: 8, color: { argb: C.blue }, italic: true }
  r2.getCell(1).fill  = fill('FF0f2a45')
  r2.getCell(1).alignment = { vertical: 'middle' }
  r2.getCell(4).value = budget?.name ?? ''
  r2.getCell(4).font  = { size: 10, bold: true, color: { argb: C.blue } }
  r2.getCell(4).fill  = fill('FF0f2a45')
  r2.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' }

  // Row 3: date
  const r3 = ws.addRow(['', '', '', '', `Generado: ${today}`, ''])
  ws.mergeCells(3, 4, 3, 6)
  r3.height = 13
  r3.getCell(4).font = { size: 8, color: { argb: C.gray }, italic: true }
  r3.getCell(4).alignment = { horizontal: 'right' }

  // ── Blank separator ────────────────────────────────────────────────────────
  ws.addRow([])

  // ── Info section ───────────────────────────────────────────────────────────
  const infoData = [
    ['EVENTO', '', '', 'PRESUPUESTO', '', ''],
    ['Nombre', event?.name ?? '—', '', 'Nombre', budget?.name ?? '—', ''],
    ['Inicio', fmtDate(event?.eventStart), '', 'Partidas', String(lines.length), ''],
    ['Fin', fmtDate(event?.eventEnd), '', 'Notas', budget?.notes ?? '—', ''],
  ]
  for (const [ri, row] of infoData.entries()) {
    const r = ws.addRow(row)
    r.height = ri === 0 ? 14 : 13
    ws.mergeCells(r.number, 2, r.number, 3)
    ws.mergeCells(r.number, 5, r.number, 6)
    for (let c = 1; c <= COLS; c++) {
      const cell = r.getCell(c)
      cell.fill = fill(C.light)
      cell.border = border(C.line)
      cell.alignment = { vertical: 'middle' }
      if (ri === 0) {
        cell.font = { bold: true, size: 8, color: { argb: C.blue } }
      } else if (c === 1 || c === 4) {
        cell.font = { size: 8, color: { argb: C.gray } }
      } else {
        cell.font = { size: 8, bold: true, color: { argb: C.navy } }
      }
    }
  }

  // ── Financial summary row ──────────────────────────────────────────────────
  const rSumLabel = ws.addRow(['RESUMEN FINANCIERO', '', '', '', '', ''])
  ws.mergeCells(rSumLabel.number, 1, rSumLabel.number, 6)
  rSumLabel.height = 14
  rSumLabel.getCell(1).fill  = fill(C.navy)
  rSumLabel.getCell(1).font  = { bold: true, size: 8, color: { argb: C.white } }
  rSumLabel.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }

  const rSum = ws.addRow([
    'Costo Directo', currencyFmt(totals.direct),
    'Ingreso', currencyFmt(totals.income),
    'Costo Indirecto', currencyFmt(totals.indirect),
  ])
  rSum.height = 16
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

  const rUtil = ws.addRow(['Utilidad', currencyFmt(totals.utility), '', '', '', ''])
  ws.mergeCells(rUtil.number, 2, rUtil.number, 6)
  rUtil.height = 16
  for (let c = 1; c <= COLS; c++) {
    const cell = rUtil.getCell(c)
    cell.fill = fill(C.navy)
    cell.border = border('FF0f2a45')
  }
  rUtil.getCell(1).font = { size: 8, color: { argb: 'FF7ea8cc' } }
  rUtil.getCell(2).font = { bold: true, size: 11, color: { argb: 'FF4ade80' } }
  rUtil.getCell(2).alignment = { vertical: 'middle' }

  // ── Blank separator ────────────────────────────────────────────────────────
  ws.addRow([])

  // ── Table header ──────────────────────────────────────────────────────────
  const rHead = ws.addRow(['Clave', 'Descripción', 'Costo Directo', 'Ingreso', 'Costo Indirecto', 'Utilidad'])
  rHead.height = 16
  for (let c = 1; c <= COLS; c++) {
    const cell = rHead.getCell(c)
    cell.fill   = fill(C.lightGray)
    cell.font   = { bold: true, size: 8, color: { argb: C.navy } }
    cell.border = border(C.line)
    cell.alignment = { vertical: 'middle', horizontal: c >= 3 ? 'right' : 'left' }
  }

  // ── Data rows ─────────────────────────────────────────────────────────────
  let rowIndex = 0
  for (const line of lines) {
    const isAlt = rowIndex % 2 !== 0
    const rowFill = isAlt ? C.lightBg : C.white
    rowIndex++

    // Direct orders / indirect orders text
    const directOrders = (line.directOrders ?? []).map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')
    const indirectOrders = (line.indirectOrders ?? []).map((o: any) => o.order?.orderNumber).filter(Boolean).join(', ')
    const descNote = [
      directOrders ? `D: ${directOrders}` : '',
      indirectOrders ? `I: ${indirectOrders}` : '',
    ].filter(Boolean).join(' | ')

    const codeText = line.resource?.code ?? ''
    const pkgSuffix = line.resource?.isPackage ? ' [Paquete]' : ''

    const dr = ws.addRow([
      codeText + pkgSuffix,
      line.description + (descNote ? `\n${descNote}` : ''),
      Number(line.directCost ?? 0),
      Number(line.income ?? 0),
      Number(line.indirectCost ?? 0),
      Number(line.utility ?? 0),
    ])
    dr.height = descNote ? 22 : 14

    for (let c = 1; c <= COLS; c++) {
      const cell = dr.getCell(c)
      cell.fill   = fill(rowFill)
      cell.border = border(C.line)
      cell.alignment = { vertical: 'middle', wrapText: true }
      if (c === 1) {
        cell.font = { size: 8, color: { argb: C.gray }, bold: line.resource?.isPackage }
      } else if (c === 2) {
        cell.font = { size: 8, color: { argb: '1e293b' }, bold: line.resource?.isPackage }
      } else {
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
          '', '', '', '',
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
  const rTot = ws.addRow(['TOTALES', '', totals.direct, totals.income, totals.indirect, totals.utility])
  rTot.height = 18
  applyNavyRow(rTot, COLS)
  rTot.getCell(1).value = 'TOTALES'
  for (let c = 3; c <= COLS; c++) {
    const cell = rTot.getCell(c)
    cell.numFmt = '"$"#,##0.00'
  }

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
