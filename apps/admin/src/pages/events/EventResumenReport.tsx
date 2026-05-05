import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Spin } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { eventsApi } from '../../api/events'
import { eventActivitiesApi } from '../../api/eventActivities'
import { ordersApi } from '../../api/orders'
import { formatMoney } from '../../utils/format'

dayjs.locale('es')

// ── Helpers ────────────────────────────────────────────────────────────────────

const EVENT_STATUS_LABEL: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado',
  IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada',
  INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}
const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  TASK: 'Tarea', MILESTONE: 'Hito', PHASE: 'Fase', MEETING: 'Reunión',
  REHEARSAL: 'Ensayo', LOGISTICS: 'Logística', CATERING: 'Catering',
  TECHNICAL: 'Técnico', SECURITY: 'Seguridad', CUSTOM: 'Otro',
}
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const STATUS_DOT: Record<string, string> = {
  PENDING: '#94a3b8', IN_PROGRESS: '#3b82f6', DONE: '#10b981',
  CANCELLED: '#ef4444', BLOCKED: '#f59e0b',
}
const PRIORITY_COLOR: Record<string, string> = {
  LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
}

function fmt(d?: string | null, format = 'D MMM YYYY') {
  if (!d) return '—'
  return dayjs(d).format(format)
}
function fmtTime(d?: string | null) {
  if (!d) return null
  return dayjs(d).format('HH:mm')
}

// ── Phase grouping ─────────────────────────────────────────────────────────────

type Phase = 'SETUP' | 'EVENT' | 'TEARDOWN' | 'GENERAL'

function getActivityPhase(activity: any, event: any): Phase {
  const start = activity.startDate ? dayjs(activity.startDate) : null
  if (!start) return 'GENERAL'
  const eStart = event.eventStart ? dayjs(event.eventStart) : null
  const eEnd   = event.eventEnd   ? dayjs(event.eventEnd)   : null
  if (eStart && start.isBefore(eStart, 'day')) return 'SETUP'
  if (eEnd   && start.isAfter(eEnd, 'day'))    return 'TEARDOWN'
  return 'EVENT'
}

const PHASE_META: Record<Phase, { label: string; color: string; bg: string }> = {
  SETUP:    { label: 'Montaje (Setup)',      color: '#b45309', bg: '#fffbeb' },
  EVENT:    { label: 'Días del Evento',      color: '#1d4ed8', bg: '#eff6ff' },
  TEARDOWN: { label: 'Desmontaje (Teardown)',color: '#7c3aed', bg: '#f5f3ff' },
  GENERAL:  { label: 'General / Sin fecha',  color: '#475569', bg: '#f8fafc' },
}

