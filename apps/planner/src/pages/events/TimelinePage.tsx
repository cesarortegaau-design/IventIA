/**
 * TimelinePage.tsx
 * Timeline del evento por fases — persiste en localStorage por evento
 * Diseño: fases colapsables, actividades con Responsable/Inicio/Fin/Duración/Estado,
 * 4 KPIs (Total, Completadas, En progreso, Pendientes) y barra de avance.
 * Edición de actividades: panel lateral derecho estilo HSODAK.
 */
import { useState, useMemo, useRef } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { usePlannerStore } from '../../hooks/usePlannerStore'
import { DEFAULT_BRANDING, type EventBranding } from './EstudioPage'
import {
  Button, Modal, Form, Input, Select, Space, Popconfirm, App, Typography, DatePicker, TimePicker,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FileExcelOutlined, UploadOutlined, CloseOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
dayjs.extend(relativeTime)
dayjs.locale('es')

const { Text } = Typography

// ── Types ─────────────────────────────────────────────────────────────────────
interface TimelinePhase {
  id: string
  name: string
  color: string
  sortOrder: number
  date?: string // YYYY-MM-DD
}

interface TimelineActivity {
  id: string
  phaseId: string
  name: string
  responsible: string
  startTime: string // HH:mm
  endTime: string   // HH:mm
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'
  notes?: string
}

interface TimelineStore {
  phases: TimelinePhase[]
  activities: TimelineActivity[]
  updatedAt: string
}

interface ActivityDraft {
  name: string
  responsible: string
  startTime: string
  endTime: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'
  notes: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_PHASES = [
  { name: 'Montaje',    color: '#0D9488' },
  { name: 'Evento',     color: '#7C3AED' },
  { name: 'Desmontaje', color: '#F97316' },
]

const STATUS_CFG = {
  COMPLETED:  { label: 'Completada',  color: '#059669', bg: '#ECFDF5', dot: '#059669' },
  IN_PROGRESS:{ label: 'En progreso', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  PENDING:    { label: 'Pendiente',   color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
} as const

// ── Persistence ───────────────────────────────────────────────────────────────
function storeKey(id: string) { return `iventia-timeline-${id}` }

function loadStore(id: string): TimelineStore {
  try {
    const raw = localStorage.getItem(storeKey(id))
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { phases: [], activities: [], updatedAt: '' }
}

function saveStore(id: string, store: TimelineStore) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify({
      ...store,
      updatedAt: new Date().toISOString(),
    }))
    window.dispatchEvent(new CustomEvent('iventia-timeline-changed', { detail: { eventId: id } }))
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcDuration(start: string, end: string): string {
  if (!start || !end) return '—'
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

function actToDraft(act: TimelineActivity): ActivityDraft {
  return {
    name:        act.name,
    responsible: act.responsible || '',
    startTime:   act.startTime || '',
    endTime:     act.endTime || '',
    status:      act.status,
    notes:       act.notes || '',
  }
}

// ── Excel export (styled) ─────────────────────────────────────────────────────
async function exportToExcel(store: TimelineStore, eventName: string) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'IventIA Planner'
  const ws = wb.addWorksheet('Timeline')

  ws.columns = [
    { header: 'Fase',        key: 'phase',       width: 18 },
    { header: 'Actividad',   key: 'name',        width: 38 },
    { header: 'Responsable', key: 'responsible', width: 22 },
    { header: 'Inicio',      key: 'startTime',   width: 10 },
    { header: 'Fin',         key: 'endTime',     width: 10 },
    { header: 'Duración',    key: 'duration',    width: 12 },
    { header: 'Estado',      key: 'status',      width: 16 },
    { header: 'Notas',       key: 'notes',       width: 34 },
  ]

  // Styled header
  const hdr = ws.getRow(1)
  hdr.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
  hdr.alignment = { vertical: 'middle', horizontal: 'center' }
  hdr.height = 22

  const phases = [...store.phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  for (const phase of phases) {
    const activities = store.activities.filter(a => a.phaseId === phase.id)
    if (!activities.length) continue

    // Phase header row
    const phArgb = 'FF' + phase.color.replace('#', '')
    const phRow = ws.addRow({ phase: `  ${phase.name}` })
    phRow.font = { bold: true, color: { argb: phArgb }, size: 11 }
    phRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } }
    phRow.height = 20
    ws.mergeCells(`A${phRow.number}:H${phRow.number}`)
    phRow.getCell(1).border = { left: { style: 'thick', color: { argb: phArgb } } }

    for (const act of activities) {
      const sCfg = STATUS_CFG[act.status]
      const row  = ws.addRow({
        phase:       '',
        name:        act.name,
        responsible: act.responsible || '',
        startTime:   act.startTime || '',
        endTime:     act.endTime || '',
        duration:    calcDuration(act.startTime, act.endTime),
        status:      sCfg?.label ?? act.status,
        notes:       act.notes ?? '',
      })
      const statusArgb = act.status === 'COMPLETED'
        ? 'FF059669' : act.status === 'IN_PROGRESS'
        ? 'FFD97706' : 'FF6B7280'
      row.getCell(7).font = { color: { argb: statusArgb }, bold: true }
      row.getCell(1).border = { left: { style: 'thin', color: { argb: 'FFEDE9FE' } } }
    }

    // Phase count
    const countRow = ws.addRow({ phase: `${activities.length} actividades`, name: '' })
    countRow.font = { italic: true, color: { argb: 'FF9CA3AF' }, size: 10 }
    ws.mergeCells(`A${countRow.number}:H${countRow.number}`)
  }

  // Summary row
  const totRow = ws.addRow({ phase: `TOTAL: ${store.activities.length} actividades · ${phases.length} fases` })
  totRow.font = { bold: true, size: 11, color: { argb: 'FF7C3AED' } }
  totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } }
  totRow.height = 20
  ws.mergeCells(`A${totRow.number}:H${totRow.number}`)

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf]))
  const a = document.createElement('a')
  a.href = url; a.download = `timeline-${eventName || 'evento'}.xlsx`; a.click()
  URL.revokeObjectURL(url)
}

