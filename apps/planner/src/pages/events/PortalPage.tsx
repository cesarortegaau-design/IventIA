/**
 * PortalPage.tsx
 * Portal del cliente — configuración + preview del lienzo del cliente
 * Widget visibility persisted in localStorage: iventia-portal-config-{eventId}
 */
import { useState, useEffect } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Button, Switch, Tag, Typography, Divider, App, Tooltip, Avatar,
  Modal, Form, Input, Space, Badge,
} from 'antd'
import {
  GlobalOutlined, EyeOutlined, EyeInvisibleOutlined, UserOutlined,
  CopyOutlined, KeyOutlined, CheckCircleOutlined, LockOutlined,
  AppstoreOutlined, CalendarOutlined, DollarOutlined, CheckSquareOutlined,
  PictureOutlined, TeamOutlined, LinkOutlined, CloudUploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
dayjs.extend(relativeTime)
dayjs.locale('es')
import { eventsApi } from '../../api/events'
import { loadBranding, brandingKey, type EventBranding } from './EstudioPage'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
interface PortalConfig {
  visibleWidgets: string[]
  portalMessage: string
  accessEnabled: boolean
  updatedAt: string
}

const ALL_WIDGETS = [
  { key: 'portada',    label: 'Portada del evento',  icon: <AppstoreOutlined />,   desc: 'Nombre, fecha, ubicación y branding' },
  { key: 'timeline',  label: 'Agenda / Timeline',    icon: <CalendarOutlined />,   desc: 'Actividades y fases del evento' },
  { key: 'tareas',    label: 'Tareas relevantes',    icon: <CheckSquareOutlined />, desc: 'Tareas marcadas como visibles al cliente' },
  { key: 'presupuesto', label: 'Resumen de presupuesto', icon: <DollarOutlined />, desc: 'Totales por capítulo sin desglose interno' },
  { key: 'galeria',   label: 'Galería / Moodboard',  icon: <PictureOutlined />,    desc: 'Imágenes e inspiración del evento' },
  { key: 'equipo',    label: 'Equipo asignado',       icon: <TeamOutlined />,       desc: 'Contactos y responsables del evento' },
  { key: 'links',     label: 'Recursos y enlaces',   icon: <LinkOutlined />,       desc: 'Documentos, videos y referencias' },
]

const DEFAULT_CONFIG: PortalConfig = {
  visibleWidgets: ['portada', 'timeline', 'presupuesto'],
  portalMessage: '',
  accessEnabled: false,
  updatedAt: '',
}

// ── Persistence ────────────────────────────────────────────────────────────────
const configKey = (id: string) => `iventia-portal-config-${id}`
const snapshotKey = (id: string) => `iventia-portal-event-snapshot-${id}`

function loadConfig(id: string): PortalConfig {
  try {
    const raw = localStorage.getItem(configKey(id))
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(id: string, cfg: PortalConfig) {
  localStorage.setItem(configKey(id), JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }))
}

function saveEventSnapshot(id: string, event: any) {
  if (!event) return
  const snapshot = {
    name: event.name,
    eventStart: event.eventStart,
    eventType: event.eventType,
    code: event.code,
    venueLocation: event.venueLocation,
    client: event.client,
  }
  localStorage.setItem(snapshotKey(id), JSON.stringify(snapshot))
}

// ── Client preview widgets ─────────────────────────────────────────────────────
function PreviewPortada({ event, branding }: { event: any; branding: EventBranding }) {
  const bg = branding.coverStyle === 'gradient'
    ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
    : branding.coverStyle === 'dark' ? '#0D0D1A' : branding.primaryColor

  const textColor = branding.textOnBg || '#ffffff'
  const muted = textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'
  const daysUntil = event?.eventStart ? Math.max(0, dayjs(event.eventStart).diff(dayjs(), 'day')) : null

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden', background: bg,
      padding: 24, color: textColor, position: 'relative', marginBottom: 14,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: branding.accentColor }} />
      <div style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: '0.08em', marginBottom: 4 }}>
        {event?.eventType || 'EVENTO'} · {event?.code || '—'}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25, marginBottom: 6 }}>
        {event?.name || 'Sin nombre'}
      </div>
      {branding.tagline && (
        <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>{branding.tagline}</div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {event?.eventStart && (
          <span style={{ fontSize: 12, color: muted }}>
            📅 {dayjs(event.eventStart).format('D [de] MMMM YYYY')}
          </span>
        )}
        {event?.venueLocation && (
          <span style={{ fontSize: 12, color: muted }}>📍 {event.venueLocation}</span>
        )}
        {daysUntil !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, background: branding.accentColor,
            color: '#fff', borderRadius: 20, padding: '2px 10px',
          }}>
            {daysUntil === 0 ? '¡Hoy!' : `${daysUntil} días`}
          </span>
        )}
      </div>
    </div>
  )
}

