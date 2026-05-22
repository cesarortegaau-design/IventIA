/**
 * PortalPage.tsx
 * Lienzo del cliente — config panel + live canvas preview
 * Shows the same lienzo canvas the client will see (read-only widgets)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Button, Switch, Typography, App, Tooltip, Avatar, Tag,
  Modal, Form, Input, Space, Badge, Spin,
} from 'antd'
import {
  GlobalOutlined, EyeOutlined, UserOutlined,
  CopyOutlined, KeyOutlined, CheckCircleOutlined, LockOutlined,
  CloudUploadOutlined, MinusOutlined, PlusOutlined,
  AppstoreOutlined, ExportOutlined, AuditOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, FilePdfOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
dayjs.extend(relativeTime)
dayjs.locale('es')
import { eventsApi } from '../../api/events'
import { DEFAULT_BRANDING, type EventBranding } from './EstudioPage'
import { usePlannerStore } from '../../hooks/usePlannerStore'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
interface Widget {
  id: string; type: string; x: number; y: number; w: number; h: number
  config: Record<string, any>
}

// ── Inline read-only widget renderers (same as ClientPortalPage) ──────────────
function PortadaRO({ event, branding }: { event: any; branding: EventBranding }) {
  const bg = branding.coverStyle === 'gradient'
    ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
    : branding.coverStyle === 'split'
      ? `linear-gradient(90deg, ${branding.primaryColor} 50%, ${branding.secondaryColor} 50%)`
      : branding.coverStyle === 'dark' ? '#0D0D1A' : branding.primaryColor
  const textColor = branding.textOnBg || '#ffffff'
  const muted = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)'
  const daysUntil = event?.eventStart ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day')) : null
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: bg, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: textColor, userSelect: 'none', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: branding.accentColor }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.06em', marginBottom: 6 }}>{event?.eventType || 'EVENTO'} · {event?.code || '—'}</div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>{event?.name || 'Mi evento'}</div>
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
            <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{daysUntil}</div>
            <div style={{ fontSize: 12, color: muted }}>días</div>
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_DOT: Record<string, string> = { COMPLETED: '#059669', IN_PROGRESS: '#F97316', PENDING: '#9CA3AF' }

function TareasRO({ tareas }: { tareas: any }) {
  const tasks = (tareas?.tasks ?? []).filter((t: any) => t.status !== 'LISTA').slice(0, 6)
  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316' }} />
        <Text strong style={{ fontSize: 13 }}>TAREAS</Text>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.length === 0 ? <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>Sin tareas</div>
        : tasks.map((t: any) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{t.title}</div>
            </div>
            {t.dueDate && <Tag style={{ background: '#F0F9FF', color: '#2563EB', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{dayjs(t.dueDate).diff(dayjs(), 'day')}d</Tag>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProveedoresRO({ suppliers }: { suppliers: any[] }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: '14px 16px', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <Text strong style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>PROVEEDORES</Text>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suppliers.length === 0 ? <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '20px 0' }}>Sin proveedores</div>
        : suppliers.map((s: any) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#FAFAFA', border: '1px solid #F0EBFF' }}>
            <Avatar size={28} style={{ background: '#7C3AED', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(s.name || '?').slice(0, 2).toUpperCase()}</Avatar>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineRO({ timeline, event }: { timeline: any; event: any }) {
  const phases = [...(timeline?.phases || [])].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const activities = timeline?.activities || []
  const byPhase: Record<string, any[]> = {}
  for (const act of activities) { const pid = act.phaseId || '__none__'; byPhase[pid] = byPhase[pid] || []; byPhase[pid].push(act) }
  const theme = { primary: '#7C3AED', secondary: '#9333EA', light: '#DDD6FE', bg: '#F5F3FF' }
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, padding: '10px 14px', flexShrink: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 2 }}>{event?.eventType || 'Evento'}</div>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>{event?.name || '—'}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: theme.bg }}>
        {activities.length === 0 ? <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '24px 0' }}>Sin actividades</div>
        : phases.slice(0, 4).map((phase: any) => {
          const acts = (byPhase[phase.id] || []).slice(0, 5)
          if (!acts.length) return null
          return (
            <div key={phase.id}>
              <div style={{ padding: '5px 12px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: phase.color || theme.primary }}>{phase.name}</div>
              {acts.map((act: any, i: number) => (
                <div key={act.id || i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderBottom: `1px solid ${theme.light}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_DOT[act.status] || '#9CA3AF', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: phase.color || theme.primary, minWidth: 40, flexShrink: 0 }}>{act.startTime || ''}</span>
                  <span style={{ fontSize: 11, color: '#2d2d2d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{act.name}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div style={{ padding: '5px 12px', background: theme.light, flexShrink: 0, fontSize: 10, color: theme.primary }}>{activities.length} actividades · {phases.length} fases</div>
    </div>
  )
}

function PresupuestoRO({ presupuesto }: { presupuesto: any }) {
  const chapters = presupuesto?.chapters || []
  const items = (presupuesto?.items || []).filter((i: any) => i.status !== 'CANCELLED')
  const total = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitPrice || 0), 0)
  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F0EBFF', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text strong style={{ fontSize: 13 }}>Presupuesto</Text>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: '#7C3AED' }}>{fmt(total)}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
        {chapters.map((ch: any) => {
          const chTotal = items.filter((i: any) => i.chapterId === ch.id).reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitPrice || 0), 0)
          return (
            <div key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${ch.color || '#7C3AED'}20` }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: ch.color || '#7C3AED' }}>{ch.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{fmt(chTotal)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NotaRO({ config }: { config: any }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: 16, borderRadius: 12, background: config.color || '#FFF9C4', userSelect: 'none' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>📝 Nota</div>
      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>{config.text || ''}</div>
    </div>
  )
}

function TextoRO({ config }: { config: any }) {
  return (
    <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', alignItems: 'center' }}>
      <div style={{ fontSize: config.fontSize || 16, fontWeight: config.bold ? 700 : 400, color: config.color || '#1a1a1a' }}>{config.text || ''}</div>
    </div>
  )
}

function ImagenRO({ config }: { config: any }) {
  const url = config.imageUrl || config.src
  if (!url) return <div style={{ width: '100%', height: '100%', background: '#F5F3FF', borderRadius: 12 }} />
  return <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}><img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
}

function LinksRO({ config }: { config: any }) {
  const url = config.url || ''
  if (!url) return <div style={{ width: '100%', height: '100%', background: '#F5F3FF', borderRadius: 12 }} />
  const ytMatch = url.match(/youtube\.com\/watch\?v=([^&\s]+)|youtu\.be\/([^?\s]+)/)
  const ytId = ytMatch ? (ytMatch[1] || ytMatch[2]) : null
  if (ytId) return (
    <div style={{ width: '100%', height: '100%', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen title="YouTube" />
    </div>
  )
  return (
    <div style={{ width: '100%', height: '100%', padding: 16, background: '#F5F3FF', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 16 }}>🔗</div>
      <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
    </div>
  )
}

function PdfRO({ config }: { config: any }) {
  if (!config.pdfUrl) return <div style={{ width: '100%', height: '100%', background: '#FEF2F2', borderRadius: 12 }} />
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      <iframe src={config.pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF" />
    </div>
  )
}

function ResumenRO({ tareas, timeline, presupuesto }: { tareas: any; timeline: any; presupuesto: any }) {
  const tasks = tareas?.tasks || []; const activities = timeline?.activities || []
  const items = (presupuesto?.items || []).filter((i: any) => i.status !== 'CANCELLED')
  const total = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unitPrice || 0), 0)
  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return (
    <div style={{ width: '100%', height: '100%', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start', userSelect: 'none' }}>
      {[
        { label: 'Actividades', value: activities.length, color: '#7C3AED' },
        { label: 'Tareas', value: tasks.length, color: '#F97316' },
        { label: 'Conceptos', value: items.length, color: '#0D9488' },
        { label: 'Presupuesto', value: fmt(total), color: '#EC4899' },
      ].map(k => (
        <div key={k.label} style={{ background: '#FAFAFA', border: '1px solid #F0EBFF', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.value}</div>
        </div>
      ))}
    </div>
  )
}

function ContratoRO({ contrato }: { contrato: any }) {
  const CONTRATO_STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    BORRADOR:   { label: 'Borrador',   color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
    COTIZACION: { label: 'Cotización', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    CONTRATO:   { label: 'Contrato',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    FIRMADO:    { label: 'Firmado',    color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
    CANCELADO:  { label: 'Cancelado',  color: '#DC2626', bg: '#FEF2F2', border: '#FECDD3' },
  }
  const fmtC = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const statusCfg = CONTRATO_STATUS_CFG[contrato?.status] || CONTRATO_STATUS_CFG['BORRADOR']
  const hasContract = !!contrato?.contractNumber
  const clientName = contrato?.client?.personType === 'MORAL'
    ? contrato?.client?.companyName
    : `${contrato?.client?.firstName || ''} ${contrato?.client?.lastName || ''}`.trim()
  const payments = (contrato?.payments || []).map((p: any) => {
    if (p.status === 'PENDIENTE' && new Date(p.dueDate) < new Date()) return { ...p, status: 'VENCIDO' }
    return p
  })
  const paidTotal = (contrato?.payments || [])
    .filter((p: any) => p.status === 'PAGADO')
    .reduce((s: number, p: any) => s + (p.paidAmount || p.amount), 0)

  if (!hasContract) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#F5F3FF', userSelect: 'none' }}>
        <AuditOutlined style={{ fontSize: 28, color: '#A78BFA' }} />
        <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>Sin contrato disponible</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', padding: '10px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 2 }}>CONTRATO</div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{contrato.contractNumber}</div>
        </div>
        <div style={{ background: statusCfg.bg, color: statusCfg.color, borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
          {statusCfg.label}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
        {/* Client + total */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#F9FAFB', border: '1px solid #EDE9FE', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 3 }}>CLIENTE</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName || '—'}</div>
          </div>
          <div style={{ background: '#F9FAFB', border: '1px solid #EDE9FE', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 3 }}>TOTAL</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#7C3AED' }}>{fmtC(contrato.totalAmount || 0)}</div>
            {paidTotal > 0 && <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Pagado: {fmtC(paidTotal)}</div>}
          </div>
        </div>

        {/* Payments */}
        {payments.length > 0 ? (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', marginBottom: 6 }}>CALENDARIO DE PAGOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {payments.map((p: any) => {
                const isPaid = p.status === 'PAGADO'
                const isOverdue = p.status === 'VENCIDO'
                const color = isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706'
                const bg = isPaid ? '#F0FDF4' : isOverdue ? '#FEF2F2' : '#FFFBEB'
                const border = isPaid ? '#BBF7D0' : isOverdue ? '#FECDD3' : '#FDE68A'
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
                    <div style={{ color, fontSize: 13, flexShrink: 0 }}>
                      {isPaid ? <CheckCircleOutlined /> : isOverdue ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1F2937' }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>
                        {new Date(p.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {p.percentage}%
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{fmtC(p.amount)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 11, padding: '14px 0' }}>Sin calendario de pagos</div>
        )}
      </div>
    </div>
  )
}