// ── Subcomponents ──────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = '#1a3a5c' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: 1, background: '#fff', border: '1px solid #e5e9f0',
      borderRadius: 10, padding: '16px 20px', minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, color = '#1a3a5c' }: { title: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 16px',
    }}>
      <div style={{ width: 4, height: 20, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</div>
      <div style={{ flex: 1, height: 1, background: '#e5e9f0' }} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EventResumenReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: eventRes, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  })
  const { data: activitiesRes, isLoading: loadingActivities } = useQuery({
    queryKey: ['event-activities', id],
    queryFn: () => eventActivitiesApi.list(id!),
    enabled: !!id,
  })
  const { data: ordersRes, isLoading: loadingOrders } = useQuery({
    queryKey: ['event-report-orders', id],
    queryFn: () => ordersApi.report({ eventId: id }),
    enabled: !!id,
  })

  const isLoading = loadingEvent || loadingActivities || loadingOrders

  const event      = eventRes?.data
  const activities: any[] = activitiesRes?.data ?? []
  const orders: any[]     = ordersRes?.data ?? []
  const totals             = ordersRes?.totals ?? {}

  // Exclude credit notes from display
  const activeOrders = orders.filter((o: any) => !o.isCreditNote)

  // Group activities by phase
  const grouped: Record<Phase, any[]> = { SETUP: [], EVENT: [], TEARDOWN: [], GENERAL: [] }
  for (const a of activities) {
    grouped[getActivityPhase(a, event ?? {})].push(a)
  }
  const phaseOrder: Phase[] = ['SETUP', 'EVENT', 'TEARDOWN', 'GENERAL']

  // Team (unique assignees across orders)
  const teamMap = new Map<string, string>()
  for (const o of activeOrders) {
    if (o.assignedTo) {
      teamMap.set(o.assignedTo.id, `${o.assignedTo.firstName} ${o.assignedTo.lastName}`)
    }
  }
  const team = [...teamMap.values()]

  // Resource count across all line items
  const resourceCount = activeOrders.reduce((sum: number, o: any) => sum + (o.lineItems?.length ?? 0), 0)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!event) return null

  const statusMeta = {
    QUOTED:       { color: '#2e7fc1', bg: '#eff6ff' },
    CONFIRMED:    { color: '#059669', bg: '#ecfdf5' },
    IN_EXECUTION: { color: '#d97706', bg: '#fffbeb' },
    CLOSED:       { color: '#475569', bg: '#f1f5f9' },
    CANCELLED:    { color: '#dc2626', bg: '#fef2f2' },
  }[event.status as string] ?? { color: '#64748b', bg: '#f8fafc' }

  const balance = (totals.total ?? 0) - (totals.paidAmount ?? 0)

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#f5f7fa', minHeight: '100vh' }}>

      {/* ── Screen-only toolbar ── */}
      <div className="no-print" style={{
        background: '#1a3a5c', color: 'white',
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          style={{ color: 'rgba(255,255,255,0.85)' }}
          onClick={() => navigate(`/eventos/${id}`)}
        >
          Volver al evento
        </Button>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>Resumen del Evento</span>
        <Button
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          Imprimir
        </Button>
      </div>

      {/* ── Report body ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* ── Event header ── */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '28px 32px',
          border: '1px solid #e5e9f0', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                  {event.code}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  fontWeight: 600, background: statusMeta.bg, color: statusMeta.color,
                }}>
                  {EVENT_STATUS_LABEL[event.status] ?? event.status}
                </span>
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800, color: '#1a3a5c', lineHeight: 1.2 }}>
                {event.name}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13, color: '#475569' }}>
                {event.venue && (
                  <span>📍 {event.venue}</span>
                )}
                {event.eventStart && (
                  <span>📅 {fmt(event.eventStart, 'D MMM YYYY')}
                    {event.eventEnd && event.eventEnd !== event.eventStart
                      ? ` — ${fmt(event.eventEnd, 'D MMM YYYY')}`
                      : ''}
                  </span>
                )}
                {event.expectedAttendance && (
                  <span>👥 {Number(event.expectedAttendance).toLocaleString('es-MX')} asistentes esperados</span>
                )}
              </div>
            </div>

            {/* Phase timeline pill */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#64748b', alignSelf: 'flex-end' }}>
              {event.setupStart && <span>Montaje: {fmt(event.setupStart)} → {fmt(event.setupEnd)}</span>}
              {event.eventStart && <span>Evento: {fmt(event.eventStart)} → {fmt(event.eventEnd)}</span>}
              {event.teardownStart && <span>Desmontaje: {fmt(event.teardownStart)} → {fmt(event.teardownEnd)}</span>}
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <KpiCard
            label="Ingresos Totales"
            value={formatMoney(totals.total ?? 0, 'MXN')}
            sub={`${activeOrders.length} orden${activeOrders.length !== 1 ? 'es' : ''} de servicio`}
            color="#1d4ed8"
          />
          <KpiCard
            label="Cobrado"
            value={formatMoney(totals.paidAmount ?? 0, 'MXN')}
            sub={balance > 0 ? `Saldo: ${formatMoney(balance, 'MXN')}` : 'Sin saldo pendiente'}
            color={balance > 0 ? '#d97706' : '#059669'}
          />
          <KpiCard
            label="Renglones de Recursos"
            value={String(resourceCount)}
            sub={`en ${activeOrders.length} OS`}
            color="#7c3aed"
          />
          <KpiCard
            label="Actividades"
            value={String(activities.length)}
            sub={`${grouped.SETUP.length} setup · ${grouped.EVENT.length} evento · ${grouped.TEARDOWN.length} desmontaje`}
            color="#0891b2"
          />
          {team.length > 0 && (
            <KpiCard
              label="Equipo"
              value={String(team.length)}
              sub={team.slice(0, 2).join(', ') + (team.length > 2 ? ` +${team.length - 2}` : '')}
              color="#475569"
            />
          )}
        </div>

        {/* ── Timeline de Actividades ── */}
        <SectionHeader title="Timeline de Actividades" color="#0891b2" />

        {activities.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
            No hay actividades registradas en el timeline.
          </div>
        ) : (
          phaseOrder.filter(p => grouped[p].length > 0).map(phase => {
            const meta = PHASE_META[phase]
            const phaseActivities = grouped[phase].sort((a: any, b: any) => {
              if (a.startDate && b.startDate) return dayjs(a.startDate).diff(dayjs(b.startDate))
              return (a.position ?? 0) - (b.position ?? 0)
            })
            // Date range for phase header
            const dates = phaseActivities.filter((a: any) => a.startDate)
            const minDate = dates.length ? dates.reduce((m: any, a: any) => dayjs(a.startDate).isBefore(dayjs(m.startDate)) ? a : m) : null
            const maxDate = dates.length ? dates.reduce((m: any, a: any) => dayjs(a.endDate ?? a.startDate).isAfter(dayjs(m.endDate ?? m.startDate)) ? a : m) : null

            return (
              <div key={phase} style={{ marginBottom: 20 }}>
                {/* Phase header */}
                <div style={{
                  background: meta.bg, border: `1px solid ${meta.color}22`,
                  borderRadius: '8px 8px 0 0', padding: '10px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 700, color: meta.color, fontSize: 13 }}>{meta.label}</span>
                  {minDate && (
                    <span style={{ fontSize: 12, color: meta.color, opacity: 0.8 }}>
                      {fmt(minDate.startDate, 'D MMM')}
                      {maxDate && maxDate.startDate !== minDate.startDate
                        ? ` — ${fmt(maxDate.endDate ?? maxDate.startDate, 'D MMM YYYY')}`
                        : ` ${fmt(minDate.startDate, 'YYYY')}`}
                    </span>
                  )}
                </div>

                {/* Activities table */}
                <div style={{ background: '#fff', border: `1px solid #e5e9f0`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  {/* Table header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 90px 80px 70px',
                    padding: '8px 16px', background: '#f8fafc',
                    fontSize: 10, fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: 0.6,
                    borderBottom: '1px solid #e5e9f0',
                  }}>
                    <span>Hora</span>
                    <span>Actividad</span>
                    <span>Tipo</span>
                    <span>Prioridad</span>
                    <span style={{ textAlign: 'right' }}>Estado</span>
                  </div>

                  {phaseActivities.map((act: any, idx: number) => {
                    const startT = fmtTime(act.startDate)
                    const endT   = fmtTime(act.endDate)
                    const isLast = idx === phaseActivities.length - 1
                    return (
                      <div key={act.id} style={{
                        display: 'grid', gridTemplateColumns: '80px 1fr 90px 80px 70px',
                        padding: '10px 16px', alignItems: 'start',
                        borderBottom: isLast ? 'none' : '1px solid #f0f4f8',
                        background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                      }}>
                        {/* Time */}
                        <div style={{ fontSize: 11, color: '#64748b', fontVariantNumeric: 'tabular-nums', paddingTop: 1 }}>
                          {startT ? (
                            <>
                              <span style={{ fontWeight: 600 }}>{startT}</span>
                              {endT && <><br /><span style={{ color: '#94a3b8' }}>{endT}</span></>}
                            </>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </div>

                        {/* Title + description */}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', marginBottom: 2 }}>
                            {act.color && (
                              <span style={{
                                display: 'inline-block', width: 8, height: 8,
                                borderRadius: '50%', background: act.color,
                                marginRight: 6, verticalAlign: 'middle', flexShrink: 0,
                              }} />
                            )}
                            {act.title}
                          </div>
                          {act.description && (
                            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{act.description}</div>
                          )}
                          {act.assignedTo && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              👤 {act.assignedTo.firstName} {act.assignedTo.lastName}
                            </div>
                          )}
                        </div>

                        {/* Type */}
                        <div>
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 8,
                            background: '#f1f5f9', color: '#475569', fontWeight: 600,
                          }}>
                            {ACTIVITY_TYPE_LABEL[act.activityType] ?? act.activityType}
                          </span>
                        </div>

                        {/* Priority */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: PRIORITY_COLOR[act.priority] ?? '#94a3b8' }}>
                            {PRIORITY_LABEL[act.priority] ?? act.priority}
                          </span>
                        </div>

                        {/* Status dot */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, color: STATUS_DOT[act.status] ?? '#94a3b8',
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: STATUS_DOT[act.status] ?? '#94a3b8', flexShrink: 0,
                            }} />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* ── Órdenes de Servicio con Recursos ── */}
        <SectionHeader title="Órdenes de Servicio y Recursos" color="#7c3aed" />

        {activeOrders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
            No hay órdenes de servicio registradas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeOrders.map((order: any) => {
              const clientName = order.client?.companyName
                || `${order.client?.firstName ?? ''} ${order.client?.lastName ?? ''}`.trim()
                || '—'
              const orderTotal   = Number(order.total ?? 0)
              const orderPaid    = Number(order.paidAmount ?? 0)
              const orderBalance = orderTotal - orderPaid
              const lineItems: any[] = order.lineItems ?? []
              const statusMeta2 = {
                QUOTED:      { color: '#2e7fc1', bg: '#eff6ff' },
                CONFIRMED:   { color: '#059669', bg: '#ecfdf5' },
                EXECUTED:    { color: '#3b82f6', bg: '#eff6ff' },
                INVOICED:    { color: '#0891b2', bg: '#ecfeff' },
                CANCELLED:   { color: '#dc2626', bg: '#fef2f2' },
                CREDIT_NOTE: { color: '#d97706', bg: '#fffbeb' },
              }[order.status as string] ?? { color: '#64748b', bg: '#f8fafc' }

              return (
                <div key={order.id} style={{
                  background: '#fff', border: '1px solid #e5e9f0',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {/* Order header */}
                  <div style={{
                    padding: '12px 20px', background: '#f8fafc',
                    borderBottom: '1px solid #e5e9f0',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3a5c', fontFamily: 'monospace' }}>
                      {order.orderNumber}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      fontWeight: 600, background: statusMeta2.bg, color: statusMeta2.color,
                    }}>
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{clientName}</span>
                    {order.organizacion && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {order.organizacion.clave} — {order.organizacion.descripcion}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                      <span><strong style={{ color: '#1a3a5c' }}>{formatMoney(orderTotal, 'MXN')}</strong> total</span>
                      {orderBalance > 0.01 && (
                        <span style={{ color: '#d97706' }}>{formatMoney(orderBalance, 'MXN')} pendiente</span>
                      )}
                    </div>
                  </div>

                  {/* Line items */}
                  {lineItems.length === 0 ? (
                    <div style={{ padding: '12px 20px', color: '#94a3b8', fontSize: 12 }}>Sin renglones.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#fafbfc' }}>
                          <th style={{ padding: '8px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f4f8' }}>
                            Recurso / Descripción
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f4f8', width: 70 }}>
                            Cant.
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f4f8', width: 110 }}>
                            P. Unit.
                          </th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f4f8', width: 60 }}>
                            Desc.
                          </th>
                          <th style={{ padding: '8px 20px', textAlign: 'right', color: '#94a3b8', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f4f8', width: 120 }}>
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((li: any, idx: number) => (
                          <tr key={li.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                            <td style={{ padding: '9px 20px', color: '#1f2937', borderBottom: '1px solid #f0f4f8' }}>
                              {li.description || '—'}
                              {li.observations && (
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{li.observations}</div>
                              )}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', borderBottom: '1px solid #f0f4f8', fontVariantNumeric: 'tabular-nums' }}>
                              {Number(li.quantity).toLocaleString('es-MX')}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', borderBottom: '1px solid #f0f4f8', fontVariantNumeric: 'tabular-nums' }}>
                              {formatMoney(Number(li.unitPrice ?? 0), 'MXN')}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b', borderBottom: '1px solid #f0f4f8' }}>
                              {Number(li.discountPct ?? 0) > 0 ? `${Number(li.discountPct).toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '9px 20px', textAlign: 'right', fontWeight: 600, color: '#1a3a5c', borderBottom: '1px solid #f0f4f8', fontVariantNumeric: 'tabular-nums' }}>
                              {formatMoney(Number(li.lineTotal ?? 0), 'MXN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ padding: '10px 12px 10px 20px', fontSize: 12, color: '#64748b', textAlign: 'right', fontWeight: 600 }}>
                            Total OS
                          </td>
                          <td style={{ padding: '10px 20px 10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#1a3a5c', fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(orderTotal, 'MXN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Financial Summary ── */}
        {activeOrders.length > 0 && (
          <>
            <SectionHeader title="Resumen Financiero" color="#059669" />
            <div style={{
              background: '#fff', border: '1px solid #e5e9f0',
              borderRadius: 10, overflow: 'hidden',
            }}>
              {[
                { label: 'Subtotal', value: totals.subtotal ?? 0, muted: true },
                { label: 'Descuentos', value: -(totals.discountAmount ?? 0), muted: true },
                { label: `IVA (16%)`, value: totals.taxAmount ?? 0, muted: true },
                { label: 'Total', value: totals.total ?? 0, bold: true, large: true },
                { label: 'Total Cobrado', value: totals.paidAmount ?? 0, color: '#059669' },
                { label: 'Saldo Pendiente', value: balance, color: balance > 0.01 ? '#d97706' : '#059669', bold: true },
              ].map((row, i, arr) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 24px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f0f4f8' : 'none',
                  background: row.bold && row.large ? '#f8fafc' : '#fff',
                }}>
                  <span style={{ fontSize: row.large ? 14 : 13, color: row.muted ? '#64748b' : '#1f2937', fontWeight: row.bold ? 700 : 400 }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: row.large ? 18 : 14, fontWeight: row.bold ? 700 : 500,
                    color: row.color ?? (row.muted ? '#475569' : '#1a3a5c'),
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatMoney(Math.abs(row.value), 'MXN')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: 48, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
          Generado por IventIA · {dayjs().format('D MMM YYYY, HH:mm')}
        </div>

      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  )
}
