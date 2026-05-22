/**
 * ClientPortalPage.tsx — "Lienzo del Cliente"
 * PUBLIC client portal — accessible at /portal-cliente/:id (no admin auth required)
 * Renders the same canvas/lienzo as the planner but in read-only mode.
 * Authentication: email + password via portal user JWT
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Input, Typography, Avatar, Spin, Tag, Modal, DatePicker, Form, App, message as antdMessage } from 'antd'
import {
  LockOutlined, UserOutlined, CheckCircleOutlined,
  CalendarOutlined, DollarOutlined, BarChartOutlined,
  PictureOutlined, LinkOutlined, FileTextOutlined,
  PrinterOutlined, YoutubeOutlined, EyeOutlined,
  MinusOutlined, PlusOutlined, PlusCircleOutlined,
  EditOutlined, AuditOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, CreditCardOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')
import { plannerPortalApi } from '../../api/portalClient'
import { DEFAULT_BRANDING, type EventBranding } from './EstudioPage'

const { Text } = Typography

const fontHeadingMap: Record<string, string> = {
  modern:  "'Plus Jakarta Sans', sans-serif",
  classic: 'Georgia, serif',
  elegant: "'Didact Gothic', sans-serif",
  bold:    "'Montserrat', sans-serif",
  playful: 'cursive',
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Widget {
  id: string
  type: string
  x: number
  y: number
  w: number
  h: number
  config: Record<string, any>
}

interface PortalSnapshot {
  branding?: EventBranding
  portalConfig?: { visibleWidgets: string[]; portalMessage?: string; accessEnabled?: boolean }
  timeline?: any
  tareas?: any
  presupuesto?: any
  contrato?: any
  lienzo?: any
  eventSnapshot?: {
    name: string
    eventStart: string
    eventType: string
    code: string
    venueLocation: string
    expectedAttendance: number
    description: string
    client: any
  }
}

// ── Read-only widget renderers ────────────────────────────────────────────────

function PortadaWidgetRO({ event, branding }: { event: any; branding: EventBranding }) {
  const hasBanner = branding.coverStyle === 'image' && branding.bannerUrl
  const bg = hasBanner ? undefined
    : branding.coverStyle === 'gradient' ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
    : branding.coverStyle === 'split'   ? `linear-gradient(90deg, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`
    : branding.coverStyle === 'dark'    ? '#0D0D1A'
    : branding.primaryColor
  const textColor = (hasBanner || branding.coverStyle === 'dark') ? '#ffffff' : (branding.textOnBg || '#ffffff')
  const muted = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)'
  const font = fontHeadingMap[branding.fontStyle] || fontHeadingMap.modern
  const daysUntil = event?.eventStart ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day')) : null

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden',
      background: bg, padding: 20, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', color: textColor, userSelect: 'none', position: 'relative',
      ...(hasBanner ? { backgroundImage: `url(${branding.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    }}>
      {/* Dark overlay for banner images */}
      {hasBanner && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.7) 100%)' }} />
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: branding.accentColor }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.06em', marginBottom: 6 }}>
          {event?.eventType || 'EVENTO'} · {event?.code || '—'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4, fontFamily: font }}>
          {event?.name || 'Mi evento'}
        </div>
        {branding.tagline && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', marginBottom: 4 }}>"{branding.tagline}"</div>}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: muted }}>
          {event?.venueLocation && <span>📍 {event.venueLocation}</span>}
          {event?.eventStart && <span>📅 {dayjs(event.eventStart).format('D MMM YYYY')}</span>}
        </div>
      </div>
      {daysUntil !== null && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>FALTAN</div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, fontFamily: font }}>{daysUntil}</div>
            <div style={{ fontSize: 13, color: muted }}>días para el evento</div>
          </div>
          {event?.expectedAttendance && (
            <div style={{ textAlign: 'right', color: muted }}>
              <div style={{ fontSize: 11 }}>Asistentes</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{event.expectedAttendance}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  POR_HACER: 'Por hacer', EN_CURSO: 'En curso', ESPERANDO_OK: 'Esperando OK', LISTA: 'Lista',
}
const STATUS_COLORS: Record<string, string> = {
  POR_HACER: '#6B7280', EN_CURSO: '#2563EB', ESPERANDO_OK: '#F97316', LISTA: '#059669',
}

// ── Interactive tasks widget ──────────────────────────────────────────────────
function TareasWidgetRO({
  tareas, eventId, token, onTasksChange,
}: {
  tareas: any
  eventId: string
  token: string
  onTasksChange: (tasks: any[]) => void
}) {
  const allTasks = tareas?.tasks ?? []
  const visible = allTasks.filter((t: any) => {
    if (t.status === 'LISTA') return false
    if (t.clientCreated) return true                     // client's own tasks always visible
    if (t.assigneeType === 'internal') return false      // internal tasks never visible
    return t.clientVisible !== false                     // backward compat: old tasks visible by default
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  function openCreate() { setEditingTask(null); form.resetFields(); setModalOpen(true) }
  function openEdit(task: any) { setEditingTask(task); form.setFieldsValue({ title: task.title, notes: task.notes, dueDate: task.dueDate ? dayjs(task.dueDate) : undefined }); setModalOpen(true) }

  async function handleSave() {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload: any = {
        title: values.title,
        notes: values.notes,
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
      }
      if (editingTask) payload.id = editingTask.id
      const res = await plannerPortalApi.addTask(eventId, payload, token)
      onTasksChange(res.data ?? [])
      setModalOpen(false)
    } catch (err: any) {
      antdMessage.error(err?.response?.data?.message || 'Error al guardar tarea')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
        <Text strong style={{ fontSize: 13 }}>TAREAS DEL EVENTO</Text>
        <div style={{ flex: 1 }} />
        <Button
          type="link" icon={<PlusCircleOutlined />} size="small"
          onClick={openCreate}
          style={{ color: '#7C3AED', padding: 0, fontSize: 13 }}
        >Nueva</Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>Sin tareas pendientes</div>
        ) : visible.map((task: any) => {
          const daysUntil = task.dueDate ? dayjs(task.dueDate).diff(dayjs(), 'day') : null
          return (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
              borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{task.title}</div>
                {task.assignedTo && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{task.assignedTo}</div>}
              </div>
              {daysUntil !== null && (
                <Tag style={{
                  background: daysUntil <= 2 ? '#FEF2F2' : daysUntil <= 4 ? '#FFF7ED' : '#F0F9FF',
                  color: daysUntil <= 2 ? '#DC2626' : daysUntil <= 4 ? '#D97706' : '#2563EB',
                  border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600,
                }}>{daysUntil}d</Tag>
              )}
              {task.clientCreated && (
                <Button
                  type="text" icon={<EditOutlined />} size="small"
                  onClick={() => openEdit(task)}
                  style={{ color: '#7C3AED', padding: '0 4px', height: 20, fontSize: 11 }}
                />
              )}
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        title={editingTask ? 'Editar tarea' : 'Nueva tarea'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Ingresa un título' }]}>
            <Input placeholder="Describe la tarea..." />
          </Form.Item>
          <Form.Item name="notes" label="Notas (opcional)">
            <Input.TextArea rows={3} placeholder="Detalles adicionales..." />
          </Form.Item>
          <Form.Item name="dueDate" label="Fecha límite (opcional)">
            <DatePicker style={{ width: '100%' }} placeholder="Selecciona fecha" format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function ProveedoresWidgetRO({ suppliers }: { suppliers: any[] }) {
  const CATS: Record<string, string> = {
    CATERING: 'Catering', DECORATION: 'Decoración', PHOTOGRAPHY: 'Fotografía',
    MUSIC: 'Música / DJ', TRANSPORT: 'Transporte', VENUE: 'Espacio', OTHER: 'Otro',
  }
  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <Text strong style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 12, display: 'block' }}>PROVEEDORES</Text>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suppliers.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>Sin proveedores</div>
        ) : suppliers.map((s: any) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF',
          }}>
            <Avatar size={32} style={{ background: '#7C3AED', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {(s.name || '?').slice(0, 2).toUpperCase()}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{CATS[s.category] || s.category || ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotaWidgetRO({ config }: { config: any }) {
  return (
    <div style={{
      width: '100%', height: '100%', padding: 16, borderRadius: 12,
      background: config.color || '#FFF9C4', userSelect: 'none',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>📝 Nota</div>
      <div style={{ fontSize: 13, color: config.text ? '#333' : '#aaa', lineHeight: 1.6 }}>
        {config.text || ''}
      </div>
    </div>
  )
}

function TextoWidgetRO({ config }: { config: any }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', alignItems: 'center', userSelect: 'none' }}>
      <div style={{
        fontSize: config.fontSize || 16, fontWeight: config.bold ? 700 : 400,
        color: config.text ? (config.color || '#1a1a1a') : '#ccc',
      }}>
        {config.text || ''}
      </div>
    </div>
  )
}

function ImagenWidgetRO({ config }: { config: any }) {
  const url = config.imageUrl || config.src
  if (!url) return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PictureOutlined style={{ fontSize: 32, color: '#DDD6FE' }} />
    </div>
  )
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

function extractYouTubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&\s]+)/, /youtu\.be\/([^?\s]+)/, /youtube\.com\/embed\/([^?\s]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function extractTikTokId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  return m ? m[1] : null
}

// ── Links widget: YouTube/TikTok → embed, everything else → link card ──
function LinksWidgetRO({ config }: { config: any }) {
  const url: string = config.url || ''

  if (!url) return (
    <div style={{ width: '100%', height: '100%', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3FF', borderRadius: 12 }}>
      <LinkOutlined style={{ fontSize: 32, color: '#DDD6FE' }} />
    </div>
  )

  // YouTube
  const ytId = extractYouTubeId(url)
  if (ytId) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
        <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
          style={{ flex: 1, border: 'none', display: 'block' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen title="YouTube video" />
        <div style={{ padding: '5px 10px', background: '#fff', borderTop: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888', flexShrink: 0 }}>
          <YoutubeOutlined style={{ color: '#FF0000', fontSize: 14 }} /> YouTube
        </div>
      </div>
    )
  }

  // TikTok
  const ttId = extractTikTokId(url)
  if (ttId) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
        <iframe src={`https://www.tiktok.com/embed/v2/${ttId}`}
          style={{ flex: 1, border: 'none', display: 'block' }}
          allowFullScreen title="TikTok video" />
        <div style={{ padding: '5px 10px', background: '#fff', borderTop: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888', flexShrink: 0 }}>
          🎵 TikTok
        </div>
      </div>
    )
  }

  // Generic link card
  let hostname = url
  try { hostname = new URL(url).hostname } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`

  return (
    <div style={{ width: '100%', height: '100%', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, background: '#F5F3FF', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={faviconUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, background: '#EDE9FE', padding: 4 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 2 }}>Enlace externo</div>
          <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hostname}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#EDE9FE', borderRadius: 6, padding: '4px 8px' }}>{url}</div>
      <a href={url} target="_blank" rel="noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7C3AED', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start' }}>
        <EyeOutlined /> Abrir enlace
      </a>
    </div>
  )
}

function PdfWidgetRO({ config }: { config: any }) {
  const url = config.pdfUrl
  if (!url) return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <FileTextOutlined style={{ fontSize: 32, color: '#FECACA' }} />
      <Text style={{ fontSize: 12, color: '#aaa' }}>Sin documento</Text>
    </div>
  )
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      <iframe src={url} style={{ flex: 1, border: 'none' }} title="PDF" />
      <div style={{ padding: '5px 10px', background: '#fff', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888', flexShrink: 0 }}>
        <FileTextOutlined style={{ color: '#DC2626' }} /> PDF
      </div>
    </div>
  )
}

// Timeline read-only
const STATUS_DOT_RO: Record<string, string> = { COMPLETED: '#059669', IN_PROGRESS: '#F97316', PENDING: '#9CA3AF' }

function TimelineWidgetRO({ timeline, event, branding }: { timeline: any; event: any; branding: EventBranding }) {
  const localData = { phases: timeline?.phases || [], activities: timeline?.activities || [] }
  const phases = [...localData.phases].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const activities = localData.activities
  const byPhase: Record<string, any[]> = {}
  for (const act of activities) { const pid = act.phaseId || '__none__'; byPhase[pid] = byPhase[pid] || []; byPhase[pid].push(act) }
  const previewPhases = phases.slice(0, 4)

  const primary   = branding.primaryColor
  const secondary = branding.secondaryColor
  const hasBanner = branding.coverStyle === 'image' && branding.bannerUrl
  const font      = fontHeadingMap[branding.fontStyle] || fontHeadingMap.modern
  // Light tint of primary for dividers / background
  const lightBg   = branding.bgColor || '#F5F3FF'

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden',
        ...(hasBanner
          ? { backgroundImage: `url(${branding.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }),
      }}>
        {hasBanner && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.65) 100%)' }} />
        )}
        <div style={{ position: 'relative' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 3 }}>
            {event?.eventType || 'Evento'} · {event?.code || ''}
          </div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.15, fontFamily: font }}>
            {event?.name || '—'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 4 }}>
            {branding.tagline || 'Timeline'}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: lightBg }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '24px 0' }}>Sin actividades</div>
        ) : previewPhases.map((phase: any) => {
          const phaseActs = (byPhase[phase.id] || []).slice(0, 5)
          if (!phaseActs.length) return null
          const phaseColor = phase.color || primary
          return (
            <div key={phase.id}>
              <div style={{ padding: '6px 14px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: phaseColor, borderTop: `1px solid ${phaseColor}22` }}>
                {phase.name}
              </div>
              {phaseActs.map((act: any, i: number) => (
                <div key={act.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderBottom: `1px solid ${phaseColor}22` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT_RO[act.status] || '#9CA3AF', flexShrink: 0 }} />
                  <div style={{ width: 16, height: 1.5, background: phaseColor, opacity: 0.3, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: phaseColor, minWidth: 44, whiteSpace: 'nowrap', flexShrink: 0 }}>{act.startTime || ''}</span>
                  <span style={{ fontSize: 11, color: '#2d2d2d', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{act.name}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div style={{ padding: '7px 14px', background: `${primary}18`, flexShrink: 0, fontSize: 10, color: primary, opacity: 0.9 }}>
        {activities.length} actividades · {phases.length} fases
      </div>
    </div>
  )
}

// Presupuesto read-only (client view — no costs)
function PresupuestoWidgetRO({ presupuesto, event }: { presupuesto: any; event: any }) {
  const chapters = presupuesto?.chapters || []
  const items = (presupuesto?.items || []).filter((i: any) => i.status !== 'CANCELLED')
  const total = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitPrice || 0), 0)
  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F0EBFF', flexShrink: 0, background: 'linear-gradient(135deg, #7C3AED08, #EC489908)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <DollarOutlined style={{ color: '#7C3AED', fontSize: 16 }} />
        <Text strong style={{ fontSize: 13, color: '#1a1a1a' }}>Presupuesto</Text>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#7C3AED' }}>{fmt(total)}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
        {chapters.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '20px 0' }}>Sin presupuesto</div>
        ) : chapters.map((ch: any) => {
          const chItems = items.filter((i: any) => i.chapterId === ch.id)
          const chTotal = chItems.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitPrice || 0), 0)
          return (
            <div key={ch.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `2px solid ${ch.color || '#7C3AED'}20` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: ch.color || '#7C3AED' }}>{ch.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{fmt(chTotal)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Resumen read-only
function ResumenWidgetRO({ event, tareas, timeline, presupuesto }: { event: any; tareas: any; timeline: any; presupuesto: any }) {
  const tasks = tareas?.tasks || []
  const activities = timeline?.activities || []
  const items = (presupuesto?.items || []).filter((i: any) => i.status !== 'CANCELLED')
  const total = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitPrice || 0), 0)
  const tasksDone = tasks.filter((t: any) => t.status === 'LISTA' || t.status === 'DONE').length
  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F0EBFF', flexShrink: 0, background: 'linear-gradient(135deg, #7C3AED08, #EC489908)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChartOutlined style={{ color: '#7C3AED', fontSize: 16 }} />
        <Text strong style={{ fontSize: 13, color: '#1a1a1a' }}>Resumen del evento</Text>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Actividades', value: activities.length, color: '#7C3AED' },
            { label: 'Tareas', value: `${tasksDone}/${tasks.length}`, color: '#F97316' },
            { label: 'Conceptos', value: items.length, color: '#0D9488' },
            { label: 'Presupuesto', value: fmt(total), color: '#EC4899' },
          ].map(k => (
            <div key={k.label} style={{ background: '#FAFAFA', border: '1px solid #F0EBFF', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Signature Pad ─────────────────────────────────────────────────────────────
function SignaturePad({ onSign, onCancel, primaryColor, loading }: {
  onSign: (dataUrl: string) => void
  onCancel: () => void
  primaryColor: string
  loading?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const src = 'touches' in e ? (e as React.TouchEvent).touches[0] : (e as React.MouseEvent)
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawing.current = true
    setIsEmpty(false)
    e.preventDefault()
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    e.preventDefault()
  }

  function stopDraw() { drawing.current = false }

  function clearPad() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  function handleSign() {
    if (isEmpty) return
    const canvas = canvasRef.current!
    onSign(canvas.toDataURL('image/png'))
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
        Firma en el recuadro de abajo con el dedo o el mouse:
      </div>
      <canvas
        ref={canvasRef}
        width={400} height={160}
        style={{
          border: `2px solid ${primaryColor}44`, borderRadius: 8,
          background: '#FAFAFA', cursor: 'crosshair', display: 'block',
          width: '100%', touchAction: 'none',
        }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button size="small" onClick={clearPad} style={{ borderRadius: 8 }}>Limpiar</Button>
        <div style={{ flex: 1 }} />
        <Button size="small" onClick={onCancel} style={{ borderRadius: 8 }}>Cancelar</Button>
        <Button
          type="primary" size="small" disabled={isEmpty} loading={loading}
          onClick={handleSign}
          style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 8 }}
        >Firmar contrato</Button>
      </div>
    </div>
  )
}

// ── Contract widget with Stripe payment ───────────────────────────────────────
const CONTRATO_STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  BORRADOR:   { color: '#6B7280', bg: '#F3F4F6', label: 'Borrador' },
  COTIZACION: { color: '#2563EB', bg: '#EFF6FF', label: 'Cotización' },
  CONTRATO:   { color: '#7C3AED', bg: '#F5F3FF', label: 'Contrato' },
  FIRMADO:    { color: '#059669', bg: '#ECFDF5', label: 'Firmado' },
  CANCELADO:  { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelado' },
}
const PAY_STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  PENDIENTE: { color: '#D97706', bg: '#FFF7ED', label: 'Pendiente', icon: '⏳' },
  PAGADO:    { color: '#059669', bg: '#ECFDF5', label: 'Pagado',    icon: '✅' },
  VENCIDO:   { color: '#DC2626', bg: '#FEF2F2', label: 'Vencido',   icon: '❌' },
}

function ContratoWidgetRO({
  contrato, eventId, token, onContratoChange, branding,
}: {
  contrato: any
  eventId: string
  token: string
  onContratoChange: (updated: any) => void
  branding: EventBranding
}) {
  const [paying, setPayingId] = useState<string | null>(null)
  const [authorizing, setAuthorizing] = useState(false)
  const [showSignPad, setShowSignPad] = useState(false)
  const [signingLoading, setSigningLoading] = useState(false)

  const fmt = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  async function handleAuthorizeQuote() {
    setAuthorizing(true)
    try {
      const res = await plannerPortalApi.authorizeQuote(eventId, token)
      const updated = res.data?.contrato
      if (updated) onContratoChange(updated)
      antdMessage.success('Cotización autorizada. Ahora puedes firmar el contrato.')
    } catch (err: any) {
      antdMessage.error(err?.response?.data?.message || 'Error al autorizar')
    } finally { setAuthorizing(false) }
  }

  async function handleSign(signatureData: string) {
    setSigningLoading(true)
    try {
      const res = await plannerPortalApi.signContract(eventId, signatureData, token)
      const updated = res.data?.contrato
      if (updated) onContratoChange(updated)
      setShowSignPad(false)
      antdMessage.success('¡Contrato firmado exitosamente!')
    } catch (err: any) {
      antdMessage.error(err?.response?.data?.message || 'Error al firmar')
    } finally { setSigningLoading(false) }
  }

  if (!contrato?.contractNumber) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: '#F9F7FF', borderRadius: 12 }}>
        <AuditOutlined style={{ fontSize: 32, color: '#DDD6FE' }} />
        <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>El contrato de tu evento aún no está disponible.</Text>
      </div>
    )
  }

  const statusCfg = CONTRATO_STATUS_CFG[contrato.contractStatus] ?? CONTRATO_STATUS_CFG.CONTRATO
  const payments: any[] = contrato.scheduledPayments ?? []
  const totalPaid = payments.filter((p: any) => p.status === 'PAGADO').reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
  const totalDue = contrato.total ?? 0

  async function handlePay(payment: any) {
    setPayingId(payment.id)
    try {
      const res = await plannerPortalApi.createPaymentCheckout(eventId, payment.id, token)
      const url = res.data?.url
      if (url) window.location.href = url
    } catch (err: any) {
      antdMessage.error(err?.response?.data?.message || 'Error al iniciar el pago')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
        padding: '12px 14px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <AuditOutlined style={{ color: '#C4B5FD', fontSize: 14 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>CONTRATO</span>
          <div style={{ flex: 1 }} />
          <span style={{ background: statusCfg.bg, color: statusCfg.color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
            {statusCfg.label}
          </span>
        </div>
        <div style={{ color: '#E9D5FF', fontSize: 11, fontWeight: 600 }}>{contrato.contractNumber}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, letterSpacing: '0.08em' }}>TOTAL</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{fmt(totalDue)}</div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, letterSpacing: '0.08em' }}>PAGADO</div>
            <div style={{ color: '#6EE7B7', fontWeight: 800, fontSize: 15 }}>{fmt(totalPaid)}</div>
          </div>
          {totalDue > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, letterSpacing: '0.08em', marginBottom: 4 }}>AVANCE</div>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (totalPaid / totalDue) * 100)}%`, height: '100%', background: '#6EE7B7', borderRadius: 4 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payments list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>Sin pagos programados</div>
        ) : payments.map((p: any) => {
          const cfg = PAY_STATUS_CFG[p.status] ?? PAY_STATUS_CFG.PENDIENTE
          const isPending = p.status === 'PENDIENTE'
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.color}22`,
            }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{p.label || `Pago`}</div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {p.dueDate ? dayjs(p.dueDate).format('D MMM YYYY') : ''}
                  {p.percentage ? ` · ${p.percentage}%` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{fmt(p.amount ?? 0)}</div>
                {p.paidAt && <div style={{ fontSize: 10, color: '#888' }}>{dayjs(p.paidAt).format('D MMM')}</div>}
              </div>
              {isPending && (
                <Button
                  type="primary" size="small" icon={<CreditCardOutlined />}
                  loading={paying === p.id}
                  onClick={() => handlePay(p)}
                  style={{ background: '#7C3AED', borderColor: '#7C3AED', fontSize: 11, height: 28, paddingInline: 8 }}
                >
                  Pagar
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Authorization / Signature actions */}
      {contrato.contractStatus === 'COTIZACION' && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #F0EBFF', flexShrink: 0, background: '#FFFBEB' }}>
          <div style={{ fontSize: 11, color: '#92400E', marginBottom: 8, fontWeight: 600 }}>
            📋 Cotización pendiente de autorización
          </div>
          <Button type="primary" size="small" block loading={authorizing}
            onClick={handleAuthorizeQuote}
            style={{ background: '#D97706', borderColor: '#D97706', borderRadius: 8, fontWeight: 600 }}>
            ✓ Autorizar cotización
          </Button>
        </div>
      )}
      {contrato.contractStatus === 'CONTRATO' && !showSignPad && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #F0EBFF', flexShrink: 0, background: '#F0FDF4' }}>
          <div style={{ fontSize: 11, color: '#065F46', marginBottom: 8, fontWeight: 600 }}>
            ✅ Cotización autorizada — Contrato listo para firmar
          </div>
          <Button type="primary" size="small" block
            onClick={() => setShowSignPad(true)}
            style={{ background: '#059669', borderColor: '#059669', borderRadius: 8, fontWeight: 600 }}>
            ✍️ Firmar contrato
          </Button>
        </div>
      )}
      {contrato.contractStatus === 'CONTRATO' && showSignPad && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #F0EBFF', flexShrink: 0 }}>
          <SignaturePad
            primaryColor={branding.primaryColor}
            onSign={handleSign}
            onCancel={() => setShowSignPad(false)}
            loading={signingLoading}
          />
        </div>
      )}
      {contrato.contractStatus === 'FIRMADO' && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #BBF7D0', flexShrink: 0, background: '#ECFDF5', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
            ✅ Contrato firmado
          </div>
          {contrato.clientSignedAt && (
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              {dayjs(contrato.clientSignedAt).format('D MMM YYYY HH:mm')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Read-only widget dispatcher ───────────────────────────────────────────────
function WidgetRendererRO({ widget, snapshot, branding, eventId, token, onSnapshotChange }: {
  widget: Widget
  snapshot: PortalSnapshot
  branding: EventBranding
  eventId: string
  token: string
  onSnapshotChange: (patch: Partial<PortalSnapshot>) => void
}) {
  const event = snapshot.eventSnapshot
  switch (widget.type) {
    case 'portada':     return <PortadaWidgetRO event={event} branding={branding} />
    case 'tareas':      return (
      <TareasWidgetRO
        tareas={snapshot.tareas}
        eventId={eventId}
        token={token}
        onTasksChange={(tasks) => onSnapshotChange({ tareas: { ...(snapshot.tareas ?? {}), tasks } })}
      />
    )
    case 'proveedores': return <ProveedoresWidgetRO suppliers={
      Array.isArray(snapshot.lienzo?.suppliers) ? snapshot.lienzo.suppliers : []
    } />
    case 'nota':        return <NotaWidgetRO config={widget.config} />
    case 'texto':       return <TextoWidgetRO config={widget.config} />
    case 'imagen':      return <ImagenWidgetRO config={widget.config} />
    case 'pdf':         return <PdfWidgetRO config={widget.config} />
    case 'links':       return <LinksWidgetRO config={widget.config} />
    case 'resumen':     return <ResumenWidgetRO event={event} tareas={snapshot.tareas} timeline={snapshot.timeline} presupuesto={snapshot.presupuesto} />
    case 'timeline':    return <TimelineWidgetRO timeline={snapshot.timeline} event={event} branding={branding} />
    case 'presupuesto': return <PresupuestoWidgetRO presupuesto={snapshot.presupuesto} event={event} />
    case 'contrato':    return (
      <ContratoWidgetRO
        contrato={snapshot.contrato}
        eventId={eventId}
        token={token}
        onContratoChange={(updated) => onSnapshotChange({ contrato: updated })}
        branding={branding}
      />
    )
    default:            return null
  }
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const b = DEFAULT_BRANDING

  async function handleAcceder() {
    if (!email || !password) { setError('Ingresa tu correo y contraseña'); return }
    setLoading(true); setError(null)
    try { await onLogin(email, password) }
    catch (err: any) {
      setError(err?.response?.status === 401
        ? 'Credenciales incorrectas. Verifica con tu event designer.'
        : 'Error al conectar. Intenta de nuevo.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900, color: '#fff',
        }}>I</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: b.primaryColor, letterSpacing: '0.1em', marginBottom: 4 }}>IventIA PLANNER</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', marginBottom: 28 }}>Lienzo de tu Evento</div>
        <div style={{ textAlign: 'left', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Correo</label>
        </div>
        <Input size="large" prefix={<UserOutlined style={{ color: b.primaryColor }} />} placeholder="tu@correo.com"
          value={email} onChange={e => { setEmail(e.target.value); setError(null) }}
          onPressEnter={handleAcceder} status={error ? 'error' : undefined} style={{ marginBottom: 12 }} />
        <div style={{ textAlign: 'left', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Contraseña</label>
        </div>
        <Input.Password size="large" prefix={<LockOutlined style={{ color: b.primaryColor }} />} placeholder="Tu contraseña de acceso"
          value={password} onChange={e => { setPassword(e.target.value); setError(null) }}
          onPressEnter={handleAcceder} status={error ? 'error' : undefined} style={{ marginBottom: error ? 6 : 16 }} />
        {error && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 16, textAlign: 'left' }}>{error}</div>}
        <Button type="primary" size="large" block loading={loading} onClick={handleAcceder}
          style={{ background: b.primaryColor, borderColor: b.primaryColor, fontWeight: 700, height: 46 }}>
          Acceder
        </Button>
        <div style={{ marginTop: 32, fontSize: 11, color: '#9CA3AF' }}>Powered by IventIA Planner</div>
      </div>
    </div>
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const b = DEFAULT_BRANDING
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${b.primaryColor}, ${b.secondaryColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>Lienzo no disponible</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <Button type="primary" onClick={onRetry} style={{ background: b.primaryColor, borderColor: b.primaryColor }}>Volver a intentar</Button>
        <div style={{ marginTop: 24, fontSize: 11, color: '#9CA3AF' }}>Powered by IventIA Planner</div>
      </div>
    </div>
  )
}

// ── Magic ribbon helper (mirrors LienzoPage) ─────────────────────────────────
type SP = { x: number; y: number }

function calcPressure(pts: SP[], baseWidth: number): number[] {
  const n = pts.length
  const minW = Math.max(0.4, baseWidth * 0.06)
  const maxW = baseWidth
  if (n === 0) return []
  if (n === 1) return [minW]
  const vel: number[] = [0]
  for (let i = 1; i < n; i++) {
    const dx = pts[i].x - pts[i-1].x; const dy = pts[i].y - pts[i-1].y
    vel.push(Math.sqrt(dx*dx + dy*dy))
  }
  const smoothV = vel.map((_, i) => {
    const w = 4; const sl = vel.slice(Math.max(0,i-w), Math.min(n,i+w+1))
    return sl.reduce((s,v)=>s+v,0)/sl.length
  })
  const maxV = Math.max(...smoothV, 1)
  return pts.map((_, i) => {
    const vNorm = Math.min(smoothV[i]/maxV, 1)
    const velW = minW + (maxW-minW) * Math.pow(1 - vNorm*0.75, 1.4)
    const t = i/Math.max(1,n-1)
    const startT = t<0.18 ? Math.pow(t/0.18, 0.6) : 1
    const endT   = t>0.88 ? Math.pow((1-t)/0.12, 0.5) : 1
    return velW * startT * endT
  })
}

function buildMagicRibbon(pts: SP[], baseWidth: number): string {
  if (pts.length < 2) return ''
  const widths = calcPressure(pts, baseWidth)
  const left: SP[] = []; const right: SP[] = []
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0,i-1)]; const next = pts[Math.min(pts.length-1,i+1)]
    const dx = next.x-prev.x; const dy = next.y-prev.y
    const len = Math.sqrt(dx*dx+dy*dy)||1
    const nx = -dy/len; const ny = dx/len; const hw = widths[i]/2
    left.push({x: pts[i].x+nx*hw, y: pts[i].y+ny*hw})
    right.push({x: pts[i].x-nx*hw, y: pts[i].y-ny*hw})
  }
  const cr = (ps: SP[]) => {
    let d = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`
    for (let i = 0; i < ps.length-1; i++) {
      const p0=ps[Math.max(0,i-1)],p1=ps[i],p2=ps[i+1],p3=ps[Math.min(ps.length-1,i+2)]
      const cx1=p1.x+(p2.x-p0.x)/6,cy1=p1.y+(p2.y-p0.y)/6
      const cx2=p2.x-(p3.x-p1.x)/6,cy2=p2.y-(p3.y-p1.y)/6
      d+=` C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }
  const last=pts[pts.length-1]; const first=pts[0]
  let d = cr(left)
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  d += ' '+cr([...right].reverse()).replace(/^M/,'L')
  d += ` L ${first.x.toFixed(1)} ${first.y.toFixed(1)} Z`
  return d
}

// ── Arrow helpers (mirrors LienzoPage) ───────────────────────────────────────
function ptLineDist(p: SP, a: SP, b: SP): number {
  const dx = b.x-a.x; const dy = b.y-a.y; const len2 = dx*dx+dy*dy
  if (len2 === 0) return Math.hypot(p.x-a.x, p.y-a.y)
  const t = Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len2))
  return Math.hypot(p.x-(a.x+t*dx), p.y-(a.y+t*dy))
}
function rdpSimplify(pts: SP[], eps: number): SP[] {
  if (pts.length < 3) return pts
  let maxD = 0; let idx = 0
  for (let i = 1; i < pts.length-1; i++) {
    const d = ptLineDist(pts[i], pts[0], pts[pts.length-1])
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD < eps) return [pts[0], pts[pts.length-1]]
  return [...rdpSimplify(pts.slice(0,idx+1), eps), ...rdpSimplify(pts.slice(idx), eps).slice(1)]
}
function buildArrowSvg(pts: SP[], strokeW: number): { line: string; head: string } {
  const simplified = rdpSimplify(pts, 2.5)
  const crLine = (ps: SP[]) => {
    if (ps.length === 0) return ''
    let d = `M ${ps[0].x.toFixed(1)} ${ps[0].y.toFixed(1)}`
    for (let i = 0; i < ps.length-1; i++) {
      const p0=ps[Math.max(0,i-1)],p1=ps[i],p2=ps[i+1],p3=ps[Math.min(ps.length-1,i+2)]
      const cx1=p1.x+(p2.x-p0.x)/6,cy1=p1.y+(p2.y-p0.y)/6
      const cx2=p2.x-(p3.x-p1.x)/6,cy2=p2.y-(p3.y-p1.y)/6
      d+=` C ${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }
  const n = simplified.length
  const tip = simplified[n-1]
  const prev = simplified[Math.max(0,n-2)]
  const fwdX = tip.x-prev.x; const fwdY = tip.y-prev.y
  const fwdLen = Math.hypot(fwdX,fwdY)||1
  const ux = fwdX/fwdLen; const uy = fwdY/fwdLen
  const hw = strokeW*3.5; const hl = strokeW*7
  const base = { x: tip.x-ux*hl, y: tip.y-uy*hl }
  const w1 = { x: base.x-uy*hw, y: base.y+ux*hw }
  const w2 = { x: base.x+uy*hw, y: base.y-ux*hw }
  const head = `M ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${w1.x.toFixed(1)} ${w1.y.toFixed(1)} L ${w2.x.toFixed(1)} ${w2.y.toFixed(1)} Z`
  const lineEnd = { x: tip.x-ux*hl*0.5, y: tip.y-uy*hl*0.5 }
  const trimmed = [...simplified.slice(0,n-1), lineEnd]
  return { line: crLine(trimmed), head }
}

// ── Main Canvas ──────────────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = id || ''
  const sessionKey = `planner-portal-token-${eventId}`

  const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null)
  const [token, setToken] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  // Widgets state (mutable so client can add their own)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [lienzoStrokes, setLienzoStrokes] = useState<Array<{ id: string; points: Array<{x:number;y:number}>; color: string; width: number; isArrow?: boolean }>>([])

  // Add-widget modal state
  const [addWidgetOpen, setAddWidgetOpen] = useState(false)
  const [addWidgetType, setAddWidgetType] = useState<'imagen' | 'links'>('imagen')
  const [addWidgetUrl, setAddWidgetUrl] = useState('')

  async function fetchSnapshot(accessToken: string) {
    setLoading(true); setFetchError(null)
    try {
      const res = await plannerPortalApi.getSnapshot(eventId, accessToken)
      setSnapshot(res.data ?? res)
      setToken(accessToken)
      setAuthed(true)
    } catch (err: any) {
      const status = err?.response?.status
      sessionStorage.removeItem(sessionKey)
      if (status === 404) setFetchError('El organizador aún no ha publicado el lienzo. Pídele que haga clic en "Publicar portal" en su Planner.')
      else if (status === 403) setFetchError('No tienes acceso a este evento. Verifica con tu event designer.')
      else setFetchError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.')
      setAuthed(false)
    } finally { setLoading(false) }
  }

  // On mount: check for stored token and also handle Stripe redirect params
  useEffect(() => {
    if (!eventId) return
    const storedToken = sessionStorage.getItem(sessionKey)
    if (!storedToken) return

    const params = new URLSearchParams(window.location.search)
    const paymentSuccess = params.get('payment_success')
    const sessionId = params.get('session_id')
    const paymentId = params.get('payment_id')

    if (paymentSuccess === '1' && sessionId && paymentId) {
      // Clear URL params first
      window.history.replaceState({}, '', window.location.pathname)
      // Load snapshot then verify payment
      setLoading(true)
      plannerPortalApi.getSnapshot(eventId, storedToken)
        .then(async (res) => {
          const snap = res.data ?? res
          setSnapshot(snap)
          setToken(storedToken)
          setAuthed(true)
          // Verify payment with backend
          try {
            const vRes = await plannerPortalApi.verifyPayment(eventId, sessionId, paymentId, storedToken)
            const updated = vRes.data?.contrato
            if (updated) setSnapshot(prev => prev ? { ...prev, contrato: updated } : prev)
            antdMessage.success('¡Pago confirmado exitosamente!')
          } catch {
            antdMessage.warning('Pago procesado. Si no ves el cambio, recarga la página.')
          }
        })
        .catch(() => { sessionStorage.removeItem(sessionKey); setAuthed(false) })
        .finally(() => setLoading(false))
    } else {
      fetchSnapshot(storedToken)
    }
  }, [eventId])

  async function handleLogin(email: string, password: string) {
    const res = await plannerPortalApi.login(email, password)
    const accessToken: string = res.data?.accessToken ?? res.accessToken
    sessionStorage.setItem(sessionKey, accessToken)
    await fetchSnapshot(accessToken)
  }

  function handleSnapshotChange(patch: Partial<PortalSnapshot>) {
    setSnapshot(prev => prev ? { ...prev, ...patch } : prev)
  }

  // Initialize widgets + strokes from snapshot
  useEffect(() => {
    if (!snapshot) return
    const rawLienzo = snapshot.lienzo
    let ws: Widget[] = []
    if (Array.isArray(rawLienzo)) {
      ws = rawLienzo
    } else if (rawLienzo?.widgets && Array.isArray(rawLienzo.widgets)) {
      ws = rawLienzo.widgets
    }
    if (ws.length === 0) {
      const auto: Widget[] = []
      let y = 20
      auto.push({ id: 'auto-portada', type: 'portada', x: 24, y, w: 500, h: 200, config: {} })
      y += 224
      if (snapshot.timeline) auto.push({ id: 'auto-timeline', type: 'timeline', x: 24, y, w: 380, h: 400, config: {} })
      if (snapshot.tareas) auto.push({ id: 'auto-tareas', type: 'tareas', x: 424, y, w: 340, h: 300, config: {} })
      if (snapshot.presupuesto) auto.push({ id: 'auto-presupuesto', type: 'presupuesto', x: 424, y: y + 320, w: 340, h: 300, config: {} })
      if (snapshot.contrato) auto.push({ id: 'auto-contrato', type: 'contrato', x: 24, y: y + 420, w: 380, h: 380, config: {} })
      ws = auto
    }
    setWidgets(ws)
    const strokes: Array<{ id: string; points: Array<{x:number;y:number}>; color: string; width: number }> =
      Array.isArray(rawLienzo) ? [] : (rawLienzo?.strokes ?? [])
    setLienzoStrokes(strokes)
  }, [snapshot])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy })
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(3, Math.max(0.25, z + delta)))
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (authed && fetchError) return <ErrorScreen message={fetchError} onRetry={() => { setFetchError(null); setAuthed(false) }} />
  if (!authed && fetchError) return <ErrorScreen message={fetchError} onRetry={() => setFetchError(null)} />
  if (!snapshot) return <LoginScreen onLogin={handleLogin} />

  const branding: EventBranding = { ...DEFAULT_BRANDING, ...(snapshot.branding || {}) }
  const eventName = snapshot.eventSnapshot?.name || 'Lienzo del Evento'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1E1040', overflow: 'hidden' }}>
      {/* Top nav */}
      {(() => {
        const hdrBg = `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`
        const hdrText = branding.textOnBg || '#ffffff'
        const hdrMuted = hdrText === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
        const btnBg = hdrText === '#ffffff' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
        return (
          <div style={{
            background: hdrBg,
            padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 52,
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)', flexShrink: 0, zIndex: 100,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: hdrText === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 900, color: hdrText,
              border: `1px solid ${hdrText === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
            }}>I</div>
            <span style={{ color: hdrText, fontSize: 13, fontWeight: 700 }}>IventIA · Lienzo del Cliente</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: hdrMuted, fontSize: 12 }}>{eventName}</span>

            {/* Zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
              <Button size="small" icon={<MinusOutlined />} onClick={() => setZoom(z => Math.max(0.25, z - 0.15))}
                style={{ background: btnBg, border: 'none', color: hdrText, width: 28, height: 28, borderRadius: 8 }} />
              <span style={{ color: hdrText, fontSize: 11, fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setZoom(z => Math.min(3, z + 0.15))}
                style={{ background: btnBg, border: 'none', color: hdrText, width: 28, height: 28, borderRadius: 8 }} />
            </div>
          </div>
        )
      })()}

      {/* Canvas area */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          cursor: isPanning ? 'grabbing' : 'grab',
          background: 'radial-gradient(circle at 50% 50%, #2D1B69 0%, #1E1040 100%)',
        }}
      >
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #C4B5FD 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
        }} />

        {/* Transform layer */}
        <div style={{
          position: 'absolute',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}>
          {widgets.map(w => (
            <div
              key={w.id}
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: w.x, top: w.y, width: w.w, height: w.h,
                borderRadius: 12, overflow: 'hidden',
                background: '#ffffff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              <WidgetRendererRO
                widget={w}
                snapshot={snapshot}
                branding={branding}
                eventId={eventId}
                token={token}
                onSnapshotChange={handleSnapshotChange}
              />
            </div>
          ))}

          {/* SVG stroke overlay */}
          {lienzoStrokes.length > 0 && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
              <defs>
                <filter id="cp-ink-glow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {lienzoStrokes.map(s => {
                if (s.isArrow) {
                  const { line, head } = buildArrowSvg(s.points, s.width)
                  return (
                    <g key={s.id} opacity={0.92}>
                      <path d={line} fill="none" stroke={s.color} strokeWidth={s.width}
                        strokeLinecap="round" strokeLinejoin="round" filter="url(#cp-ink-glow)" />
                      <path d={head} fill={s.color} stroke="none" />
                    </g>
                  )
                }
                return (
                  <path key={s.id} d={buildMagicRibbon(s.points, s.width)}
                    fill={s.color} stroke="none"
                    filter="url(#cp-ink-glow)" opacity={0.92} />
                )
              })}
            </svg>
          )}
        </div>

        {/* Floating add-widget button */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 50,
          display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end',
        }}>
          <Button
            type="primary" shape="circle" size="large"
            icon={<PlusCircleOutlined />}
            onClick={() => setAddWidgetOpen(true)}
            style={{ background: branding.primaryColor, borderColor: branding.primaryColor,
              width: 48, height: 48, fontSize: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
          />
        </div>

        {/* Add-widget modal */}
        <Modal
          open={addWidgetOpen}
          title="Agregar al lienzo"
          onCancel={() => { setAddWidgetOpen(false); setAddWidgetUrl('') }}
          footer={null}
          width={380}
        >
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Button type={addWidgetType === 'imagen' ? 'primary' : 'default'}
                icon={<PictureOutlined />}
                onClick={() => setAddWidgetType('imagen')}
                style={addWidgetType === 'imagen' ? { background: branding.primaryColor, borderColor: branding.primaryColor } : {}}
              >Imagen</Button>
              <Button type={addWidgetType === 'links' ? 'primary' : 'default'}
                icon={<LinkOutlined />}
                onClick={() => setAddWidgetType('links')}
                style={addWidgetType === 'links' ? { background: branding.primaryColor, borderColor: branding.primaryColor } : {}}
              >Enlace</Button>
            </div>
            <Input
              placeholder={addWidgetType === 'imagen' ? 'https://url-de-imagen.jpg' : 'https://sitio-web.com'}
              value={addWidgetUrl}
              onChange={e => setAddWidgetUrl(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <Button type="primary" block
              disabled={!addWidgetUrl.trim()}
              onClick={() => {
                const url = addWidgetUrl.trim()
                const newWidget: Widget = {
                  id: `client-${Date.now()}`,
                  type: addWidgetType,
                  x: 200 + Math.random() * 100,
                  y: 200 + Math.random() * 100,
                  w: addWidgetType === 'imagen' ? 300 : 360,
                  h: addWidgetType === 'imagen' ? 220 : 240,
                  config: addWidgetType === 'imagen' ? { imageUrl: url } : { url },
                }
                setWidgets(prev => [...prev, newWidget])
                setAddWidgetOpen(false)
                setAddWidgetUrl('')
              }}
              style={{ background: branding.primaryColor, borderColor: branding.primaryColor }}
            >Agregar al lienzo</Button>
          </div>
        </Modal>
      </div>

      {/* Footer */}
      <div style={{
        background: '#1E1040', padding: '6px 20px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(196,181,253,0.4)' }}>
          Powered by IventIA Planner · {widgets.length} widgets
        </span>
      </div>
    </div>
  )
}