function PreviewTimeline({ eventId }: { eventId: string }) {
  // TimelinePage stores { phases, activities, updatedAt } — extract the activities array
  let activities: any[] = []
  try {
    const raw = localStorage.getItem(`iventia-timeline-${eventId}`)
    if (raw) {
      const stored = JSON.parse(raw)
      activities = Array.isArray(stored) ? stored : (stored.activities || [])
    }
  } catch { /* ignore */ }
  const shown = activities.slice(0, 4)
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarOutlined style={{ color: '#7C3AED' }} /> Agenda del evento
      </div>
      {shown.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 8 }}>Sin actividades aún</div>
      ) : shown.map((a: any) => (
        <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 3, borderRadius: 3, background: '#7C3AED', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{a.startTime} {a.phase && `· ${a.phase}`}</div>
          </div>
        </div>
      ))}
      {activities.length > 4 && (
        <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 4 }}>
          +{activities.length - 4} más…
        </div>
      )}
    </div>
  )
}

function PreviewPresupuesto({ eventId }: { eventId: string }) {
  const data = JSON.parse(localStorage.getItem(`iventia-presupuesto-${eventId}`) || '{"chapters":[]}')
  const chapters = (data.chapters || []) as any[]
  const totalGeneral = chapters.reduce((sum: number, ch: any) =>
    sum + (ch.items || []).reduce((s: number, it: any) => s + (it.total || 0), 0), 0)

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <DollarOutlined style={{ color: '#0D9488' }} /> Resumen de presupuesto
      </div>
      {chapters.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 8 }}>Sin presupuesto aún</div>
      ) : (
        <>
          {chapters.slice(0, 4).map((ch: any) => {
            const chTotal = (ch.items || []).reduce((s: number, it: any) => s + (it.total || 0), 0)
            return (
              <div key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: '#444' }}>{ch.name}</span>
                <span style={{ fontWeight: 600 }}>${chTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            )
          })}
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
            <span>Total estimado</span>
            <span style={{ color: '#0D9488' }}>${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </>
      )}
    </div>
  )
}

function PreviewTareas({ eventId }: { eventId: string }) {
  const data = JSON.parse(localStorage.getItem(`iventia-tareas-${eventId}`) || '{"tasks":[]}')
  const tasks = ((data.tasks || []) as any[]).filter((t: any) => t.clientVisible !== false)
  const shown = tasks.slice(0, 4)
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckSquareOutlined style={{ color: '#F97316' }} /> Tareas relevantes
      </div>
      {shown.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 8 }}>Sin tareas para mostrar</div>
      ) : shown.map((t: any) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4, border: '1.5px solid #ddd',
            background: t.status === 'DONE' ? '#0D9488' : 'transparent', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {t.status === 'DONE' && <CheckCircleOutlined style={{ color: '#fff', fontSize: 9 }} />}
          </div>
          <span style={{ fontSize: 12, color: t.status === 'DONE' ? '#aaa' : '#333', textDecoration: t.status === 'DONE' ? 'line-through' : 'none' }}>
            {t.title}
          </span>
        </div>
      ))}
    </div>
  )
}

