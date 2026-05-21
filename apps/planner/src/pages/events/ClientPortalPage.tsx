/**
 * ClientPortalPage.tsx — "Lienzo del Cliente"
 * PUBLIC client portal — accessible at /portal-cliente/:id (no admin auth required)
 * Renders the same canvas/lienzo as the planner but in read-only mode.
 * Authentication: email + password via portal user JWT
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Input, Typography, Avatar, Spin, Tag, Tooltip, App } from 'antd'
import {
  LockOutlined, UserOutlined, CheckCircleOutlined,
  CalendarOutlined, DollarOutlined, BarChartOutlined,
  PictureOutlined, LinkOutlined, FileTextOutlined,
  PrinterOutlined, YoutubeOutlined, EyeOutlined,
  MinusOutlined, PlusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')
import { plannerPortalApi } from '../../api/portalClient'
import { DEFAULT_BRANDING, type EventBranding } from './EstudioPage'

const { Text } = Typography

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
  const bg = branding.coverStyle === 'gradient'
    ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
    : branding.coverStyle === 'split'
      ? `linear-gradient(90deg, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`
      : branding.coverStyle === 'dark' ? '#0D0D1A' : branding.primaryColor
  const textColor = branding.textOnBg || '#ffffff'
  const muted = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)'
  const daysUntil = event?.eventStart ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day')) : null

  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden',
      background: bg, padding: 20, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', color: textColor, userSelect: 'none', position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: branding.accentColor }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.06em', marginBottom: 6 }}>
          {event?.eventType || 'EVENTO'} · {event?.code || '—'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
          {event?.name || 'Mi evento'}
        </div>
        {branding.tagline && <div style={{ fontSize: 12, color: muted, fontStyle: 'italic', marginBottom: 4 }}>"{branding.tagline}"</div>}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: muted }}>
          {event?.venueLocation && <span>📍 {event.venueLocation}</span>}
          {event?.eventStart && <span>📅 {dayjs(event.eventStart).format('D MMM YYYY')}</span>}
        </div>
      </div>
      {daysUntil !== null && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>FALTAN</div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{daysUntil}</div>
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

function TareasWidgetRO({ tareas }: { tareas: any }) {
  const allTasks = tareas?.tasks ?? []
  const visible = allTasks.filter((t: any) => t.clientVisible !== false && t.status !== 'LISTA').slice(0, 6)

  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
        <Text strong style={{ fontSize: 13 }}>TAREAS DEL EVENTO</Text>
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
            </div>
          )
        })}
      </div>
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

function LinksWidgetRO({ config }: { config: any }) {
  const url: string = config.url || ''
  const [iframeError, setIframeError] = useState(false)

  if (!url) return (
    <div style={{ width: '100%', height: '100%', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3FF', borderRadius: 12 }}>
      <LinkOutlined style={{ fontSize: 32, color: '#DDD6FE' }} />
    </div>
  )

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

  let hostname = url
  try { hostname = new URL(url).hostname } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`

  // Try iframe preview — many sites block with X-Frame-Options, so we fall back to link card
  if (!iframeError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid #EDE9FE' }}>
        <iframe
          src={url}
          style={{ flex: 1, border: 'none', display: 'block' }}
          title="Link preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onError={() => setIframeError(true)}
          onLoad={(e) => {
            try {
              // If the iframe got blocked (blank/error), fall back to card
              const iframe = e.currentTarget as HTMLIFrameElement
              if (!iframe.contentDocument && !iframe.contentWindow?.location.href) setIframeError(true)
            } catch { setIframeError(true) }
          }}
        />
        <a href={url} target="_blank" rel="noreferrer"
          style={{ padding: '6px 12px', background: '#F5F3FF', borderTop: '1px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <img src={faviconUrl} alt="" style={{ width: 14, height: 14, borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{hostname}</span>
          <EyeOutlined style={{ color: '#7C3AED', fontSize: 11, flexShrink: 0 }} />
        </a>
      </div>
    )
  }

  // Fallback link card (when iframe is blocked)
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
const PHASE_COLORS_RO: Record<string, string> = { SETUP: '#F97316', EVENT: '#7C3AED', TEARDOWN: '#0D9488', GENERAL: '#6B7280' }
const STATUS_DOT_RO: Record<string, string> = { COMPLETED: '#059669', IN_PROGRESS: '#F97316', PENDING: '#9CA3AF' }

function TimelineWidgetRO({ timeline, event }: { timeline: any; event: any }) {
  const localData = { phases: timeline?.phases || [], activities: timeline?.activities || [] }
  const phases = [...localData.phases].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const activities = localData.activities
  const byPhase: Record<string, any[]> = {}
  for (const act of activities) { const pid = act.phaseId || '__none__'; byPhase[pid] = byPhase[pid] || []; byPhase[pid].push(act) }
  const previewPhases = phases.slice(0, 4)

  const theme = (() => {
    const themes: Record<string, { primary: string; secondary: string; light: string; bg: string; label: string }> = {
      'Boda': { primary: '#B5546A', secondary: '#C9728A', light: '#F7D6E0', bg: '#FEF8F9', label: 'Wedding Day' },
      'Corporativo': { primary: '#3730A3', secondary: '#4F46E5', light: '#C7D2FE', bg: '#F0F4FF', label: 'Agenda' },
    }
    return themes[event?.eventType || ''] ?? { primary: '#7C3AED', secondary: '#9333EA', light: '#DDD6FE', bg: '#F5F3FF', label: 'Timeline' }
  })()

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <div style={{
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        padding: '12px 16px', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 3 }}>
          {event?.eventType || 'Evento'} · {event?.code || ''}
        </div>
        <div style={{ color: '#fff', fontSize: 15, fontStyle: 'italic', fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1.15 }}>
          {event?.name || '—'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 4 }}>
          {theme.label}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: theme.bg }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '24px 0' }}>Sin actividades</div>
        ) : previewPhases.map((phase: any) => {
          const phaseActs = (byPhase[phase.id] || []).slice(0, 5)
          if (!phaseActs.length) return null
          const phaseColor = phase.color || theme.primary
          return (
            <div key={phase.id}>
              <div style={{ padding: '6px 14px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: phaseColor, borderTop: `1px solid ${phaseColor}22` }}>
                {phase.name}
              </div>
              {phaseActs.map((act: any, i: number) => (
                <div key={act.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderBottom: `1px solid ${theme.light}` }}>
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
      <div style={{ padding: '7px 14px', background: theme.light, flexShrink: 0, fontSize: 10, color: theme.primary, opacity: 0.8 }}>
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

// ── Read-only widget dispatcher ───────────────────────────────────────────────
function WidgetRendererRO({ widget, snapshot, branding }: {
  widget: Widget; snapshot: PortalSnapshot; branding: EventBranding
}) {
  const event = snapshot.eventSnapshot
  switch (widget.type) {
    case 'portada':     return <PortadaWidgetRO event={event} branding={branding} />
    case 'tareas':      return <TareasWidgetRO tareas={snapshot.tareas} />
    case 'proveedores': return <ProveedoresWidgetRO suppliers={
      Array.isArray(snapshot.lienzo?.suppliers) ? snapshot.lienzo.suppliers : []
    } />
    case 'nota':        return <NotaWidgetRO config={widget.config} />
    case 'texto':       return <TextoWidgetRO config={widget.config} />
    case 'imagen':      return <ImagenWidgetRO config={widget.config} />
    case 'pdf':         return <PdfWidgetRO config={widget.config} />
    case 'links':       return <LinksWidgetRO config={widget.config} />
    case 'resumen':     return <ResumenWidgetRO event={event} tareas={snapshot.tareas} timeline={snapshot.timeline} presupuesto={snapshot.presupuesto} />
    case 'timeline':    return <TimelineWidgetRO timeline={snapshot.timeline} event={event} />
    case 'presupuesto': return <PresupuestoWidgetRO presupuesto={snapshot.presupuesto} event={event} />
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

// ── Main Canvas ──────────────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = id || ''
  const sessionKey = `planner-portal-token-${eventId}`

  const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)

  // Canvas state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  async function fetchSnapshot(token: string) {
    setLoading(true); setFetchError(null)
    try {
      const res = await plannerPortalApi.getSnapshot(eventId, token)
      setSnapshot(res.data ?? res)
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

  useEffect(() => {
    if (!eventId) return
    const storedToken = sessionStorage.getItem(sessionKey)
    if (storedToken) fetchSnapshot(storedToken)
  }, [eventId])

  async function handleLogin(email: string, password: string) {
    const res = await plannerPortalApi.login(email, password)
    const accessToken: string = res.data?.accessToken ?? res.accessToken
    sessionStorage.setItem(sessionKey, accessToken)
    await fetchSnapshot(accessToken)
  }

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) { // allow left click drag on background
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

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Errors
  if (authed && fetchError) return <ErrorScreen message={fetchError} onRetry={() => { setFetchError(null); setAuthed(false) }} />
  if (!authed && fetchError) return <ErrorScreen message={fetchError} onRetry={() => setFetchError(null)} />

  // Not logged in
  if (!snapshot) return <LoginScreen onLogin={handleLogin} />

  const branding: EventBranding = { ...DEFAULT_BRANDING, ...(snapshot.branding || {}) }
  const eventName = snapshot.eventSnapshot?.name || 'Lienzo del Evento'

  // Parse widgets from snapshot
  const rawLienzo = snapshot.lienzo
  let widgets: Widget[] = []
  if (Array.isArray(rawLienzo)) {
    widgets = rawLienzo
  } else if (rawLienzo?.widgets && Array.isArray(rawLienzo.widgets)) {
    widgets = rawLienzo.widgets
  }

  // If no widgets in lienzo, create a default layout from available data
  if (widgets.length === 0) {
    const auto: Widget[] = []
    let y = 20
    auto.push({ id: 'auto-portada', type: 'portada', x: 24, y, w: 500, h: 200, config: {} })
    y += 224
    if (snapshot.timeline) {
      auto.push({ id: 'auto-timeline', type: 'timeline', x: 24, y, w: 380, h: 400, config: {} })
    }
    if (snapshot.tareas) {
      auto.push({ id: 'auto-tareas', type: 'tareas', x: 424, y, w: 340, h: 300, config: {} })
    }
    if (snapshot.presupuesto) {
      auto.push({ id: 'auto-presupuesto', type: 'presupuesto', x: 424, y: y + 320, w: 340, h: 300, config: {} })
    }
    widgets = auto
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1E1040', overflow: 'hidden' }}>
      {/* Top nav */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1040, #2D1B69)',
        padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 52,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)', flexShrink: 0, zIndex: 100,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 900, color: '#fff',
        }}>I</div>
        <span style={{ color: '#C4B5FD', fontSize: 13, fontWeight: 700 }}>IventIA · Lienzo del Cliente</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{eventName}</span>

        {/* Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
          <Button size="small" icon={<MinusOutlined />} onClick={() => setZoom(z => Math.max(0.25, z - 0.15))}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#C4B5FD', width: 28, height: 28, borderRadius: 8 }} />
          <span style={{ color: '#C4B5FD', fontSize: 11, fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setZoom(z => Math.min(3, z + 0.15))}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#C4B5FD', width: 28, height: 28, borderRadius: 8 }} />
        </div>
      </div>

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
          background: `
            radial-gradient(circle at 50% 50%, #2D1B69 0%, #1E1040 100%)
          `,
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
              onMouseDown={e => e.stopPropagation()} // prevent pan when clicking widgets
              style={{
                position: 'absolute',
                left: w.x, top: w.y, width: w.w, height: w.h,
                borderRadius: 12, overflow: 'hidden',
                background: '#ffffff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            >
              <WidgetRendererRO widget={w} snapshot={snapshot} branding={branding} />
            </div>
          ))}
        </div>
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