// ── Widget dispatcher ─────────────────────────────────────────────────────────
function PreviewWidget({ widget, event, branding, tareas, timeline, presupuesto, suppliers, contrato }: {
  widget: Widget; event: any; branding: EventBranding
  tareas: any; timeline: any; presupuesto: any; suppliers: any[]; contrato: any
}) {
  switch (widget.type) {
    case 'portada':     return <PortadaRO event={event} branding={branding} />
    case 'tareas':      return <TareasRO tareas={tareas} />
    case 'proveedores': return <ProveedoresRO suppliers={suppliers} />
    case 'nota':        return <NotaRO config={widget.config} />
    case 'texto':       return <TextoRO config={widget.config} />
    case 'imagen':      return <ImagenRO config={widget.config} />
    case 'pdf':         return <PdfRO config={widget.config} />
    case 'links':       return <LinksRO config={widget.config} />
    case 'resumen':     return <ResumenRO tareas={tareas} timeline={timeline} presupuesto={presupuesto} />
    case 'timeline':    return <TimelineRO timeline={timeline} event={event} />
    case 'presupuesto': return <PresupuestoRO presupuesto={presupuesto} />
    case 'contrato':    return <ContratoRO contrato={contrato} />
    default:            return null
  }
}

// ── Access Modal ──────────────────────────────────────────────────────────────
function AccessModal({ open, onClose, event }: { open: boolean; onClose: () => void; event: any }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<{ email: string; password: string; url: string } | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  function generatePassword() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  async function handleGenerate() {
    try {
      const values = await form.validateFields()
      if (!event?.id) return
      setLoading(true); setApiError(null)
      const password = generatePassword()
      await eventsApi.createPortalDirectAccess(event.id, { email: values.email, password, firstName: values.firstName, lastName: values.lastName })
      setGenerated({ email: values.email, password, url: `${window.location.origin}/portal-cliente/${event.id}` })
    } catch (err: any) {
      if (err?.errorFields) return
      setApiError(err?.response?.data?.error?.message || 'Error al crear el acceso.')
    } finally { setLoading(false) }
  }

  async function handleCopy(text: string) { await navigator.clipboard.writeText(text); message.success('Copiado') }
  function handleClose() { setGenerated(null); setApiError(null); form.resetFields(); onClose() }

  return (
    <Modal open={open} title={<><KeyOutlined style={{ color: '#7C3AED', marginRight: 8 }} />Acceso al lienzo del cliente</>} onCancel={handleClose} footer={null} width={480}>
      {!generated ? (
        <>
          <Text style={{ color: '#666', fontSize: 13, display: 'block', marginBottom: 16 }}>
            Crea credenciales para que tu cliente vea el lienzo desde cualquier dispositivo.
          </Text>
          <Form form={form} layout="vertical" initialValues={{ email: event?.client?.email || '' }}>
            <Form.Item name="email" label="Correo del cliente" rules={[{ required: true, type: 'email', message: 'Correo válido requerido' }]}>
              <Input prefix={<UserOutlined />} placeholder="cliente@ejemplo.com" />
            </Form.Item>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}><Input /></Form.Item>
          </Form>
          {apiError && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{apiError}</div>}
          <Button type="primary" block onClick={handleGenerate} loading={loading} style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>Generar acceso</Button>
        </>
      ) : (
        <>
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ color: '#16A34A', fontWeight: 700, fontSize: 13, marginBottom: 10 }}><CheckCircleOutlined style={{ marginRight: 6 }} />Acceso creado</div>
            {[
              { label: 'URL del lienzo', value: generated.url },
              { label: 'Correo', value: generated.email },
              { label: 'Contraseña', value: generated.password },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>{r.label}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text strong style={{ fontSize: 12, wordBreak: 'break-all', fontFamily: r.label === 'Contraseña' ? 'monospace' : 'inherit' }}>{r.value}</Text>
                  <Tooltip title="Copiar"><Button size="small" type="text" icon={<CopyOutlined />} onClick={() => handleCopy(r.value)} /></Tooltip>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 12, color: '#92400E' }}>
            <LockOutlined style={{ marginRight: 4 }} />Guarda esta contraseña — no podrás verla de nuevo.
          </div>
          <Space style={{ width: '100%' }} direction="vertical">
            <Button block onClick={() => handleCopy(`Acceso al Lienzo IventIA\nEvento: ${event?.name}\nURL: ${generated.url}\nCorreo: ${generated.email}\nContraseña: ${generated.password}`)}>
              <CopyOutlined /> Copiar todo para compartir
            </Button>
            <Button type="primary" block onClick={handleClose} style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>Listo</Button>
          </Space>
        </>
      )}
    </Modal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PortalPage() {
  const { id } = useParams<{ id: string }>()
  const { event: ctxEvent } = useOutletContext<{ event: any }>() || {}
  const { message } = App.useApp()

  const { data } = useQuery({
    queryKey: ['planner-event-header', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id && !ctxEvent,
  })
  const event = ctxEvent || data?.data

  const [accessOpen, setAccessOpen] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [accessEnabled, setAccessEnabled] = useState(false)

  // Read planner stores for preview
  const { store: branding } = usePlannerStore<EventBranding>(id!, 'branding', { ...DEFAULT_BRANDING }, `iventia-branding-${id}`)
  const { store: tareas } = usePlannerStore<{ tasks: any[] }>(id!, 'tareas', { tasks: [] }, `iventia-tareas-${id}`)
  const { store: timeline } = usePlannerStore<{ phases: any[]; activities: any[] }>(id!, 'timeline', { phases: [], activities: [] }, `iventia-timeline-${id}`)
  const { store: presupuesto } = usePlannerStore<{ chapters: any[]; items: any[] }>(id!, 'presupuesto', { chapters: [], items: [] }, `iventia-presupuesto-${id}`)
  const { store: suppStore } = usePlannerStore<{ suppliers: any[] }>(id!, 'suppliers', { suppliers: [] }, `iventia-event-suppliers-${id}`)
  const suppliers = Array.isArray(suppStore) ? suppStore : (suppStore.suppliers ?? [])
  const { store: contrato } = usePlannerStore<any>(id!, 'contrato', { contractNumber: '', status: 'BORRADOR', client: {}, items: [], payments: [], totalAmount: 0 }, `iventia-contrato-${id}`)

  // Read lienzo widgets
  const { data: lienzoData, isLoading: lienzoLoading } = useQuery({
    queryKey: ['planner-lienzo', id],
    queryFn: () => eventsApi.getLienzo(id!),
    enabled: !!id,
  })
  const rawLienzo = lienzoData?.data ?? lienzoData
  let widgets: Widget[] = []
  if (Array.isArray(rawLienzo)) widgets = rawLienzo
  else if (rawLienzo?.widgets && Array.isArray(rawLienzo.widgets)) widgets = rawLienzo.widgets

  // Canvas state
  const [zoom, setZoom] = useState(0.55)
  const [pan, setPan] = useState({ x: 20, y: 10 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) })
  }, [isPanning])
  const handleMouseUp = useCallback(() => setIsPanning(false), [])
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.min(2, Math.max(0.2, z + (e.deltaY > 0 ? -0.08 : 0.08))))
  }, [])

  async function handlePublish() {
    if (!id) return
    setPublishLoading(true)
    try {
      const allStores = await eventsApi.getAllPlannerStores(id)
      const stores = allStores.data || allStores || {}
      let lienzo: any = null
      try {
        const lienzoRes = await eventsApi.getLienzo(id)
        lienzo = lienzoRes.data || lienzoRes || null
        if (stores.suppliers && lienzo) lienzo.suppliers = Array.isArray(stores.suppliers) ? stores.suppliers : (stores.suppliers.suppliers || [])
      } catch {}
      const eventSnapshot = event ? {
        name: event.name, eventStart: event.eventStart, eventType: event.eventType,
        code: event.code, venueLocation: event.venueLocation,
        expectedAttendance: event.expectedAttendance, description: event.description, client: event.client,
      } : null
      await eventsApi.publishPlannerPortal(id, {
        branding: stores.branding, portalConfig: { accessEnabled, visibleWidgets: [] },
        timeline: stores.timeline, tareas: stores.tareas, presupuesto: stores.presupuesto,
        lienzo, eventSnapshot,
      })
      message.success('Lienzo publicado — el cliente puede acceder')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Error al publicar')
    } finally { setPublishLoading(false) }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{
        width: 280, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #F0F0F0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #F5F5F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AppstoreOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Lienzo del cliente</div>
              <div style={{ fontSize: 11, color: '#888' }}>Vista previa y publicación</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Client info */}
          {event?.client && (
            <div style={{ background: 'linear-gradient(135deg,#F5F3FF,#FDF4FF)', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #EDE9FE' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', letterSpacing: '0.06em', marginBottom: 6 }}>CLIENTE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={28} style={{ background: '#7C3AED', fontSize: 11, fontWeight: 700 }}>
                  {(event.client.companyName || event.client.firstName || '?')[0]}
                </Avatar>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{event.client.companyName || `${event.client.firstName} ${event.client.lastName}`}</div>
                  {event.client.email && <div style={{ fontSize: 11, color: '#888' }}>{event.client.email}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Access toggle */}
          <div style={{
            background: accessEnabled ? '#ECFDF5' : '#F9FAFB',
            border: `1px solid ${accessEnabled ? '#6EE7B7' : '#E5E7EB'}`,
            borderRadius: 10, padding: 12, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Acceso al lienzo</div>
              <Switch size="small" checked={accessEnabled} onChange={setAccessEnabled}
                style={{ background: accessEnabled ? '#059669' : undefined }} />
            </div>
            {accessEnabled
              ? <div style={{ fontSize: 12, color: '#059669', marginBottom: 8 }}><CheckCircleOutlined style={{ marginRight: 4 }} />Lienzo habilitado</div>
              : <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>El cliente no puede acceder aún</div>}
            <Button size="small" block icon={<KeyOutlined />} onClick={() => setAccessOpen(true)} style={{ fontSize: 12 }}>Gestionar acceso</Button>
          </div>

          {/* Info */}
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: '#0369A1', lineHeight: 1.6 }}>
            <EyeOutlined style={{ marginRight: 4 }} />
            El cliente verá el mismo lienzo que ves aquí: todos los widgets posicionados en el canvas.
            Edita el lienzo desde <b>Lienzo del evento</b>.
          </div>

          {/* Stats */}
          <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 12, border: '1px solid #F0F0F0' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888', letterSpacing: '0.06em', marginBottom: 8 }}>CONTENIDO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { label: 'Widgets', value: widgets.length, color: '#7C3AED' },
                { label: 'Tareas', value: tareas.tasks?.length || 0, color: '#F97316' },
                { label: 'Actividades', value: timeline.activities?.length || 0, color: '#0D9488' },
                { label: 'Proveedores', value: suppliers.length, color: '#EC4899' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '6px 0' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F5F5F5' }}>
          <Button type="primary" block icon={<CloudUploadOutlined />} loading={publishLoading}
            onClick={handlePublish} style={{ background: '#059669', borderColor: '#059669', marginBottom: 8 }}>
            Publicar lienzo
          </Button>
          <Button block icon={<ExportOutlined />} onClick={() => window.open(`/portal-cliente/${id}`, '_blank')}>
            Abrir como cliente ↗
          </Button>
        </div>
      </div>

      {/* Canvas preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Preview header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E1040, #2D1B69)',
          padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <Badge dot color={accessEnabled ? '#10B981' : '#6B7280'}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>I</div>
          </Badge>
          <span style={{ color: '#C4B5FD', fontSize: 12, fontWeight: 700 }}>Vista previa — Lienzo del cliente</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button size="small" icon={<MinusOutlined />} onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#C4B5FD', width: 24, height: 24, borderRadius: 6, padding: 0 }} />
            <span style={{ color: '#C4B5FD', fontSize: 11, fontWeight: 600, minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#C4B5FD', width: 24, height: 24, borderRadius: 6, padding: 0 }} />
          </div>
        </div>

        {/* Canvas */}
        {lienzoLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E1040' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div
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
            <div style={{ position: 'absolute', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
              {widgets.length === 0 ? (
                <div style={{ position: 'absolute', left: 100, top: 100, color: 'rgba(196,181,253,0.4)', textAlign: 'center' }}>
                  <AppstoreOutlined style={{ fontSize: 48, display: 'block', marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Sin widgets en el lienzo</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Agrega widgets en el Lienzo del evento</div>
                </div>
              ) : widgets.map(w => (
                <div key={w.id} onMouseDown={e => e.stopPropagation()} style={{
                  position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h,
                  borderRadius: 12, overflow: 'hidden', background: '#fff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.08)',
                }}>
                  <PreviewWidget widget={w} event={event} branding={branding}
                    tareas={tareas} timeline={timeline} presupuesto={presupuesto} suppliers={suppliers} contrato={contrato} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AccessModal open={accessOpen} onClose={() => setAccessOpen(false)} event={event} />
    </div>
  )
}