function readLienzoWidgets(eventId: string): any[] {
  try {
    const raw = localStorage.getItem(`iventia-lienzo-${eventId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      // LienzoPage stores a raw array of widgets
      return Array.isArray(parsed) ? parsed : (parsed.widgets || [])
    }
  } catch { /* ignore */ }
  return []
}

function PreviewGaleria({ eventId }: { eventId: string }) {
  const widgets = readLienzoWidgets(eventId)
  const imageWidgets = widgets.filter((w: any) => w.type === 'imagen' && w.config?.src)
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <PictureOutlined style={{ color: '#EC4899' }} /> Galería
      </div>
      {imageWidgets.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 8 }}>Sin imágenes aún</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {imageWidgets.slice(0, 6).map((w: any) => (
            <div key={w.id} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
              <img src={w.config.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PreviewEquipo({ event }: { event: any }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <TeamOutlined style={{ color: '#3B82F6' }} /> Equipo asignado
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontSize: 12, fontWeight: 700 }}>
          E
        </Avatar>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Event Designer</div>
          <div style={{ fontSize: 11, color: '#888' }}>IventIA Planner</div>
        </div>
      </div>
    </div>
  )
}

function PreviewLinks({ eventId }: { eventId: string }) {
  const linkWidgets = readLienzoWidgets(eventId).filter((w: any) => w.type === 'links')
  const allLinks: any[] = linkWidgets.flatMap((w: any) => w.config?.links || [])
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <LinkOutlined style={{ color: '#6366F1' }} /> Recursos y enlaces
      </div>
      {allLinks.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center', padding: 8 }}>Sin recursos aún</div>
      ) : allLinks.slice(0, 4).map((l: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <LinkOutlined style={{ color: '#6366F1', fontSize: 12 }} />
          <span style={{ fontSize: 12, color: '#444' }}>{l.title || l.url}</span>
        </div>
      ))}
    </div>
  )
}

// ── Access modal ────────────────────────────────────────────────────────────────
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
      const eventId = event?.id
      if (!eventId) return
      setLoading(true)
      setApiError(null)
      const password = generatePassword()
      await eventsApi.createPortalDirectAccess(eventId, {
        email: values.email,
        password,
        firstName: values.firstName,
        lastName: values.lastName,
      })
      const url = `${window.location.origin}/portal-cliente/${eventId}`
      setGenerated({ email: values.email, password, url })
    } catch (err: any) {
      if (err?.errorFields) return // form validation error, already shown
      setApiError(err?.response?.data?.error?.message || 'Error al crear el acceso. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    message.success('Copiado')
  }

  function handleClose() {
    setGenerated(null)
    setApiError(null)
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={<><KeyOutlined style={{ color: '#7C3AED', marginRight: 8 }} />Acceso al portal del cliente</>}
      onCancel={handleClose}
      footer={null}
      width={480}
    >
      {!generated ? (
        <>
          <Text style={{ color: '#666', fontSize: 13, display: 'block', marginBottom: 16 }}>
            Crea credenciales de acceso para que tu cliente pueda consultar el portal desde cualquier dispositivo.
          </Text>
          <Form form={form} layout="vertical" initialValues={{ email: event?.client?.email || '' }}>
            <Form.Item
              name="email"
              label="Correo del cliente"
              rules={[{ required: true, type: 'email', message: 'Correo válido requerido' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="cliente@ejemplo.com" />
            </Form.Item>
            <Form.Item
              name="firstName"
              label="Nombre"
              rules={[{ required: true, message: 'Nombre requerido' }]}
            >
              <Input placeholder="Nombre" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Apellido"
              rules={[{ required: true, message: 'Apellido requerido' }]}
            >
              <Input placeholder="Apellido" />
            </Form.Item>
          </Form>
          {apiError && (
            <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{apiError}</div>
          )}
          <Button type="primary" block onClick={handleGenerate} loading={loading}
            style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>
            Generar acceso
          </Button>
        </>
      ) : (
        <>
          <div style={{
            background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10,
            padding: 16, marginBottom: 16,
          }}>
            <div style={{ color: '#16A34A', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              <CheckCircleOutlined style={{ marginRight: 6 }} />Acceso creado
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>URL del portal</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Text strong style={{ fontSize: 12, wordBreak: 'break-all' }}>{generated.url}</Text>
                <Tooltip title="Copiar">
                  <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => handleCopy(generated.url)} />
                </Tooltip>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Correo</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Text strong style={{ fontSize: 12 }}>{generated.email}</Text>
                <Tooltip title="Copiar">
                  <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => handleCopy(generated.email)} />
                </Tooltip>
              </div>
            </div>
            <div>
              <Text style={{ fontSize: 12, color: '#666' }}>Contraseña</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Text strong style={{ fontSize: 13, fontFamily: 'monospace', letterSpacing: 2 }}>
                  {generated.password}
                </Text>
                <Tooltip title="Copiar">
                  <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => handleCopy(generated.password)} />
                </Tooltip>
              </div>
            </div>
          </div>
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
            padding: 10, marginBottom: 16, fontSize: 12, color: '#92400E',
          }}>
            <LockOutlined style={{ marginRight: 4 }} />
            Guarda esta contraseña — no podrás verla de nuevo. Compártela junto con la URL al cliente.
          </div>
          <Space style={{ width: '100%' }} direction="vertical">
            <Button block onClick={() => {
              handleCopy(`Acceso al Portal IventIA\nEvento: ${event?.name}\nURL: ${generated.url}\nCorreo: ${generated.email}\nContraseña: ${generated.password}`)
            }}>
              <CopyOutlined /> Copiar todo para compartir
            </Button>
            <Button type="primary" block onClick={handleClose}
              style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>
              Listo
            </Button>
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

  const [config, setConfig] = useState<PortalConfig>(() => loadConfig(id || ''))
  const [accessOpen, setAccessOpen] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const branding = loadBranding(id || '')

  useEffect(() => {
    if (id) setConfig(loadConfig(id))
  }, [id])

  function toggleWidget(key: string) {
    const next = config.visibleWidgets.includes(key)
      ? config.visibleWidgets.filter((k) => k !== key)
      : [...config.visibleWidgets, key]
    const updated = { ...config, visibleWidgets: next }
    setConfig(updated)
    saveConfig(id!, updated)
  }

  function handleSave() {
    saveConfig(id!, config)
    saveEventSnapshot(id!, event)
    message.success('Configuración del portal guardada')
  }

  async function handlePublish() {
    if (!id) return
    setPublishLoading(true)
    try {
      // Read all planner stores from backend (not localStorage)
      const allStores = await eventsApi.getAllPlannerStores(id)
      const stores = allStores.data || allStores || {}

      const branding = stores.branding || null
      const portalConfig = config  // current local config state
      const timeline = stores.timeline || null
      const tareas = stores.tareas || null
      const presupuesto = stores.presupuesto || null
      const suppliers = stores.suppliers || null

      // Read lienzo widgets from backend
      let lienzo: any = null
      try {
        const lienzoRes = await eventsApi.getLienzo(id)
        lienzo = lienzoRes.data || lienzoRes || null
        // Attach suppliers so client portal can render them
        if (suppliers && lienzo) lienzo.suppliers = Array.isArray(suppliers) ? suppliers : (suppliers.suppliers || [])
      } catch { /* lienzo may not exist yet */ }

      const eventSnapshot = event ? {
        name: event.name,
        eventStart: event.eventStart,
        eventType: event.eventType,
        code: event.code,
        venueLocation: event.venueLocation,
        expectedAttendance: event.expectedAttendance,
        description: event.description,
        client: event.client,
      } : null

      await eventsApi.publishPlannerPortal(id, {
        branding, portalConfig, timeline, tareas, presupuesto, lienzo, eventSnapshot,
      })
      message.success('Lienzo publicado — el cliente puede acceder desde cualquier dispositivo')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || 'Error al publicar')
    } finally {
      setPublishLoading(false)
    }
  }

  const visible = config.visibleWidgets

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left config panel ── */}
      <div style={{
        width: 300, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #F0F0F0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #F5F5F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GlobalOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Portal del cliente</div>
              <div style={{ fontSize: 11, color: '#888' }}>Configura la vista del cliente</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>

          {/* Client info */}
          {event?.client && (
            <div style={{
              background: 'linear-gradient(135deg,#F5F3FF,#FDF4FF)',
              borderRadius: 10, padding: 12, marginBottom: 16,
              border: '1px solid #EDE9FE',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', letterSpacing: '0.06em', marginBottom: 6 }}>
                CLIENTE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={28} style={{ background: '#7C3AED', fontSize: 11, fontWeight: 700 }}>
                  {(event.client.companyName || event.client.firstName || '?')[0]}
                </Avatar>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
                    {event.client.companyName || `${event.client.firstName} ${event.client.lastName}`}
                  </div>
                  {event.client.email && (
                    <div style={{ fontSize: 11, color: '#888' }}>{event.client.email}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Access toggle */}
          <div style={{
            background: config.accessEnabled ? '#ECFDF5' : '#F9FAFB',
            border: `1px solid ${config.accessEnabled ? '#6EE7B7' : '#E5E7EB'}`,
            borderRadius: 10, padding: 12, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Acceso al portal</div>
              <Switch
                size="small"
                checked={config.accessEnabled}
                onChange={(v) => { const u = { ...config, accessEnabled: v }; setConfig(u); saveConfig(id!, u) }}
                style={{ background: config.accessEnabled ? '#059669' : undefined }}
              />
            </div>
            {config.accessEnabled ? (
              <div style={{ fontSize: 12, color: '#059669', marginBottom: 8 }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />Portal habilitado
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                El cliente no puede acceder aún
              </div>
            )}
            <Button
              size="small" block
              icon={<KeyOutlined />}
              onClick={() => setAccessOpen(true)}
              style={{ fontSize: 12 }}
            >
              Gestionar acceso
            </Button>
          </div>

          {/* Widget visibility */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', marginBottom: 8 }}>
              CONTENIDO VISIBLE
            </div>
            {ALL_WIDGETS.map((w) => {
              const isOn = visible.includes(w.key)
              return (
                <div
                  key={w.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                    background: isOn ? '#F5F3FF' : '#F9FAFB',
                    border: `1px solid ${isOn ? '#DDD6FE' : '#F0F0F0'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onClick={() => toggleWidget(w.key)}
                >
                  <span style={{ color: isOn ? '#7C3AED' : '#BBB', fontSize: 15 }}>{w.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isOn ? '#374151' : '#9CA3AF' }}>
                      {w.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.3 }}>{w.desc}</div>
                  </div>
                  {isOn
                    ? <EyeOutlined style={{ color: '#7C3AED', fontSize: 14 }} />
                    : <EyeInvisibleOutlined style={{ color: '#D1D5DB', fontSize: 14 }} />}
                </div>
              )
            })}
          </div>

          {/* Branding preview */}
          <div style={{
            borderRadius: 10, padding: 10, marginBottom: 16,
            background: '#F9FAFB', border: '1px solid #F0F0F0',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: '0.06em', marginBottom: 8 }}>
              BRANDING
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[branding.primaryColor, branding.secondaryColor, branding.accentColor].map((c, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: c, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
              ))}
              <Text style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>
                {branding.fontStyle} · {branding.coverStyle}
              </Text>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
              Edita en{' '}
              <span style={{ color: '#7C3AED', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { /* navigate to estudio */ }}>
                Estudio
              </span>
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F5F5F5' }}>
          <Button type="primary" block onClick={handleSave}
            style={{ background: '#7C3AED', borderColor: '#7C3AED', marginBottom: 8 }}>
            Guardar configuración
          </Button>
          <Button
            block
            icon={<CloudUploadOutlined />}
            loading={publishLoading}
            onClick={handlePublish}
            style={{ marginBottom: 8, borderColor: '#0D9488', color: '#0D9488' }}
          >
            Publicar portal
          </Button>
          <Button block onClick={() => window.open(`/portal-cliente/${id}`, '_blank')}>
            Abrir portal del cliente ↗
          </Button>
          {config.updatedAt && (
            <div style={{ textAlign: 'center', fontSize: 10, color: '#BBB', marginTop: 6 }}>
              Guardado {dayjs(config.updatedAt).fromNow()}
            </div>
          )}
        </div>
      </div>

      {/* ── Right preview ── */}
      <div style={{ flex: 1, overflow: 'auto', background: '#F3F4F6', display: 'flex', flexDirection: 'column' }}>
        {/* Preview header */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <Badge dot color={config.accessEnabled ? '#10B981' : '#D1D5DB'}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GlobalOutlined style={{ color: '#fff', fontSize: 13 }} />
            </div>
          </Badge>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Vista previa — Portal del cliente</div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {visible.length} sección{visible.length !== 1 ? 'es' : ''} visible{visible.length !== 1 ? 's' : ''} ·{' '}
              {config.accessEnabled
                ? <span style={{ color: '#10B981' }}>Portal activo</span>
                : <span style={{ color: '#9CA3AF' }}>Sin acceso</span>}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <Tag style={{ borderRadius: 20, fontSize: 11 }}>
            {event?.name || '—'}
          </Tag>
        </div>

        {/* Portal simulation */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {/* Simulated browser chrome */}
          <div style={{
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            maxWidth: 700, margin: '0 auto',
          }}>
            {/* Browser bar */}
            <div style={{
              background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#FF5F57', '#FFBD2E', '#28CA42'].map((c) => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{
                flex: 1, background: '#fff', border: '1px solid #E5E7EB',
                borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#888',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <LockOutlined style={{ fontSize: 10 }} />
                portal.iventia.app/evento/{id?.slice(0, 8)}…
              </div>
            </div>

            {/* Portal nav */}
            <div style={{
              background: 'linear-gradient(135deg,#1E1040,#2D1B69)',
              padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>P</div>
              <span style={{ color: '#C4B5FD', fontSize: 11, fontWeight: 700 }}>IventIA · Portal del Cliente</span>
              <div style={{ flex: 1 }} />
              <Avatar size={22} style={{ background: '#7C3AED', fontSize: 9 }}>C</Avatar>
            </div>

            {/* Portal content */}
            <div style={{ padding: 20, background: '#F8F8FF', minHeight: 400 }}>
              {!config.accessEnabled && (
                <div style={{
                  background: '#FFFBEB', border: '1px solid #FDE68A',
                  borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 12, color: '#92400E',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <LockOutlined />
                  Portal desactivado — el cliente no puede ver esta vista aún.
                </div>
              )}

              {event && visible.includes('portada') && (
                <PreviewPortada event={event} branding={branding} />
              )}
              {id && visible.includes('timeline') && <PreviewTimeline eventId={id} />}
              {id && visible.includes('tareas') && <PreviewTareas eventId={id} />}
              {id && visible.includes('presupuesto') && <PreviewPresupuesto eventId={id} />}
              {id && visible.includes('galeria') && <PreviewGaleria eventId={id} />}
              {event && visible.includes('equipo') && <PreviewEquipo event={event} />}
              {id && visible.includes('links') && <PreviewLinks eventId={id} />}

              {visible.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                  <EyeInvisibleOutlined style={{ fontSize: 32, marginBottom: 10 }} />
                  <div>Activa al menos una sección para mostrar en el portal</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access modal */}
      <AccessModal open={accessOpen} onClose={() => setAccessOpen(false)} event={event} />
    </div>
  )
}
