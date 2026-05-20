/**
 * TimelinePage.tsx
 * Timeline del evento por fases — persiste en localStorage por evento
 * Diseño: fases colapsables, actividades con Responsable/Inicio/Fin/Duración/Estado,
 * 4 KPIs (Total, Completadas, En progreso, Pendientes) y barra de avance.
 */
import { useState, useMemo } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import {
  Button, Modal, Form, Input, Select, Space, Popconfirm, App, Typography, DatePicker, TimePicker,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FileExcelOutlined, UploadOutlined,
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
    // Notify widgets in the same app (e.g. Lienzo TimelineWidget)
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

async function exportToExcel(store: TimelineStore, eventName: string) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Timeline')
  ws.columns = [
    { header: 'Fase',         key: 'phase',       width: 18 },
    { header: 'Actividad',    key: 'name',        width: 34 },
    { header: 'Responsable',  key: 'responsible', width: 22 },
    { header: 'Inicio',       key: 'startTime',   width: 10 },
    { header: 'Fin',          key: 'endTime',     width: 10 },
    { header: 'Duración',     key: 'duration',    width: 12 },
    { header: 'Estado',       key: 'status',      width: 14 },
    { header: 'Notas',        key: 'notes',       width: 30 },
  ]
  ws.getRow(1).font = { bold: true }
  for (const act of store.activities) {
    const ph = store.phases.find(p => p.id === act.phaseId)
    ws.addRow({
      phase:       ph?.name ?? '',
      name:        act.name,
      responsible: act.responsible || '',
      startTime:   act.startTime || '',
      endTime:     act.endTime || '',
      duration:    calcDuration(act.startTime, act.endTime),
      status:      STATUS_CFG[act.status]?.label ?? act.status,
      notes:       act.notes ?? '',
    })
  }
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf]))
  const a = document.createElement('a')
  a.href = url
  a.download = `timeline-${eventName || 'evento'}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { id: eventId = '' } = useParams<{ id: string }>()
  const { event } = useOutletContext<{ event: any }>()
  const { message } = App.useApp()

  const [store, setStore] = useState<TimelineStore>(() => loadStore(eventId))
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Modals
  const [phModal, setPhModal] = useState(false)
  const [editPh, setEditPh] = useState<TimelinePhase | null>(null)
  const [actModal, setActModal] = useState<{
    open: boolean; phaseId: string; editing: TimelineActivity | null
  }>({ open: false, phaseId: '', editing: null })

  const [phForm] = Form.useForm()
  const [actForm] = Form.useForm()

  const update = (next: Partial<TimelineStore>) => {
    const merged = { ...store, ...next }
    setStore(merged)
    saveStore(eventId, merged)
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
    update({
      phases:     store.phases.filter(p => p.id !== id),
      activities: store.activities.filter(a => a.phaseId !== id),
    })
    message.success('Fase eliminada')
  }

  // ── Activity CRUD ─────────────────────────────────────────────────────────
  const openNewActivity = (phaseId: string) => {
    actForm.resetFields()
    actForm.setFieldsValue({ status: 'PENDING' })
    setActModal({ open: true, phaseId, editing: null })
  }

  const openEditActivity = (act: TimelineActivity) => {
    actForm.setFieldsValue({
      name:        act.name,
      responsible: act.responsible,
      startTime:   act.startTime ? dayjs(`2000-01-01T${act.startTime}`) : undefined,
      endTime:     act.endTime   ? dayjs(`2000-01-01T${act.endTime}`)   : undefined,
      status:      act.status,
      notes:       act.notes,
    })
    setActModal({ open: true, phaseId: act.phaseId, editing: act })
  }

  const saveActivity = (vals: any) => {
    const { phaseId, editing } = actModal
    const payload = {
      ...vals,
      startTime: vals.startTime ? vals.startTime.format('HH:mm') : '',
      endTime:   vals.endTime   ? vals.endTime.format('HH:mm')   : '',
    }
    if (editing) {
      update({ activities: store.activities.map(a => a.id === editing.id ? { ...a, ...payload } : a) })
    } else {
      const phIdx   = store.phases.findIndex(p => p.id === phaseId)
      const phCount = store.activities.filter(a => a.phaseId === phaseId).length
      update({
        activities: [...store.activities, {
          id: `act-${Date.now()}`,
          phaseId,
          code: `F${phIdx + 1}-${phCount + 1}`,
          ...payload,
        }],
      })
    }
    setActModal({ open: false, phaseId: '', editing: null })
    message.success(editing ? 'Actividad actualizada' : 'Actividad agregada')
  }

  const deleteActivity = (id: string) => {
    update({ activities: store.activities.filter(a => a.id !== id) })
    message.success('Actividad eliminada')
  }

  const toggleCollapse = (id: string) =>
    setCollapsed(c => ({ ...c, [id]: c[id] === false }))

  const isOpen = (id: string) => collapsed[id] !== false

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#F8F7FF' }}>

      {/* ── Page header ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #EDE9FE',
        padding: '16px 28px', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
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
            <Button
              icon={<UploadOutlined />}
              onClick={() => message.info('Importación desde Excel — próximamente')}
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
              type="primary" icon={<PlusOutlined />}
              onClick={openNewPhase}
              style={{ background: '#7C3AED', borderColor: '#7C3AED', borderRadius: 8, fontWeight: 600 }}
            >
              Nueva fase
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

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
                        gridTemplateColumns: '3fr 1.4fr 80px 80px 90px 140px 72px',
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
                      return (
                        <div
                          key={act.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '3fr 1.4fr 80px 80px 90px 140px 72px',
                            padding: '10px 18px',
                            borderBottom: '1px solid #FAF8FF',
                            alignItems: 'center',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAF8FF'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
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
                          {/* Actions */}
                          <div>
                            <Space size={2}>
                              <Button size="small" type="text" icon={<EditOutlined />}
                                onClick={() => openEditActivity(act)}
                                style={{ color: '#aaa', height: 26, width: 28, padding: 0 }} />
                              <Popconfirm title="¿Eliminar esta actividad?" onConfirm={() => deleteActivity(act.id)}
                                okButtonProps={{ danger: true }}>
                                <Button size="small" type="text" icon={<DeleteOutlined />}
                                  style={{ color: '#DC2626', height: 26, width: 28, padding: 0 }} />
                              </Popconfirm>
                            </Space>
                          </div>
                        </div>
                      )
                    })}

                    {/* Footer: add activity + count */}
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

      {/* ── Activity Modal ── */}
      <Modal
        title={actModal.editing ? 'Editar actividad' : 'Nueva actividad'}
        open={actModal.open}
        onCancel={() => setActModal({ open: false, phaseId: '', editing: null })}
        onOk={() => actForm.submit()}
        okText="Guardar"
        okButtonProps={{ style: { background: '#7C3AED', borderColor: '#7C3AED' } }}
        width={580}
        destroyOnClose
      >
        <Form form={actForm} layout="vertical" onFinish={saveActivity}>
          <Form.Item
            name="name" label="Actividad"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej: Apertura de puertas, Primer plato, Brindis..." />
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
            <Form.Item name="status" label="Estado">
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
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
