import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Select, Button, Input, Typography, Spin, Empty, Tag, Tooltip,
  Badge, Space, Divider,
} from 'antd'
import {
  LeftOutlined, RightOutlined, CalendarOutlined,
  WarningOutlined, SearchOutlined, ClearOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { bookingsApi } from '../../api/bookings'
import { eventsApi } from '../../api/events'

dayjs.extend(isoWeek)

const { Title, Text } = Typography

// ── Constants ─────────────────────────────────────────────────────────────────
const NAVY      = '#1a3a5c'
const DAY_W     = 40          // px per day column
const LANE_H    = 44          // px per lane inside a row
const NAME_W    = 200         // px for sticky resource name column
const HDR_H1    = 28          // week-group header height
const HDR_H2    = 22          // day-name header height
const HDR_H3    = 22          // day-number header height
const HDR_TOTAL = HDR_H1 + HDR_H2 + HDR_H3

const DAY_NAMES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const VIEW_DAYS: Record<string, number> = { week: 7, month: 30, '2months': 60 }

const PHASE_STYLE: Record<string, { background: string; borderStyle: string; color: string; label: string }> = {
  SETUP:    { background: '#fffbe6', borderStyle: 'dashed', color: '#d48806', label: 'Montaje' },
  EVENT:    { background: '#e6f4ff', borderStyle: 'solid',  color: '#1677ff', label: 'Evento'  },
  TEARDOWN: { background: '#fff7e6', borderStyle: 'dashed', color: '#fa8c16', label: 'Desmontaje' },
}

const EVENT_STATUS_COLOR: Record<string, string> = {
  QUOTED:       'blue',
  CONFIRMED:    'green',
  IN_EXECUTION: 'orange',
  CLOSED:       'purple',
  CANCELLED:    'red',
}
const EVENT_STATUS_LABEL: Record<string, string> = {
  QUOTED:       'Cotizado',
  CONFIRMED:    'Confirmado',
  IN_EXECUTION: 'En Ejecución',
  CLOSED:       'Cerrado',
  CANCELLED:    'Cancelado',
}
const ORDER_STATUS_COLOR: Record<string, string> = {
  QUOTED: '#1677ff', CONFIRMED: '#52c41a', IN_PAYMENT: '#fa8c16',
  PAID: '#722ed1', INVOICED: '#13c2c2', CANCELLED: '#ff4d4f',
}

const RESOURCE_TYPE_LABEL: Record<string, string> = {
  CONSUMABLE: 'Consumible', EQUIPMENT: 'Equipo', SPACE: 'Espacio',
  FURNITURE: 'Mobiliario', SERVICE: 'Servicio', DISCOUNT: 'Descuento', TAX: 'Impuesto',
}

function fmt(n: number) {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function buildDays(anchorDate: dayjs.Dayjs, totalDays: number) {
  return Array.from({ length: totalDays }, (_, i) => anchorDate.add(i, 'day'))
}

function buildWeekGroups(days: dayjs.Dayjs[]) {
  const groups: { label: string; start: number; count: number }[] = []
  let i = 0
  while (i < days.length) {
    const weekStart = days[i].startOf('isoWeek')
    const label = weekStart.format('DD MMM, YYYY')
    let count = 0
    while (i + count < days.length && days[i + count].isoWeek() === days[i].isoWeek()) count++
    groups.push({ label, start: i, count })
    i += count
  }
  return groups
}

// ── Tooltip content ───────────────────────────────────────────────────────────
function BookingTooltip({ b, resourceName, navigate }: { b: any; resourceName: string; navigate: (p: string) => void }) {
  const isSpace = b.type === 'EVENT_SPACE'
  const phase   = b.phase ? PHASE_STYLE[b.phase] : null

  return (
    <div style={{ minWidth: 260, maxWidth: 320, fontSize: 12 }}>
      {isSpace ? (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#fff' }}>
            📅 {b.event?.name}
          </div>
          <Divider style={{ margin: '6px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px 8px', color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ opacity: 0.65 }}>Recurso</span>    <span>{resourceName}</span>
            <span style={{ opacity: 0.65 }}>Fase</span>       <span>{phase?.label ?? b.phase}</span>
            <span style={{ opacity: 0.65 }}>Inicio</span>     <span>{dayjs(b.startTime).format('DD MMM YYYY HH:mm')}</span>
            <span style={{ opacity: 0.65 }}>Fin</span>        <span>{dayjs(b.endTime).format('DD MMM YYYY HH:mm')}</span>
            {b.event?.primaryClient && (
              <>
                <span style={{ opacity: 0.65 }}>Cliente</span>
                <span>{b.event.primaryClient.companyName ?? `${b.event.primaryClient.firstName ?? ''} ${b.event.primaryClient.lastName ?? ''}`.trim()}</span>
              </>
            )}
            <span style={{ opacity: 0.65 }}>Estatus</span>
            <span><Tag color={EVENT_STATUS_COLOR[b.event?.status]} style={{ margin: 0 }}>{EVENT_STATUS_LABEL[b.event?.status] ?? b.event?.status}</Tag></span>
            {b.notes && (
              <>
                <span style={{ opacity: 0.65 }}>Notas</span>
                <span style={{ fontStyle: 'italic' }}>{b.notes}</span>
              </>
            )}
            {(b.ordersCount ?? 0) > 0 && (
              <>
                <span style={{ opacity: 0.65 }}>Órdenes</span>
                <span>{b.ordersCount} — {fmt(b.ordersTotal ?? 0)}</span>
              </>
            )}
          </div>
          <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <Button
            size="small" type="link" style={{ color: '#a5d8ff', padding: 0 }}
            onClick={() => navigate(`/eventos/${b.event?.id}`)}
          >
            Ver Evento →
          </Button>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#fff' }}>
            🧾 {b.order?.orderNumber}
          </div>
          <Divider style={{ margin: '6px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px 8px', color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ opacity: 0.65 }}>Recurso</span>  <span>{resourceName}</span>
            <span style={{ opacity: 0.65 }}>Cliente</span>  <span>{b.order?.client?.companyName ?? `${b.order?.client?.firstName ?? ''} ${b.order?.client?.lastName ?? ''}`.trim()}</span>
            {b.order?.client?.rfc && (
              <><span style={{ opacity: 0.65 }}>RFC</span><span>{b.order.client.rfc}</span></>
            )}
            <span style={{ opacity: 0.65 }}>Inicio</span>  <span>{dayjs(b.startTime).format('DD MMM YYYY')}</span>
            <span style={{ opacity: 0.65 }}>Fin</span>      <span>{dayjs(b.endTime).format('DD MMM YYYY')}</span>
            <span style={{ opacity: 0.65 }}>Estatus</span>  <span><Tag color={b.order?.status === 'CANCELLED' ? 'red' : 'blue'} style={{ margin: 0 }}>{b.order?.status}</Tag></span>
            <span style={{ opacity: 0.65 }}>Total</span>    <span style={{ fontWeight: 600 }}>{fmt(b.order?.total ?? 0)}</span>
          </div>
          {(b.order?.lineItems ?? []).length > 0 && (
            <>
              <Divider style={{ margin: '6px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
              <div style={{ opacity: 0.75, marginBottom: 4 }}>Servicios:</div>
              <ul style={{ margin: 0, paddingLeft: 16, color: 'rgba(255,255,255,0.9)' }}>
                {b.order.lineItems.slice(0, 5).map((li: string, i: number) => <li key={i}>{li}</li>)}
                {b.order.lineItems.length > 5 && <li>+{b.order.lineItems.length - 5} más…</li>}
              </ul>
            </>
          )}
          <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <Button
            size="small" type="link" style={{ color: '#a5d8ff', padding: 0 }}
            onClick={() => navigate(`/ordenes/${b.order?.id}`)}
          >
            Ver Orden →
          </Button>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingCalendarPage() {
  const navigate = useNavigate()
  const today    = dayjs()

  // View state
  const [view, setView]           = useState<'week' | 'month' | '2months'>('month')
  const [anchor, setAnchor]       = useState(today.startOf('month'))

  // Filters
  const [resourceType,   setResourceType]   = useState<string | undefined>()
  const [eventId,        setEventId]        = useState<string | undefined>()
  const [eventStatus,    setEventStatus]    = useState<string | undefined>()
  const [resourceSearch, setResourceSearch] = useState('')
  const [searchInput,    setSearchInput]    = useState('')

  const totalDays = VIEW_DAYS[view]
  const days      = useMemo(() => buildDays(anchor, totalDays), [anchor, totalDays])
  const weekGroups = useMemo(() => buildWeekGroups(days), [days])

  const dateFrom = days[0].format('YYYY-MM-DD')
  const dateTo   = days[days.length - 1].format('YYYY-MM-DD')

  // Events list for selector
  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn:  () => eventsApi.list({ pageSize: 200 }),
  })
  const events = eventsData?.data ?? []

  // Calendar data
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['booking-calendar', dateFrom, dateTo, resourceType, eventId, eventStatus, resourceSearch],
    queryFn:  () => bookingsApi.calendar({ dateFrom, dateTo, resourceType, eventId, eventStatus, resourceSearch: resourceSearch || undefined }),
    keepPreviousData: true,
  })

  const resources     = data?.data?.resources    ?? []
  const bookings      = data?.data?.bookings      ?? []
  const meta          = data?.data?.meta          ?? {}

  // Navigate
  const step = view === 'week' ? 7 : view === 'month' ? 1 : 2
  const unit = view === 'week' ? 'week' : 'month'
  const prev = () => setAnchor(a => view === 'week' ? a.subtract(step, 'day') : a.subtract(step, unit as any))
  const next = () => setAnchor(a => view === 'week' ? a.add(step, 'day') : a.add(step, unit as any))
  const goToday = () => setAnchor(view === 'week' ? today.startOf('isoWeek') : today.startOf('month'))

  const clearFilters = () => {
    setResourceType(undefined)
    setEventId(undefined)
    setEventStatus(undefined)
    setResourceSearch('')
    setSearchInput('')
  }
  const hasFilters = !!(resourceType || eventId || eventStatus || resourceSearch)

  // Today marker position
  const todayIdx = days.findIndex(d => d.isSame(today, 'day'))

  // Bookings grouped by resourceId
  const bookingsByResource = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const b of bookings) {
      if (!map.has(b.resourceId)) map.set(b.resourceId, [])
      map.get(b.resourceId)!.push(b)
    }
    return map
  }, [bookings])

  // Compute bar geometry
  function getBarStyle(b: any) {
    const start = dayjs(b.startTime)
    const end   = dayjs(b.endTime)
    const first = days[0]
    const last  = days[days.length - 1]

    const visStart = start.isBefore(first) ? first : start
    const visEnd   = end.isAfter(last)     ? last  : end

    const startIdx = days.findIndex(d => d.isSame(visStart, 'day'))
    const endIdx   = days.findIndex(d => d.isSame(visEnd, 'day'))

    const left  = Math.max(0, startIdx) * DAY_W + 2
    const width = Math.max(DAY_W - 4, (endIdx - Math.max(0, startIdx) + 1) * DAY_W - 4)

    const isSpace = b.type === 'EVENT_SPACE'
    const phase   = b.phase ? PHASE_STYLE[b.phase] : null

    const background   = isSpace ? (phase?.background ?? '#e6f4ff') : `${ORDER_STATUS_COLOR[b.order?.status] ?? '#1677ff'}22`
    const borderColor  = isSpace ? (phase?.color ?? '#1677ff')      : (ORDER_STATUS_COLOR[b.order?.status] ?? '#1677ff')
    const borderStyle  = phase?.borderStyle ?? 'solid'
    const textColor    = isSpace ? (phase?.color ?? '#1677ff')      : (ORDER_STATUS_COLOR[b.order?.status] ?? '#1677ff')
    const label        = isSpace
      ? (b.event?.name ?? '—')
      : `${b.order?.client?.companyName ?? `${b.order?.client?.firstName ?? ''} ${b.order?.client?.lastName ?? ''}`.trim()} · ${b.order?.orderNumber}`

    return { left, width, background, borderColor, borderStyle, textColor, label }
  }

  const gridWidth = totalDays * DAY_W

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <div style={{ background: NAVY, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
            <CalendarOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: NAVY }}>Calendario de Espacios</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {meta.totalResources ?? 0} recursos · {meta.totalBookings ?? 0} reservas
              {(meta.conflictsCount ?? 0) > 0 && (
                <Text style={{ color: '#ff4d4f', marginLeft: 8 }}>
                  <WarningOutlined /> {meta.conflictsCount} solapamientos
                </Text>
              )}
            </Text>
          </div>
        </Space>

        {/* View + navigation */}
        <Space wrap>
          <Space.Compact>
            {(['week', 'month', '2months'] as const).map(v => (
              <Button
                key={v}
                type={view === v ? 'primary' : 'default'}
                onClick={() => setView(v)}
                style={view === v ? { background: NAVY, borderColor: NAVY } : {}}
                size="small"
              >
                {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : '2 Meses'}
              </Button>
            ))}
          </Space.Compact>
          <Space.Compact>
            <Button size="small" icon={<LeftOutlined />} onClick={prev} />
            <Button size="small" onClick={goToday}>Hoy</Button>
            <Button size="small" icon={<RightOutlined />} onClick={next} />
          </Space.Compact>
          <Text strong style={{ color: NAVY, minWidth: 160, textAlign: 'center' }}>
            {days[0].format('DD MMM')} — {days[days.length - 1].format('DD MMM YYYY')}
          </Text>
        </Space>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 10, border: '1px solid #e8f0fe',
        padding: '12px 16px', marginBottom: 16,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Tipo de recurso</Text>
          <Select
            style={{ width: 150 }} allowClear placeholder="Todos" value={resourceType}
            onChange={v => setResourceType(v)}
            options={Object.entries(RESOURCE_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          />
        </div>
        <div>
          <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Evento</Text>
          <Select
            style={{ width: 220 }} allowClear placeholder="Todos los eventos" value={eventId}
            onChange={v => setEventId(v)} showSearch
            filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={events.map((e: any) => ({ value: e.id, label: e.name }))}
          />
        </div>
        <div>
          <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Estado del evento</Text>
          <Select
            style={{ width: 150 }} allowClear placeholder="Todos" value={eventStatus}
            onChange={v => setEventStatus(v)}
            options={Object.entries(EVENT_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          />
        </div>
        <div>
          <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Buscar recurso</Text>
          <Input.Search
            style={{ width: 180 }} placeholder="Nombre o código…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onSearch={v => setResourceSearch(v)}
            allowClear onClear={() => setResourceSearch('')}
            enterButton={<SearchOutlined />}
          />
        </div>
        {hasFilters && (
          <Button icon={<ClearOutlined />} onClick={clearFilters}>Limpiar</Button>
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(PHASE_STYLE).map(([phase, s]) => (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 12, borderRadius: 3,
              background: s.background,
              border: `2px ${s.borderStyle} ${s.color}`,
            }} />
            <Text style={{ fontSize: 11, color: '#64748b' }}>{s.label}</Text>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 12, borderRadius: 3, background: '#52c41a22', border: '2px solid #52c41a' }} />
          <Text style={{ fontSize: 11, color: '#64748b' }}>Orden confirmada</Text>
        </div>
        {(meta.conflictsCount ?? 0) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge color="#ff4d4f" /> <Text style={{ fontSize: 11, color: '#ff4d4f' }}>Solapamiento</Text>
          </div>
        )}
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : resources.length === 0 ? (
        <Empty description="No hay reservas para este período y filtros" style={{ padding: 60 }} />
      ) : (
        <div style={{
          border: '1px solid #e2e8f0', borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(26,58,92,0.07)',
          opacity: isFetching ? 0.7 : 1,
          transition: 'opacity 0.2s',
        }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
            <div style={{ minWidth: NAME_W + gridWidth, position: 'relative' }}>

              {/* ── Sticky header ── */}
              <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f8fafc' }}>

                {/* Row 1: week groups */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    background: NAVY, borderRight: '2px solid #0f2540',
                    height: HDR_H1, display: 'flex', alignItems: 'center', padding: '0 14px',
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>RECURSO / ESPACIO</Text>
                  </div>
                  {weekGroups.map((g, gi) => (
                    <div key={gi} style={{
                      width: g.count * DAY_W, minWidth: g.count * DAY_W, flexShrink: 0,
                      height: HDR_H1, background: '#f1f5f9',
                      borderRight: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                    }}>
                      <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {g.label}
                      </Text>
                    </div>
                  ))}
                </div>

                {/* Row 2: day names */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    background: NAVY, borderRight: '2px solid #0f2540',
                    height: HDR_H2,
                  }} />
                  {days.map((d, i) => {
                    const isWeekend = d.day() === 0 || d.day() === 6
                    const isToday   = i === todayIdx
                    return (
                      <div key={i} style={{
                        width: DAY_W, minWidth: DAY_W, flexShrink: 0,
                        height: HDR_H2, textAlign: 'center',
                        borderRight: '1px solid #e2e8f0',
                        background: isToday ? '#dbeafe' : isWeekend ? '#f8f0ff' : '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 10, color: isWeekend ? '#7c3aed' : '#94a3b8', fontWeight: 600 }}>
                          {DAY_NAMES[d.day()]}
                        </Text>
                      </div>
                    )
                  })}
                </div>

                {/* Row 3: day numbers */}
                <div style={{ display: 'flex', borderBottom: '2px solid #cbd5e1' }}>
                  <div style={{
                    width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                    position: 'sticky', left: 0, zIndex: 30,
                    background: NAVY, borderRight: '2px solid #0f2540',
                    height: HDR_H3,
                  }} />
                  {days.map((d, i) => {
                    const isWeekend = d.day() === 0 || d.day() === 6
                    const isToday   = i === todayIdx
                    return (
                      <div key={i} style={{
                        width: DAY_W, minWidth: DAY_W, flexShrink: 0,
                        height: HDR_H3, textAlign: 'center',
                        borderRight: '1px solid #e2e8f0',
                        background: isToday ? '#dbeafe' : isWeekend ? '#f8f0ff' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: isToday ? 800 : 500,
                          color: isToday ? '#1677ff' : isWeekend ? '#7c3aed' : '#374151',
                        }}>
                          {d.date()}
                        </Text>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Resource rows ── */}
              {resources.map((resource: any, rowIdx: number) => {
                const rowBookings = bookingsByResource.get(resource.id) ?? []
                const laneCount   = resource.laneCount || 1
                const rowH        = laneCount * LANE_H

                return (
                  <div key={resource.id} style={{
                    display: 'flex',
                    borderBottom: '1px solid #e2e8f0',
                    height: rowH,
                    background: rowIdx % 2 === 0 ? '#fff' : '#f8fafc',
                    position: 'relative',
                  }}>
                    {/* Sticky resource name */}
                    <div style={{
                      width: NAME_W, minWidth: NAME_W, flexShrink: 0,
                      position: 'sticky', left: 0, zIndex: 10,
                      background: rowIdx % 2 === 0 ? '#fff' : '#f8fafc',
                      borderRight: '2px solid #cbd5e1',
                      padding: '0 12px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      gap: 2,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {resource.hasConflict && (
                          <Tooltip title="Este recurso tiene reservas solapadas">
                            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 13, flexShrink: 0 }} />
                          </Tooltip>
                        )}
                        <Text style={{ fontSize: 12, color: NAVY, fontWeight: 600 }} ellipsis title={resource.name}>
                          {resource.name}
                        </Text>
                      </div>
                      <Text style={{ fontSize: 10, color: '#94a3b8' }}>{resource.code}</Text>
                    </div>

                    {/* Day background cells */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                      {days.map((d, i) => {
                        const isWeekend = d.day() === 0 || d.day() === 6
                        const isToday   = i === todayIdx
                        return (
                          <div key={i} style={{
                            width: DAY_W, minWidth: DAY_W, height: '100%', flexShrink: 0,
                            borderRight: '1px solid #f0f4f8',
                            background: isToday
                              ? 'rgba(22,119,255,0.05)'
                              : isWeekend
                              ? 'rgba(124,58,237,0.03)'
                              : 'transparent',
                          }} />
                        )
                      })}

                      {/* Today vertical marker */}
                      {todayIdx >= 0 && (
                        <div style={{
                          position: 'absolute',
                          left: todayIdx * DAY_W + DAY_W / 2,
                          top: 0, bottom: 0,
                          width: 2,
                          background: '#1677ff',
                          opacity: 0.4,
                          zIndex: 3,
                          pointerEvents: 'none',
                        }} />
                      )}

                      {/* Booking bars */}
                      {rowBookings.map((b: any) => {
                        const { left, width, background, borderColor, borderStyle, textColor, label } = getBarStyle(b)
                        const top = b.lane * LANE_H + 5
                        const height = LANE_H - 10

                        return (
                          <Tooltip
                            key={b.id}
                            title={<BookingTooltip b={b} resourceName={resource.name} navigate={navigate} />}
                            color={NAVY}
                            overlayInnerStyle={{ padding: '12px 14px' }}
                            overlayStyle={{ maxWidth: 360 }}
                            mouseEnterDelay={0.15}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                left, top, width, height,
                                borderRadius: 6,
                                background,
                                border: `2px ${borderStyle} ${borderColor}`,
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: 8,
                                paddingRight: 6,
                                cursor: 'pointer',
                                overflow: 'hidden',
                                zIndex: 4,
                                transition: 'filter 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.93)')}
                              onMouseLeave={e => (e.currentTarget.style.filter = '')}
                              onClick={() => b.type === 'EVENT_SPACE'
                                ? navigate(`/eventos/${b.event?.id}`)
                                : navigate(`/ordenes/${b.order?.id}`)
                              }
                            >
                              <Text style={{
                                fontSize: 11, fontWeight: 600, color: textColor,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {label}
                              </Text>
                            </div>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