// ── PDF generator ─────────────────────────────────────────────────────────────
function openHtml(html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  if (w) w.onload = () => URL.revokeObjectURL(url)
  else setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function generateTimelinePdf(store: TimelineStore, event: any, branding: EventBranding = DEFAULT_BRANDING) {
  const primary   = branding.primaryColor   || '#7C3AED'
  const secondary = branding.secondaryColor || '#059669'
  const eventName = event?.name || 'Evento'
  const eventType = event?.eventType || ''
  const eventCode = event?.code || ''
  const eventDate = event?.eventStart
    ? new Date(event.eventStart).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const genDate   = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  const phases     = [...store.phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const total      = store.activities.length
  const completed  = store.activities.filter(a => a.status === 'COMPLETED').length
  const inProgress = store.activities.filter(a => a.status === 'IN_PROGRESS').length
  const pending    = store.activities.filter(a => a.status === 'PENDING').length
  const pct        = total > 0 ? Math.round(completed / total * 100) : 0

  const kpiHtml = [
    { label: 'TOTAL',       value: total,      color: primary },
    { label: 'COMPLETADAS', value: completed,  color: '#059669' },
    { label: 'EN PROGRESO', value: inProgress, color: '#D97706' },
    { label: 'PENDIENTES',  value: pending,    color: '#6B7280' },
    { label: 'AVANCE',      value: `${pct}%`,  color: pct >= 80 ? '#059669' : pct >= 40 ? '#D97706' : '#DC2626' },
  ].map(k => `
    <div class="kpi">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" style="color:${k.color}">${k.value}</div>
    </div>`).join('')

  const phaseRows = phases.map(phase => {
    const acts = store.activities.filter(a => a.phaseId === phase.id)
    if (!acts.length) return ''

    const sortedActs = [...acts].sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
      return 0
    })

    const actRows = sortedActs.map(act => {
      const sCfg   = STATUS_CFG[act.status]
      const dur    = calcDuration(act.startTime, act.endTime)
      const dot    = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${sCfg?.dot || '#9CA3AF'};margin-right:5px;vertical-align:middle"></span>`
      return `<tr>
        <td>${act.startTime || '—'}</td>
        <td>${act.endTime || '—'}</td>
        <td class="td-dur">${dur}</td>
        <td class="td-act">${act.name}</td>
        <td class="td-resp">${act.responsible || '—'}</td>
        <td class="td-status" style="color:${sCfg?.color || '#6B7280'}">${dot}${sCfg?.label || act.status}</td>
        <td class="td-notes">${act.notes || ''}</td>
      </tr>`
    }).join('')

    const phCompleted  = acts.filter(a => a.status === 'COMPLETED').length
    const phTotal      = acts.length
    const phPct        = phTotal > 0 ? Math.round(phCompleted / phTotal * 100) : 0

    return `
      <tr class="ph-header" style="border-left:4px solid ${phase.color}">
        <td colspan="7">
          <span style="color:${phase.color};font-weight:700;font-size:12px">${phase.name}</span>
          ${phase.date ? `<span style="margin-left:10px;font-size:10px;color:#888">${new Date(phase.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</span>` : ''}
          <span style="float:right;font-size:10px;color:#888">${phCompleted}/${phTotal} · ${phPct}%</span>
        </td>
      </tr>
      ${actRows}
      <tr class="ph-spacer"><td colspan="7"></td></tr>`
  }).join('')

  const progressBar = `
    <div style="background:#EDE9FE;border-radius:6px;height:10px;margin-bottom:18px;overflow:hidden">
      <div style="background:linear-gradient(90deg,${primary},${secondary});height:100%;width:${pct}%;border-radius:6px;transition:width .3s"></div>
    </div>`

  const html = `<!DOCTYPE html><html lang="es">
<head><meta charset="utf-8">
<title>Timeline — ${eventName}</title>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 portrait;margin:14mm 16mm}
html,body{font-family:'Jost',Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
.header{background:linear-gradient(135deg,${primary},${secondary});color:#fff;padding:24px 28px;margin-bottom:16px;border-radius:8px;display:flex;justify-content:space-between;align-items:flex-end}
.header h1{font-size:22px;font-weight:800;margin-bottom:4px}
.header .sub{font-size:11px;opacity:.75;letter-spacing:.06em}
.kpi-row{display:flex;gap:10px;margin-bottom:14px}
.kpi{flex:1;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;padding:8px 12px}
.kpi-label{font-size:9px;font-weight:700;color:#888;letter-spacing:.12em;margin-bottom:3px}
.kpi-value{font-size:18px;font-weight:800}
table{width:100%;border-collapse:collapse}
th{background:#F5F3FF;font-size:9px;font-weight:700;letter-spacing:.1em;color:#888;padding:6px 8px;text-align:left}
.ph-header td{padding:7px 12px;background:#FAFAFA;font-size:10px}
tr td{padding:5px 8px;border-bottom:1px solid #F5F3FF;font-size:10.5px;vertical-align:top}
.ph-spacer td{height:6px}
.td-act{max-width:180px;font-weight:500}
.td-resp{color:#666;max-width:110px;font-size:10px}
.td-dur{color:${primary};font-weight:600;text-align:center;white-space:nowrap}
.td-status{font-weight:600;font-size:10px;white-space:nowrap}
.td-notes{color:#888;font-size:10px;max-width:120px}
.footer{margin-top:14px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #EDE9FE;padding-top:8px}
.print-btn{position:fixed;bottom:20px;right:20px;background:${primary};color:#fff;border:none;padding:9px 20px;border-radius:24px;font-size:12px;cursor:pointer;font-family:'Jost',sans-serif}
@media print{.print-btn{display:none}}
</style></head>
<body>
<div class="header">
  <div>
    <div class="sub">${eventType}${eventCode ? ' · ' + eventCode : ''}${eventDate ? ' · ' + eventDate : ''}</div>
    <h1>${eventName}</h1>
  </div>
  <div style="text-align:right;font-size:11px;opacity:.85">
    <div>Timeline del evento</div>
    <div style="font-size:9px;margin-top:4px">Generado: ${genDate}</div>
    <div style="font-size:9px;margin-top:2px">IventIA Planner</div>
  </div>
</div>
<div class="kpi-row">${kpiHtml}</div>
${progressBar}
<table>
<thead><tr>
  <th>INICIO</th><th>FIN</th><th style="text-align:center">DUR.</th>
  <th>ACTIVIDAD</th><th>RESPONSABLE</th><th>ESTADO</th><th>NOTAS</th>
</tr></thead>
<tbody>${phaseRows}</tbody>
</table>
<div class="footer">IventIA Planner &nbsp;·&nbsp; Timeline generado el ${genDate}</div>
<button class="print-btn" onclick="window.print()">⎙ Guardar PDF</button>
<script>setTimeout(()=>window.print(),800)</script>
</body></html>`

  openHtml(html)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message, modal } = App.useApp()
  const importInputRef = useRef<HTMLInputElement>(null)

  const { store, update, syncStatus, ready } = usePlannerStore<TimelineStore>(
    eventId, 'timeline',
    { phases: [], activities: [], updatedAt: '' },
    `iventia-timeline-${eventId}`,
  )
  const { store: branding } = usePlannerStore<EventBranding>(
    eventId, 'branding', { ...DEFAULT_BRANDING }, `iventia-branding-${eventId}`,
  )
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // ── Panel state (HSODAK pattern) ──────────────────────────────────────────
  const [selectedActivity, setSelectedActivity] = useState<TimelineActivity | null>(null)
  const [draft, setDraft] = useState<ActivityDraft | null>(null)
  const [dirty, setDirty] = useState(false)

  const openPanel = (act: TimelineActivity) => {
    setSelectedActivity(act)
    setDraft(actToDraft(act))
    setDirty(false)
  }

  const closePanel = () => {
    setSelectedActivity(null)
    setDraft(null)
    setDirty(false)
  }

  const patchDraft = (patch: Partial<ActivityDraft>) => {
    setDraft(d => d ? { ...d, ...patch } : d)
    setDirty(true)
  }

  const handleSavePanel = () => {
    if (!selectedActivity || !draft) return
    update({
      activities: store.activities.map(a =>
        a.id === selectedActivity.id ? { ...a, ...draft } : a
      ),
    })
    setDirty(false)
    message.success('Actividad actualizada')
  }

  const handleDeletePanel = () => {
    if (!selectedActivity) return
    update({
      activities: store.activities.filter(a => a.id !== selectedActivity.id),
    })
    closePanel()
    message.success('Actividad eliminada')
  }

  // Phase modal (kept as modal — phases are simple 2-field forms)
  const [phModal, setPhModal] = useState(false)
  const [editPh, setEditPh] = useState<TimelinePhase | null>(null)
  const [phForm] = Form.useForm()

  // New activity modal
  const [newActModal, setNewActModal] = useState<{ open: boolean; phaseId: string }>({ open: false, phaseId: '' })
  const [actForm] = Form.useForm()

  // ── Excel import ──────────────────────────────────────────────────────────
  async function importFromExcel(file: File) {
    try {
      const ExcelJS = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      if (!ws) { message.error('El archivo no contiene hojas'); return }

      const colMap: Record<string, number> = {}
      ws.getRow(1).eachCell((cell, ci) => {
        const v = String(cell.value ?? '').trim()
        if (v) colMap[v] = ci
      })

      if (!colMap['Actividad']) {
        message.error('El archivo no tiene la columna "Actividad". Usa el Excel exportado como plantilla.')
        return
      }

      const STATUS_REVERSE: Record<string, TimelineActivity['status']> = {
        completada: 'COMPLETED', 'en progreso': 'IN_PROGRESS', pendiente: 'PENDING',
      }

      type ParsedRow = {
        phase: string; name: string; responsible: string
        startTime: string; endTime: string
        status: TimelineActivity['status']; notes: string
      }
      const rows: ParsedRow[] = []
      ws.eachRow((row, ri) => {
        if (ri === 1) return
        const str = (col: string) => {
          const idx = colMap[col]; if (!idx) return ''
          const v = row.getCell(idx).value
          return v == null ? '' : String(v).trim()
        }
        const name = str('Actividad')
        if (!name) return
        const statusKey = str('Estado').toLowerCase()
        rows.push({
          phase:       str('Fase') || 'General',
          name,
          responsible: str('Responsable'),
          startTime:   str('Inicio'),
          endTime:     str('Fin'),
          status:      STATUS_REVERSE[statusKey] ?? 'PENDING',
          notes:       str('Notas'),
        })
      })

      if (rows.length === 0) { message.warning('No se encontraron filas con datos'); return }

      modal.confirm({
        title: `Importar ${rows.length} actividades`,
        content: `Se reemplazará el timeline actual con las ${rows.length} actividades del archivo "${file.name}". Esta acción no se puede deshacer.`,
        okText: 'Reemplazar',
        cancelText: 'Cancelar',
        okButtonProps: { danger: true },
        onOk() {
          const COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#7C2D8E']
          const phaseNames = [...new Set(rows.map(r => r.phase))]
          const newPhases: TimelinePhase[] = phaseNames.map((name, i) => ({
            id: `ph-${Date.now()}-${i}`, name, color: COLORS[i % COLORS.length], sortOrder: i,
          }))
          const phIdByName: Record<string, string> = {}
          newPhases.forEach(ph => { phIdByName[ph.name] = ph.id })
          const newActivities: TimelineActivity[] = rows.map((r, i) => ({
            id: `act-${Date.now()}-${i}`,
            phaseId:     phIdByName[r.phase],
            name:        r.name,
            responsible: r.responsible,
            startTime:   r.startTime,
            endTime:     r.endTime,
            status:      r.status,
            notes:       r.notes,
          }))
          update({ phases: newPhases, activities: newActivities })
          message.success(`${rows.length} actividades importadas correctamente`)
        },
      })
    } catch (err) {
      console.error(err)
      message.error('Error al leer el archivo Excel')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const all = store.activities
    const total      = all.length
    const completed  = all.filter(a => a.status === 'COMPLETED').length
    const inProgress = all.filter(a => a.status === 'IN_PROGRESS').length
    const pending    = all.filter(a => a.status === 'PENDING').length
    return { total, completed, inProgress, pending }
  }, [store.activities])

  const lastEdit = store.updatedAt ? dayjs(store.updatedAt).fromNow() : null

  // ── Phase CRUD ────────────────────────────────────────────────────────────
  const openNewPhase = () => {
    setEditPh(null)
    phForm.resetFields()
    setPhModal(true)
  }

  const openEditPhase = (ph: TimelinePhase) => {
    setEditPh(ph)
    phForm.setFieldsValue({
      name: ph.name,
      date: ph.date ? dayjs(ph.date) : undefined,
    })
    setPhModal(true)
  }

  const savePhase = (vals: { name: string; date?: any }) => {
    const dateStr = vals.date ? vals.date.format('YYYY-MM-DD') : undefined
    const phases = editPh
      ? store.phases.map(p => p.id === editPh.id ? { ...p, name: vals.name, date: dateStr } : p)
      : [...store.phases, {
          id: `ph-${Date.now()}`,
          name: vals.name,
          color: DEFAULT_PHASES[store.phases.length % DEFAULT_PHASES.length]?.color ?? '#7C3AED',
          sortOrder: store.phases.length,
          date: dateStr,
        }]
    update({ phases })
    setPhModal(false)
  }

  const addDefaultPhase = (name: string, color: string) => {
    const phases = [...store.phases, {
      id: `ph-${Date.now()}`,
      name,
      color,
      sortOrder: store.phases.length,
    }]
    update({ phases })
    message.success(`Fase "${name}" agregada`)
  }

  const deletePhase = (id: string) => {
    if (selectedActivity?.phaseId === id) closePanel()
    update({
      phases:     store.phases.filter(p => p.id !== id),
      activities: store.activities.filter(a => a.phaseId !== id),
    })
    message.success('Fase eliminada')
  }

  // ── New Activity ──────────────────────────────────────────────────────────
  const openNewActivity = (phaseId: string) => {
    actForm.resetFields()
    actForm.setFieldsValue({ status: 'PENDING' })
    setNewActModal({ open: true, phaseId })
  }

  const saveNewActivity = (vals: any) => {
    const { phaseId } = newActModal
    const phIdx   = store.phases.findIndex(p => p.id === phaseId)
    const phCount = store.activities.filter(a => a.phaseId === phaseId).length
    const newAct: TimelineActivity = {
      id: `act-${Date.now()}`,
      phaseId,
      name:        vals.name,
      responsible: vals.responsible || '',
      startTime:   vals.startTime ? vals.startTime.format('HH:mm') : '',
      endTime:     vals.endTime   ? vals.endTime.format('HH:mm')   : '',
      status:      vals.status || 'PENDING',
      notes:       vals.notes || '',
    }
    update({ activities: [...store.activities, newAct] })
    setNewActModal({ open: false, phaseId: '' })
    message.success('Actividad agregada')
    // Open the panel for the new activity
    openPanel(newAct)
  }

  const toggleCollapse = (id: string) =>
    setCollapsed(c => ({ ...c, [id]: c[id] === false }))

  const isOpen = (id: string) => collapsed[id] !== false

  // ── Edit Panel ────────────────────────────────────────────────────────────
  const phaseOfSelected = selectedActivity
    ? store.phases.find(p => p.id === selectedActivity.phaseId)
    : null

  const EditPanel = () => {
    if (!selectedActivity || !draft) return null
    const s = STATUS_CFG[draft.status] ?? STATUS_CFG.PENDING

    return (
      <div style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid #EDE9FE',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #EDE9FE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FAFAFA',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Editar actividad</div>
            {phaseOfSelected && (
              <div style={{ fontSize: 10, color: phaseOfSelected.color, fontWeight: 600, marginTop: 2 }}>
                {phaseOfSelected.name}
              </div>
            )}
          </div>
          <Button
            type="text" size="small" icon={<CloseOutlined />}
            onClick={closePanel}
            style={{ color: '#aaa' }}
          />
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>

          {/* Nombre */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>
              ACTIVIDAD
            </div>
            <Input
              value={draft.name}
              onChange={e => patchDraft({ name: e.target.value })}
              placeholder="Nombre de la actividad"
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* Responsable */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>
              RESPONSABLE
            </div>
            <Input
              value={draft.responsible}
              onChange={e => patchDraft({ responsible: e.target.value })}
              placeholder="Nombre del responsable"
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* Horarios */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>
              HORARIO
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#bbb', marginBottom: 4 }}>Inicio</div>
                <TimePicker
                  value={draft.startTime ? dayjs(`2000-01-01T${draft.startTime}`) : undefined}
                  onChange={v => patchDraft({ startTime: v ? v.format('HH:mm') : '' })}
                  format="HH:mm"
                  minuteStep={5}
                  placeholder="00:00"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#bbb', marginBottom: 4 }}>Fin</div>
                <TimePicker
                  value={draft.endTime ? dayjs(`2000-01-01T${draft.endTime}`) : undefined}
                  onChange={v => patchDraft({ endTime: v ? v.format('HH:mm') : '' })}
                  format="HH:mm"
                  minuteStep={5}
                  placeholder="00:00"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </div>
            </div>
            {draft.startTime && draft.endTime && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                Duración: <strong>{calcDuration(draft.startTime, draft.endTime)}</strong>
              </div>
            )}
          </div>

          {/* Estado */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>
              ESTADO
            </div>
            <Select
              value={draft.status}
              onChange={v => patchDraft({ status: v })}
              style={{ width: '100%', borderRadius: 8 }}
            >
              <Select.Option value="PENDING">
                <span style={{ color: '#6B7280', fontWeight: 600 }}>● Pendiente</span>
              </Select.Option>
              <Select.Option value="IN_PROGRESS">
                <span style={{ color: '#D97706', fontWeight: 600 }}>● En progreso</span>
              </Select.Option>
              <Select.Option value="COMPLETED">
                <span style={{ color: '#059669', fontWeight: 600 }}>● Completada</span>
              </Select.Option>
            </Select>
            <div style={{
              marginTop: 8, padding: '4px 10px', borderRadius: 20,
              background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
              {s.label}
            </div>
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>
              NOTAS
            </div>
            <Input.TextArea
              value={draft.notes}
              onChange={e => patchDraft({ notes: e.target.value })}
              rows={3}
              placeholder="Observaciones adicionales..."
              style={{ borderRadius: 8, resize: 'none' }}
            />
          </div>
        </div>

        {/* Panel footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid #EDE9FE',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <Button
            type="primary"
            disabled={!dirty || !draft?.name?.trim()}
            onClick={handleSavePanel}
            style={{
              background: dirty && draft?.name?.trim() ? '#059669' : undefined,
              borderColor: dirty && draft?.name?.trim() ? '#059669' : undefined,
              borderRadius: 8,
              fontWeight: 600,
              width: '100%',
            }}
          >
            Guardar cambios
          </Button>
          <Popconfirm
            title="¿Eliminar esta actividad?"
            onConfirm={handleDeletePanel}
            okButtonProps={{ danger: true }}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button danger style={{ borderRadius: 8, width: '100%' }}>
              Eliminar actividad
            </Button>
          </Popconfirm>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7FF' }}>

      {/* ── Page header ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE9FE',
        padding: '16px 28px', flexShrink: 0,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>Timeline</Text>
              {kpi.total > 0 && (
                <Text style={{ fontSize: 22, fontWeight: 800, color: '#7C3AED' }}>
                  · {kpi.total} actividades
                </Text>
              )}
            </div>
            <Text style={{ fontSize: 12, color: '#aaa' }}>
              {store.phases.length} fases · {store.activities.length} actividades
              {lastEdit && ` · última edición ${lastEdit}`}
            </Text>
          </div>

          <Space>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) importFromExcel(f) }}
            />
            <Button
              icon={<UploadOutlined />}
              onClick={() => importInputRef.current?.click()}
            >
              Importar Excel
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => exportToExcel(store, event?.name || eventId)}
              disabled={store.activities.length === 0}
            >
              Exportar Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => generateTimelinePdf(store, event, branding)}
              disabled={store.activities.length === 0}
            >
              PDF
            </Button>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={openNewPhase}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontWeight: 600 }}
            >
              Nueva fase
            </Button>
          </Space>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: scrollable content ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>

          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
            {[
              { label: 'TOTAL ACTIVIDADES', value: kpi.total,
                sub: 'en el evento', color: '#7C3AED', border: '#C4B5FD' },
              { label: 'COMPLETADAS', value: kpi.completed,
                sub: kpi.total ? `${Math.round(kpi.completed / kpi.total * 100)}% del total` : '0% del total',
                color: '#059669', border: '#6EE7B7' },
              { label: 'EN PROGRESO', value: kpi.inProgress,
                sub: kpi.total ? `${Math.round(kpi.inProgress / kpi.total * 100)}% en curso` : '0% en curso',
                color: '#D97706', border: '#FCD34D' },
              { label: 'PENDIENTES', value: kpi.pending,
                sub: kpi.total ? `${Math.round(kpi.pending / kpi.total * 100)}% sin iniciar` : '0% sin iniciar',
                color: '#6B7280', border: '#D1D5DB' },
            ].map(card => (
              <div key={card.label} style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${card.border}22`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', letterSpacing: '0.14em', marginBottom: 6 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: card.color, lineHeight: 1.05 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Progress bar ── */}
          {kpi.total > 0 && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: '14px 20px',
              marginBottom: 18, border: '1px solid #EDE9FE',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                  Avance global del timeline
                </Text>
                <Space size={16}>
                  {[
                    { label: 'Completadas', color: '#059669' },
                    { label: 'En progreso', color: '#F59E0B' },
                    { label: 'Pendientes',  color: '#E5E7EB' },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                      <Text style={{ fontSize: 11, color: '#666' }}>{l.label}</Text>
                    </div>
                  ))}
                </Space>
              </div>
              <div style={{
                height: 12, borderRadius: 6, background: '#F3F4F6',
                overflow: 'hidden', display: 'flex',
              }}>
                <div style={{
                  width: `${kpi.completed / kpi.total * 100}%`,
                  background: 'linear-gradient(90deg, #059669, #34D399)',
                  transition: 'width 0.5s',
                }} />
                <div style={{
                  width: `${kpi.inProgress / kpi.total * 100}%`,
                  background: 'linear-gradient(90deg, #F59E0B, #FCD34D)',
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: '#aaa' }}>0</Text>
                <Text style={{ fontSize: 10, color: '#aaa' }}>{kpi.total} actividades</Text>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {store.phases.length === 0 && (
            <div style={{
              background: '#fff', borderRadius: 16, border: '2px dashed #DDD6FE',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '64px 20px', gap: 12,
            }}>
              <span style={{ fontSize: 48 }}>📅</span>
              <Text strong style={{ fontSize: 16, color: '#555' }}>Sin fases en el timeline</Text>
              <Text style={{ color: '#888', fontSize: 13 }}>
                Crea tu primera fase para organizar las actividades del evento
              </Text>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {DEFAULT_PHASES.map(p => (
                  <Button
                    key={p.name}
                    icon={<PlusOutlined />}
                    onClick={() => addDefaultPhase(p.name, p.color)}
                    style={{ borderColor: p.color, color: p.color, borderRadius: 8, fontWeight: 600 }}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              <Button
                type="primary" icon={<PlusOutlined />} onClick={openNewPhase}
                style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, marginTop: 4 }}
              >
                Nueva fase personalizada
              </Button>
            </div>
          )}

          {/* ── Phase list ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {store.phases.map((ph, phIdx) => {
              const phActs     = store.activities.filter(a => a.phaseId === ph.id)
              const completed  = phActs.filter(a => a.status === 'COMPLETED').length
              const inProgress = phActs.filter(a => a.status === 'IN_PROGRESS').length
              const pending    = phActs.filter(a => a.status === 'PENDING').length
              const open       = isOpen(ph.id)

              return (
                <div key={ph.id} style={{
                  background: '#fff', borderRadius: 14,
                  border: '1px solid #EDE9FE',
                  boxShadow: '0 1px 4px rgba(124,58,237,0.05)',
                  overflow: 'hidden',
                }}>
                  {/* Phase header */}
                  <div
                    onClick={() => toggleCollapse(ph.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 18px', cursor: 'pointer',
                      borderLeft: `4px solid ${ph.color}`,
                      background: open ? '#FAFAFA' : '#fff',
                      transition: 'background 0.15s',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        color: ph.color, fontSize: 11,
                        display: 'inline-block',
                        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s',
                      }}>▼</span>
                      <Text strong style={{ fontSize: 14, color: '#1a1a1a' }}>{ph.name}</Text>
                      {ph.date && (
                        <span style={{
                          background: `${ph.color}18`, color: ph.color,
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 20,
                        }}>
                          {dayjs(ph.date).format('DD MMM YYYY')}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: '#aaa' }}>{phActs.length} actividades</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {phActs.length > 0 && (
                        <>
                          <Text style={{ fontSize: 12, color: '#888' }}>
                            <strong style={{ color: '#059669' }}>{completed}</strong> completadas
                          </Text>
                          {inProgress > 0 && (
                            <Text style={{ fontSize: 12, color: '#888' }}>
                              <strong style={{ color: '#D97706' }}>{inProgress}</strong> en progreso
                            </Text>
                          )}
                          {pending > 0 && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                              background: '#F9FAFB', color: '#6B7280',
                            }}>
                              {pending} pendientes
                            </span>
                          )}
                        </>
                      )}
                      <Space onClick={e => e.stopPropagation()} size={4}>
                        <Button size="small" type="text" icon={<EditOutlined />}
                          onClick={() => openEditPhase(ph)}
                          style={{ color: '#888', height: 26 }} />
                        <Popconfirm
                          title={`¿Eliminar fase "${ph.name}" y sus ${phActs.length} actividades?`}
                          onConfirm={() => deletePhase(ph.id)}
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" type="text" icon={<DeleteOutlined />}
                            style={{ color: '#DC2626', height: 26 }} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>

                  {/* Phase body */}
                  {open && (
                    <div>
                      {/* Table header */}
                      {phActs.length > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '3fr 1.4fr 80px 80px 90px 140px 52px',
                          padding: '6px 18px',
                          background: '#FAFAFA',
                          borderTop: '1px solid #F0EBFF',
                          borderBottom: '1px solid #F0EBFF',
                        }}>
                          {['ACTIVIDAD', 'RESPONSABLE', 'INICIO', 'FIN', 'DURACIÓN', 'ESTADO', ''].map((h, i) => (
                            <div key={i} style={{
                              fontSize: 9, fontWeight: 700, color: '#aaa',
                              letterSpacing: '0.1em',
                            }}>{h}</div>
                          ))}
                        </div>
                      )}

                      {/* Activity rows */}
                      {phActs.map((act, actIdx) => {
                        const s = STATUS_CFG[act.status] ?? STATUS_CFG.PENDING
                        const dur = calcDuration(act.startTime, act.endTime)
                        const code = `F${phIdx + 1}-${actIdx + 1}`
                        const isSelected = selectedActivity?.id === act.id
                        return (
                          <div
                            key={act.id}
                            onClick={() => openPanel(act)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '3fr 1.4fr 80px 80px 90px 140px 52px',
                              padding: '10px 18px',
                              borderBottom: '1px solid #FAF8FF',
                              alignItems: 'center',
                              cursor: 'pointer',
                              background: isSelected ? '#F5F3FF' : undefined,
                              borderLeft: isSelected ? `3px solid #7C3AED` : '3px solid transparent',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#FAF8FF' }}
                            onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '' }}
                          >
                            {/* Actividad */}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                {act.name}
                              </div>
                              <div style={{ fontSize: 10, color: '#bbb' }}>{code}</div>
                            </div>
                            {/* Responsable */}
                            <div style={{ fontSize: 12, color: '#555' }}>{act.responsible || '—'}</div>
                            {/* Inicio */}
                            <div style={{ fontSize: 13, color: '#333' }}>{act.startTime || '—'}</div>
                            {/* Fin */}
                            <div style={{ fontSize: 13, color: '#333' }}>{act.endTime || '—'}</div>
                            {/* Duración */}
                            <div style={{ fontSize: 12, color: '#888' }}>{dur}</div>
                            {/* Estado */}
                            <div>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: s.bg, color: s.color,
                                fontSize: 11, fontWeight: 600,
                                padding: '3px 10px', borderRadius: 20,
                              }}>
                                <span style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: s.dot, display: 'inline-block', flexShrink: 0,
                                }} />
                                {s.label}
                              </span>
                            </div>
                            {/* Actions — just edit icon to hint clickability */}
                            <div onClick={e => e.stopPropagation()}>
                              <Popconfirm
                                title="¿Eliminar esta actividad?"
                                onConfirm={() => {
                                  if (selectedActivity?.id === act.id) closePanel()
                                  update({ activities: store.activities.filter(a => a.id !== act.id) })
                                  message.success('Actividad eliminada')
                                }}
                                okButtonProps={{ danger: true }}
                              >
                                <Button size="small" type="text" icon={<DeleteOutlined />}
                                  style={{ color: '#DC2626', height: 26, width: 28, padding: 0 }} />
                              </Popconfirm>
                            </div>
                          </div>
                        )
                      })}

                      {/* Footer: add activity */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '9px 18px',
                        background: '#FAFAFA',
                        borderTop: phActs.length > 0 ? '1px solid #F0EBFF' : 'none',
                      }}>
                        <Button
                          type="link" icon={<PlusOutlined />} size="small"
                          onClick={() => openNewActivity(ph.id)}
                          style={{ color: ph.color, fontWeight: 600, padding: 0, height: 28 }}
                        >
                          Agregar actividad
                        </Button>
                        {phActs.length > 0 && (
                          <Text style={{ fontSize: 11, color: '#aaa' }}>
                            {completed}/{phActs.length} completadas
                          </Text>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add phase shortcut */}
          {store.phases.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Button
                icon={<PlusOutlined />} type="dashed"
                onClick={openNewPhase}
                style={{ width: '100%', borderColor: '#DDD6FE', color: '#7C3AED', borderRadius: 10, height: 40 }}
              >
                Agregar fase
              </Button>
            </div>
          )}
        </div>

        {/* ── Right: edit panel ── */}
        <EditPanel />
      </div>

      {/* ── Phase Modal ── */}
      <Modal
        title={editPh ? 'Editar fase' : 'Nueva fase'}
        open={phModal}
        onCancel={() => setPhModal(false)}
        onOk={() => phForm.submit()}
        okText="Guardar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        destroyOnClose
      >
        <Form form={phForm} layout="vertical" onFinish={savePhase}>
          <Form.Item
            name="name" label="Nombre de la fase"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej: Montaje, Cóctel de bienvenida, Desmontaje..." size="large" autoFocus />
          </Form.Item>
          <Form.Item name="date" label="Fecha de referencia (opcional)">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Seleccionar fecha" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── New Activity Modal ── */}
      <Modal
        title="Nueva actividad"
        open={newActModal.open}
        onCancel={() => setNewActModal({ open: false, phaseId: '' })}
        onOk={() => actForm.submit()}
        okText="Agregar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        width={520}
        destroyOnClose
      >
        <Form form={actForm} layout="vertical" onFinish={saveNewActivity}>
          <Form.Item
            name="name" label="Actividad"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej: Apertura de puertas, Primer plato, Brindis..." autoFocus />
          </Form.Item>
          <Form.Item name="responsible" label="Responsable">
            <Input placeholder="Nombre del responsable..." />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 12 }}>
            <Form.Item name="startTime" label="Inicio">
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} placeholder="00:00" />
            </Form.Item>
            <Form.Item name="endTime" label="Fin">
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} placeholder="00:00" />
            </Form.Item>
            <Form.Item name="status" label="Estado" initialValue="PENDING">
              <Select>
                <Select.Option value="PENDING">
                  <span style={{ color: '#6B7280', fontWeight: 600 }}>● Pendiente</span>
                </Select.Option>
                <Select.Option value="IN_PROGRESS">
                  <span style={{ color: '#D97706', fontWeight: 600 }}>● En progreso</span>
                </Select.Option>
                <Select.Option value="COMPLETED">
                  <span style={{ color: '#059669', fontWeight: 600 }}>● Completada</span>
                </Select.Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
