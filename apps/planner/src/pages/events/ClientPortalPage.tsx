/**
 * ClientPortalPage.tsx
 * PUBLIC client portal — accessible at /portal-cliente/:id (no admin auth required)
 * Authentication: email + password via portal user JWT
 * Session:        sessionStorage planner-portal-token-{eventId} = JWT
 * Data:           fetched from backend PlannerPortalSnapshot
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Input, Typography, Divider, Avatar, Spin } from 'antd'
import {
  LockOutlined, CalendarOutlined, DollarOutlined, CheckSquareOutlined,
  PictureOutlined, TeamOutlined, LinkOutlined, CheckCircleOutlined,
  AppstoreOutlined, UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')
import { plannerPortalApi } from '../../api/portalClient'
import { DEFAULT_BRANDING, type EventBranding } from './EstudioPage'

const { Text } = Typography

// ── Types ──────────────────────────────────────────────────────────────────────
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
    client: any
  }
}

// ── Section card ───────────────────────────────────────────────────────────────
function SectionCard({ title, icon, color, children }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 24,
    }}>
      <div style={{
        background: color, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: '#fff', fontSize: 16 }}>{icon}</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

// ── Section renderers ──────────────────────────────────────────────────────────
function SectionPortada({ snapshot, branding }: { snapshot: NonNullable<PortalSnapshot['eventSnapshot']>; branding: EventBranding }) {
  const bg = branding.coverStyle === 'gradient'
    ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
    : branding.coverStyle === 'dark' ? '#0D0D1A' : branding.primaryColor

  const textColor = branding.textOnBg || '#ffffff'
  const muted = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)'
  const daysUntil = snapshot.eventStart ? Math.max(0, dayjs(snapshot.eventStart).diff(dayjs(), 'day')) : null

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', background: bg,
      padding: 32, color: textColor, position: 'relative', marginBottom: 24,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: branding.accentColor }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: muted, letterSpacing: '0.1em', marginBottom: 8 }}>
        {snapshot.eventType || 'EVENTO'} · {snapshot.code || '—'}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>
        {snapshot.name || 'Portal del Evento'}
      </div>
      {branding.tagline && (
        <div style={{ fontSize: 15, color: muted, marginBottom: 16 }}>{branding.tagline}</div>
      )}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {snapshot.eventStart && (
          <span style={{ fontSize: 14, color: muted }}>
            📅 {dayjs(snapshot.eventStart).format('D [de] MMMM YYYY')}
          </span>
        )}
        {snapshot.venueLocation && (
          <span style={{ fontSize: 14, color: muted }}>📍 {snapshot.venueLocation}</span>
        )}
        {daysUntil !== null && (
          <span style={{
            fontSize: 13, fontWeight: 700, background: branding.accentColor,
            color: '#fff', borderRadius: 20, padding: '4px 14px',
          }}>
            {daysUntil === 0 ? '¡Hoy!' : `${daysUntil} días`}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionTimeline({ timeline, accentColor }: { timeline: any; accentColor: string }) {
  const activities: any[] = Array.isArray(timeline) ? timeline : (timeline?.activities || [])

  const byPhase: Record<string, any[]> = {}
  activities.forEach((a: any) => {
    const phase = a.phase || 'General'
    if (!byPhase[phase]) byPhase[phase] = []
    byPhase[phase].push(a)
  })

  return (
    <SectionCard title="Agenda del evento" icon={<CalendarOutlined />} color={accentColor}>
      {activities.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>Sin actividades programadas aún</div>
      ) : (
        Object.entries(byPhase).map(([phase, acts]) => (
          <div key={phase} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: '0.08em', marginBottom: 10 }}>
              {phase.toUpperCase()}
            </div>
            {acts.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 4, borderRadius: 4, background: accentColor, flexShrink: 0, marginTop: 4, height: 32 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{a.title}</div>
                  {a.startTime && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{a.startTime}{a.endTime ? ` — ${a.endTime}` : ''}</div>
                  )}
                  {a.description && (
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{a.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </SectionCard>
  )
}

function SectionTareas({ tareas, accentColor }: { tareas: any; accentColor: string }) {
  const tasks = ((tareas?.tasks || []) as any[]).filter((t: any) => t.clientVisible !== false)
  const done = tasks.filter((t: any) => t.status === 'DONE').length

  return (
    <SectionCard title="Tareas relevantes" icon={<CheckSquareOutlined />} color="#F97316">
      {tasks.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>Sin tareas para mostrar</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
            {done} de {tasks.length} completadas
          </div>
          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 6, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
              background: accentColor, borderRadius: 6, transition: 'width 0.3s',
            }} />
          </div>
          {tasks.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, border: `2px solid ${t.status === 'DONE' ? '#10B981' : '#D1D5DB'}`,
                background: t.status === 'DONE' ? '#10B981' : 'transparent', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t.status === 'DONE' && <CheckCircleOutlined style={{ color: '#fff', fontSize: 11 }} />}
              </div>
              <span style={{
                fontSize: 14, color: t.status === 'DONE' ? '#9CA3AF' : '#1F2937',
                textDecoration: t.status === 'DONE' ? 'line-through' : 'none',
              }}>
                {t.title}
              </span>
              {t.dueDate && (
                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                  {dayjs(t.dueDate).format('D MMM')}
                </span>
              )}
            </div>
          ))}
        </>
      )}
    </SectionCard>
  )
}

function SectionPresupuesto({ presupuesto }: { presupuesto: any }) {
  const chapters = (presupuesto?.chapters || []) as any[]
  const totalGeneral = chapters.reduce((sum: number, ch: any) =>
    sum + (ch.items || []).reduce((s: number, it: any) => s + (it.total || 0), 0), 0)

  return (
    <SectionCard title="Resumen de presupuesto" icon={<DollarOutlined />} color="#0D9488">
      {chapters.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>Sin presupuesto disponible aún</div>
      ) : (
        <>
          {chapters.map((ch: any) => {
            const chTotal = (ch.items || []).reduce((s: number, it: any) => s + (it.total || 0), 0)
            return (
              <div key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{ch.name}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0D9488' }}>
                  ${chTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )
          })}
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>Total estimado</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0D9488' }}>
              ${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </SectionCard>
  )
}

function SectionGaleria({ lienzo }: { lienzo: any }) {
  const widgets: any[] = Array.isArray(lienzo) ? lienzo : (lienzo?.widgets || [])
  const imageWidgets = widgets.filter((w: any) => w.type === 'imagen' && w.config?.src)
  return (
    <SectionCard title="Galería / Moodboard" icon={<PictureOutlined />} color="#EC4899">
      {imageWidgets.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>Sin imágenes disponibles aún</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {imageWidgets.map((w: any) => (
            <div key={w.id} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <img src={w.config.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function SectionEquipo() {
  return (
    <SectionCard title="Equipo asignado" icon={<TeamOutlined />} color="#3B82F6">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
        <Avatar size={48} style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontSize: 18, fontWeight: 700 }}>
          E
        </Avatar>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Event Designer</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>IventIA Planner</div>
        </div>
      </div>
    </SectionCard>
  )
}

function SectionLinks({ lienzo }: { lienzo: any }) {
  const widgets: any[] = Array.isArray(lienzo) ? lienzo : (lienzo?.widgets || [])
  const linkWidgets = widgets.filter((w: any) => w.type === 'links')
  const allLinks: any[] = linkWidgets.flatMap((w: any) => w.config?.links || [])
  return (
    <SectionCard title="Recursos y enlaces" icon={<LinkOutlined />} color="#6366F1">
      {allLinks.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>Sin recursos disponibles aún</div>
      ) : allLinks.map((l: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#EEF2FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LinkOutlined style={{ color: '#6366F1', fontSize: 14 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{l.title || l.url}</div>
            {l.url && (
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#6366F1' }}>
                {l.url}
              </a>
            )}
          </div>
        </div>
      ))}
    </SectionCard>
  )
}

// ── Login screen ───────────────────────────────────────────────────────────────
function LoginScreen({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const branding = DEFAULT_BRANDING
  const bg = `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`

  async function handleAcceder() {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onLogin(email, password)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        setError('Credenciales incorrectas. Verifica con tu event designer.')
      } else {
        setError('Error al conectar. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 40,
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900, color: '#fff',
        }}>
          I
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: branding.primaryColor, letterSpacing: '0.1em', marginBottom: 4 }}>
          IventIA PLANNER
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', marginBottom: 28 }}>
          Portal de tu Evento
        </div>

        <div style={{ textAlign: 'left', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Correo</label>
        </div>
        <Input
          size="large"
          prefix={<UserOutlined style={{ color: branding.primaryColor }} />}
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          onPressEnter={handleAcceder}
          status={error ? 'error' : undefined}
          style={{ marginBottom: 12 }}
        />
        <div style={{ textAlign: 'left', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Contraseña</label>
        </div>
        <Input.Password
          size="large"
          prefix={<LockOutlined style={{ color: branding.primaryColor }} />}
          placeholder="Tu contraseña de acceso"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null) }}
          onPressEnter={handleAcceder}
          status={error ? 'error' : undefined}
          style={{ marginBottom: error ? 6 : 16 }}
        />
        {error && (
          <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 16, textAlign: 'left' }}>
            {error}
          </div>
        )}
        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleAcceder}
          style={{ background: branding.primaryColor, borderColor: branding.primaryColor, fontWeight: 700, height: 46 }}
        >
          Acceder
        </Button>

        <div style={{ marginTop: 32, fontSize: 11, color: '#9CA3AF' }}>
          Powered by IventIA Planner
        </div>
      </div>
    </div>
  )
}

// ── Error screen ───────────────────────────────────────────────────────────────
function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const branding = DEFAULT_BRANDING
  const bg = `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 12 }}>Portal no disponible</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <Button type="primary" onClick={onRetry} style={{ background: branding.primaryColor, borderColor: branding.primaryColor }}>
          Volver a intentar
        </Button>
        <div style={{ marginTop: 24, fontSize: 11, color: '#9CA3AF' }}>Powered by IventIA Planner</div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = id || ''
  const sessionKey = `planner-portal-token-${eventId}`

  const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)

  async function fetchSnapshot(token: string) {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await plannerPortalApi.getSnapshot(eventId, token)
      setSnapshot(res.data ?? res)
      setAuthed(true)
    } catch (err: any) {
      const status = err?.response?.status
      sessionStorage.removeItem(sessionKey)
      if (status === 404) {
        setFetchError('El organizador aún no ha publicado el contenido del portal. Pídele que haga clic en "Publicar portal" en su Planner.')
      } else if (status === 403) {
        setFetchError('No tienes acceso a este evento. Verifica con tu event designer.')
      } else {
        setFetchError('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.')
      }
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }

  // Check for existing session on mount
  useEffect(() => {
    if (!eventId) return
    const storedToken = sessionStorage.getItem(sessionKey)
    if (storedToken) {
      fetchSnapshot(storedToken)
    }
  }, [eventId])

  async function handleLogin(email: string, password: string) {
    const res = await plannerPortalApi.login(email, password)
    const accessToken: string = res.data?.accessToken ?? res.accessToken
    sessionStorage.setItem(sessionKey, accessToken)
    await fetchSnapshot(accessToken)
  }

  // Loading spinner
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Error after auth (snapshot not published, no access, etc.)
  if (authed && fetchError) {
    return <ErrorScreen message={fetchError} onRetry={() => { setFetchError(null); setAuthed(false) }} />
  }
  if (!authed && fetchError) {
    return <ErrorScreen message={fetchError} onRetry={() => setFetchError(null)} />
  }

  // Not logged in yet
  if (!snapshot) {
    return <LoginScreen onLogin={handleLogin} />
  }


  const branding: EventBranding = { ...DEFAULT_BRANDING, ...(snapshot.branding || {}) }
  const visible: string[] = snapshot.portalConfig?.visibleWidgets || ['portada', 'timeline', 'presupuesto']
  const eventSnapshot = snapshot.eventSnapshot
  const eventName = eventSnapshot?.name || 'Portal del Evento'

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      {/* Nav bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1040, #2D1B69)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 12, height: 56,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 900, color: '#fff',
        }}>
          I
        </div>
        <span style={{ color: '#C4B5FD', fontSize: 13, fontWeight: 700 }}>IventIA · Portal del Cliente</span>
        <div style={{ flex: 1 }} />
        {eventName && (
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{eventName}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        {/* Portada */}
        {eventSnapshot && visible.includes('portada') && (
          <SectionPortada snapshot={eventSnapshot} branding={branding} />
        )}
        {!eventSnapshot && visible.includes('portada') && (
          <div style={{
            background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
            borderRadius: 16, padding: 32, color: '#fff', marginBottom: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Portal del Evento</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 8 }}>
              Bienvenido a tu portal de evento personalizado
            </div>
          </div>
        )}

        {/* Portal message */}
        {snapshot.portalConfig?.portalMessage && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 24,
            borderLeft: `4px solid ${branding.accentColor}`,
          }}>
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
              {snapshot.portalConfig.portalMessage}
            </Text>
          </div>
        )}

        {/* Sections */}
        {visible.includes('timeline') && (
          <SectionTimeline timeline={snapshot.timeline} accentColor={branding.primaryColor} />
        )}
        {visible.includes('tareas') && (
          <SectionTareas tareas={snapshot.tareas} accentColor={branding.accentColor} />
        )}
        {visible.includes('presupuesto') && (
          <SectionPresupuesto presupuesto={snapshot.presupuesto} />
        )}
        {visible.includes('galeria') && (
          <SectionGaleria lienzo={snapshot.lienzo} />
        )}
        {visible.includes('equipo') && <SectionEquipo />}
        {visible.includes('links') && (
          <SectionLinks lienzo={snapshot.lienzo} />
        )}

        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <AppstoreOutlined style={{ fontSize: 40, marginBottom: 16 }} />
            <div style={{ fontSize: 16 }}>El organizador está preparando el contenido de tu portal</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 12 }}>
          Powered by IventIA Planner
        </div>
      </div>
    </div>
  )
}
