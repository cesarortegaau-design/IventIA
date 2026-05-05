import { useMemo } from 'react'
import {
  EditOutlined, DollarOutlined, FileProtectOutlined, MessageOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { T } from '../../styles/tokens'

const AUDIT_ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  COMMENT:          { icon: <MessageOutlined />,     color: T.blue },
  MESSAGE:          { icon: <MessageOutlined />,     color: T.blue },
  CREATE:           { icon: <DollarOutlined />,      color: T.success },
  CONTRACT_SIGNED:  { icon: <FileProtectOutlined />, color: T.warning },
}
function getAuditIcon(action: string) {
  return AUDIT_ICON_MAP[action] ?? { icon: <EditOutlined />, color: T.textMuted }
}

const SECTION_COLORS = [T.blue, T.purple, T.warning, T.success]
const ROLE_COLORS = [T.blue, T.success, T.warning, T.purple]

interface Props {
  event: any
  auditData: any[]
  onSwitchTab: (tab: string) => void
}

export default function EventSummaryTab({ event, auditData, onSwitchTab }: Props) {
  const ticketSections: any[] = event.ticketEvent?.sections ?? []
  const totalCapacity = ticketSections.reduce((s: number, sec: any) => s + (sec.capacity ?? 0), 0)
  const totalSold = ticketSections.reduce((s: number, sec: any) => s + (sec.sold ?? 0), 0)
  const ocupacionPct = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : null

  const summary = event.orderSummary ?? {}
  const totalRevenue: number = summary.totalRevenue ?? 0
  const activeOrders: number = summary.activeCount ?? 0
  const pendingOrders: number = summary.pendingCount ?? 0
  const team: any[] = summary.team ?? []

  const daysToEvent = event.eventStart ? dayjs(event.eventStart).diff(dayjs(), 'day') : null

  const recentAudit = (auditData ?? []).slice(0, 3)

  const milestones = useMemo(() => {
    const now = dayjs()
    return [
      { label: 'Montaje inicia', date: event.setupStart },
      { label: 'Apertura', date: event.eventStart },
      { label: 'Cierre', date: event.eventEnd },
      { label: 'Desmontaje completa', date: event.teardownEnd },
    ]
      .filter(m => m.date && dayjs(m.date).isAfter(now))
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
      .slice(0, 4)
  }, [event])

  const kpiCard = (children: React.ReactNode) => (
    <div
      style={{ background: 'white', borderRadius: 10, padding: 14, border: `1px solid ${T.border}`, transition: '0.15s ease', cursor: 'default' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
      }}
    >
      {children}
    </div>
  )

  const revenueDisplay = totalRevenue >= 1_000_000
    ? `$${(totalRevenue / 1_000_000).toFixed(1)}M`
    : totalRevenue >= 1_000
    ? `$${(totalRevenue / 1_000).toFixed(1)}K`
    : `$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

      {/* ── Left column ── */}
      <div>
        {/* 4 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {kpiCard(
            <>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Boletos vendidos</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>
                {ticketSections.length > 0 ? totalSold.toLocaleString('es-MX') : '—'}
              </div>
              <div style={{ fontSize: 11, color: T.success, marginTop: 2 }}>
                {ocupacionPct !== null ? `${ocupacionPct}% ocupación` : 'Sin módulo de boletos'}
              </div>
            </>
          )}
          {kpiCard(
            <>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Ingreso total</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>{revenueDisplay}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{orders.length} órdenes</div>
            </>
          )}
          {kpiCard(
            <>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>OS activas</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>{activeOrders}</div>
              <div style={{ fontSize: 11, color: T.warning, marginTop: 2 }}>{pendingOrders} pendientes</div>
            </>
          )}
          {kpiCard(
            <>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Días al evento</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.navy }}>
                {daysToEvent === null ? '—' : daysToEvent < 0 ? 'En curso' : daysToEvent}
              </div>
              <div style={{ fontSize: 11, color: T.purple, marginTop: 2 }}>
                {daysToEvent === null ? 'sin fecha' : daysToEvent < 0 ? 'evento activo' : 'on-track'}
              </div>
            </>
          )}
        </div>

        {/* Timeline */}
        <div style={{ background: 'white', borderRadius: 10, padding: 18, border: `1px solid ${T.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 14 }}>Línea de tiempo</div>
          {recentAudit.length === 0 ? (
            <div style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', padding: '16px 0' }}>Sin actividad registrada</div>
          ) : (
            <>
              {recentAudit.map((log: any, i: number) => {
                const { icon, color } = getAuditIcon(log.action)
                return (
                  <div key={log.id ?? i} style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderBottom: i < recentAudit.length - 1 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color, fontSize: 14,
                    }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>
                        {log.action === 'CREATE' ? 'Creado' : log.action === 'DELETE' ? 'Eliminado' : log.action === 'UPDATE' ? 'Actualizado' : log.action}
                      </div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: T.textDim, whiteSpace: 'nowrap' }}>
                      {dayjs(log.createdAt).format('DD/MM/YY HH:mm')}
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => onSwitchTab('auditoria')}
                style={{ marginTop: 12, fontSize: 12, color: T.blue, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                Ver todo el historial →
              </button>
            </>
          )}
        </div>

        {/* Occupancy (only if ticketEvent) */}
        {ticketSections.length > 0 && (
          <div style={{ background: 'white', borderRadius: 10, padding: 18, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.navy, marginBottom: 14 }}>Ocupación por sección</div>
            {ticketSections.map((sec: any, i: number) => {
              const pct = sec.capacity > 0 ? (sec.sold / sec.capacity) * 100 : 0
              const color = SECTION_COLORS[i % SECTION_COLORS.length]
              return (
                <div key={sec.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: T.text, fontWeight: 500 }}>{sec.name}</span>
                    <span style={{ color: T.textMuted }}>
                      {(sec.sold ?? 0).toLocaleString('es-MX')} / {(sec.capacity ?? 0).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right column ── */}
      <div>
        {/* Team */}
        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Equipo</div>
          {team.length === 0 ? (
            <div style={{ fontSize: 12, color: T.textMuted }}>Sin responsables asignados a OS</div>
          ) : (
            team.map((member: any, i: number) => {
              const name = `${member.firstName} ${member.lastName}`
              const initials = `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`
              const color = ROLE_COLORS[i % ROLE_COLORS.length]
              return (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: color, color: 'white', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {initials}
                  </div>
                  <div style={{ fontSize: 12, color: T.text }}>{name}</div>
                </div>
              )
            })
          )}
        </div>

        {/* Milestones */}
        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Próximos hitos</div>
          {milestones.length === 0 ? (
            <div style={{ fontSize: 12, color: T.textMuted }}>Sin hitos próximos</div>
          ) : (
            milestones.map((m, i) => (
              <div key={m.label} style={{
                display: 'flex', gap: 10, padding: '7px 0',
                borderBottom: i < milestones.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{ minWidth: 56, fontSize: 11, color: T.textMuted, fontWeight: 600 }}>
                  {dayjs(m.date).format('DD MMM')}
                </div>
                <div style={{ fontSize: 12, color: T.text }}>{m.label}</div>
              </div>
            ))
          )}
        </div>

        {/* Info card */}
        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 12 }}>Información</div>
          {[
            { label: 'Código', value: event.code },
            { label: 'Cliente', value: event.primaryClient?.companyName || (event.primaryClient ? `${event.primaryClient.firstName} ${event.primaryClient.lastName}` : null) },
            { label: 'Lista de precios', value: event.priceList?.name },
            { label: 'Tipo', value: event.eventType },
            { label: 'Clase', value: event.eventClass },
            { label: 'Categoría', value: event.eventCategory },
            { label: 'Venue', value: event.venue ?? event.venueLocation },
            { label: 'Asistentes esperados', value: event.expectedAttendance ? Number(event.expectedAttendance).toLocaleString('es-MX') : null },
          ].filter(item => item.value).map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: T.textMuted, minWidth: 130, flexShrink: 0 }}>{item.label}</span>
              <span style={{ color: T.text }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
