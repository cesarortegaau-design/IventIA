import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Card, Button, Select, Input, Space, Tag, List, Typography, Row, Col, Badge, Tooltip,
} from 'antd'
import {
  PlusOutlined, UnorderedListOutlined, CalendarOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import isoWeek from 'dayjs/plugin/isoWeek'
import { eventsApi } from '../../api/events'

dayjs.extend(isBetween)
dayjs.extend(isoWeek)

const { Title, Text } = Typography

// ── Status styling ─────────────────────────────────────────────────────────────
const STATUS_BG: Record<string, string> = {
  QUOTED:       '#e8f0fe',
  CONFIRMED:    '#e6f4ea',
  IN_EXECUTION: '#fef7e0',
  CLOSED:       '#f1f3f4',
  CANCELLED:    '#fce8e6',
}
const STATUS_BORDER: Record<string, string> = {
  QUOTED:       '#1a73e8',
  CONFIRMED:    '#1e8e3e',
  IN_EXECUTION: '#f9a825',
  CLOSED:       '#80868b',
  CANCELLED:    '#d93025',
}
const STATUS_TEXT: Record<string, string> = {
  QUOTED:       '#1a73e8',
  CONFIRMED:    '#137333',
  IN_EXECUTION: '#b06000',
  CLOSED:       '#5f6368',
  CANCELLED:    '#c5221f',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución',
  CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}

const DAY_NAMES_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Event card (used in both week and month views) ─────────────────────────────
function EventCard({ event, compact = false, onClick }: { event: any; compact?: boolean; onClick: () => void }) {
  const bg     = STATUS_BG[event.status]     ?? '#e8f0fe'
  const border = STATUS_BORDER[event.status] ?? '#1a73e8'
  const color  = STATUS_TEXT[event.status]   ?? '#1a73e8'
  const client = event.primaryClient?.companyName
    ?? (event.primaryClient ? `${event.primaryClient.firstName ?? ''} ${event.primaryClient.lastName ?? ''}`.trim() : '')

  return (
    <Tooltip
      title={
        <div style={{ fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{event.name}</div>
          <div style={{ opacity: 0.85 }}>{event.code}</div>
          {client && <div style={{ opacity: 0.85 }}>{client}</div>}
          {event.eventStart && (
            <div style={{ opacity: 0.75, marginTop: 2 }}>
              {dayjs(event.eventStart).format('DD MMM')} → {dayjs(event.eventEnd).format('DD MMM YYYY')}
            </div>
          )}
          <Tag color={STATUS_BORDER[event.status]} style={{ marginTop: 4, fontSize: 10 }}>
            {STATUS_LABELS[event.status]}
          </Tag>
        </div>
      }
      placement="top"
      mouseEnterDelay={0.3}
    >
      <div
        onClick={(e) => { e.stopPropagation(); onClick() }}
        style={{
          background: bg,
          borderLeft: `3px solid ${border}`,
          borderRadius: 4,
          padding: compact ? '2px 5px' : '4px 8px',
          cursor: 'pointer',
          marginBottom: 2,
          overflow: 'hidden',
          transition: 'filter 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.94)')}
        onMouseLeave={e => (e.currentTarget.style.filter = '')}
      >
        <div style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: '16px',
        }}>
          {event.name}
        </div>
        {!compact && client && (
          <div style={{
            fontSize: 11, color, opacity: 0.7,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: '14px',
          }}>
            {client}
          </div>
        )}
      </div>
    </Tooltip>
  )
}

// ── Weekly view ────────────────────────────────────────────────────────────────
function WeekView({ weekStart, events, navigate }: { weekStart: Dayjs; events: any[]; navigate: (p: string) => void }) {
  const today = dayjs()
  const days: Dayjs[] = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

  function eventsForDay(day: Dayjs) {
    return events.filter((e: any) => {
      if (!e.eventStart || !e.eventEnd) return false
      return day.isBetween(dayjs(e.eventStart), dayjs(e.eventEnd), 'day', '[]')
    })
  }

  const maxRows = Math.max(1, ...days.map(d => eventsForDay(d).length))
  const cellH = Math.max(120, maxRows * 52 + 16)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 600 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`, borderBottom: '2px solid #e2e8f0' }}>
          {days.map((day, i) => {
            const isToday = day.isSame(today, 'day')
            const isWeekend = day.day() === 0 || day.day() === 6
            return (
              <div key={i} style={{
                textAlign: 'center', padding: '10px 4px',
                background: isWeekend ? '#fafafa' : '#fff',
                borderRight: i < 6 ? '1px solid #f0f0f0' : 'none',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                  color: isToday ? '#1a73e8' : isWeekend ? '#9ca3af' : '#6b7280',
                  marginBottom: 4,
                }}>
                  {DAY_NAMES_SHORT[day.day()]}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: '50%',
                  background: isToday ? '#1a73e8' : 'transparent',
                  fontSize: isToday ? 16 : 18,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? '#fff' : isWeekend ? '#9ca3af' : '#111827',
                }}>
                  {day.date()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`,
          minHeight: cellH,
        }}>
          {days.map((day, i) => {
            const dayEvents = eventsForDay(day)
            const isToday = day.isSame(today, 'day')
            const isWeekend = day.day() === 0 || day.day() === 6
            return (
              <div key={i} style={{
                padding: '8px 4px',
                background: isToday ? '#f8f9ff' : isWeekend ? '#fafafa' : '#fff',
                borderRight: i < 6 ? '1px solid #f0f0f0' : 'none',
                borderTop: '1px solid #f0f0f0',
                minHeight: cellH,
              }}>
                {dayEvents.map((event: any) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact={false}
                    onClick={() => navigate(`/eventos/${event.id}`)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Monthly view ───────────────────────────────────────────────────────────────
function MonthView({ monthStart, events, navigate }: { monthStart: Dayjs; events: any[]; navigate: (p: string) => void }) {
  const today = dayjs()

  // Build 6-week grid starting from the Sunday before/on month start
  const gridStart = monthStart.startOf('week') // Sunday
  const weeks: Dayjs[][] = Array.from({ length: 6 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => gridStart.add(wi * 7 + di, 'day'))
  )

  function eventsForDay(day: Dayjs) {
    return events.filter((e: any) => {
      if (!e.eventStart || !e.eventEnd) return false
      return day.isBetween(dayjs(e.eventStart), dayjs(e.eventEnd), 'day', '[]')
    })
  }

  return (
    <div>
      {/* Day name header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #e2e8f0' }}>
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: 0.5 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #f0f0f0' }}>
          {week.map((day, di) => {
            const isToday     = day.isSame(today, 'day')
            const isThisMonth = day.month() === monthStart.month()
            const isWeekend   = day.day() === 0 || day.day() === 6
            const dayEvents   = eventsForDay(day)

            return (
              <div key={di} style={{
                minHeight: 100,
                padding: '4px',
                borderRight: di < 6 ? '1px solid #f0f0f0' : 'none',
                background: isToday ? '#f0f4ff' : isWeekend && isThisMonth ? '#fafafa' : '#fff',
              }}>
                {/* Day number */}
                <div style={{ textAlign: 'right', marginBottom: 4 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%',
                    background: isToday ? '#1a73e8' : 'transparent',
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#fff' : !isThisMonth ? '#d1d5db' : isWeekend ? '#9ca3af' : '#374151',
                  }}>
                    {day.date()}
                  </span>
                </div>

                {/* Events */}
                {dayEvents.slice(0, 3).map((event: any) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact
                    onClick={() => navigate(`/eventos/${event.id}`)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 10, color: '#9ca3af', paddingLeft: 4 }}>
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EventsCalendarPage() {
  const navigate = useNavigate()
  const [view, setView]       = useState<'week' | 'month' | 'list'>('month')
  const [anchor, setAnchor]   = useState(dayjs().startOf('month'))
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]   = useState('')

  // Week view starts on Sunday of the week containing anchor
  const weekStart = anchor.startOf('week')

  const dateFrom = view === 'week'
    ? weekStart.toISOString()
    : anchor.startOf('month').subtract(7, 'day').toISOString()   // include prev-month days shown in grid

  const dateTo = view === 'week'
    ? weekStart.add(6, 'day').endOf('day').toISOString()
    : anchor.endOf('month').add(7, 'day').toISOString()

  const { data, isLoading } = useQuery({
    queryKey: ['events', statusFilter, search, view, dateFrom, dateTo],
    queryFn: () => eventsApi.list({
      status: statusFilter || undefined,
      search: search || undefined,
      pageSize: 300,
      from: view !== 'list' ? dateFrom : undefined,
      to:   view !== 'list' ? dateTo   : undefined,
    }),
  })

  const events: any[] = data?.data ?? []

  // Navigation
  const prev = () => setAnchor(a =>
    view === 'week' ? a.subtract(7, 'day') : a.subtract(1, 'month')
  )
  const next = () => setAnchor(a =>
    view === 'week' ? a.add(7, 'day') : a.add(1, 'month')
  )
  const goToday = () => setAnchor(dayjs().startOf('month'))

  // Period label
  const periodLabel = useMemo(() => {
    if (view === 'week') {
      const end = weekStart.add(6, 'day')
      if (weekStart.month() === end.month())
        return `${weekStart.format('D')} – ${end.format('D [de] MMMM [de] YYYY')}`
      return `${weekStart.format('D [de] MMM')} – ${end.format('D [de] MMM, YYYY')}`
    }
    return `${MONTH_NAMES[anchor.month()]} ${anchor.year()}`
  }, [view, anchor, weekStart])

  return (
    <div>
      {/* ── Header ── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Calendario de Eventos</Title>
        <Space wrap>
          {/* View toggle */}
          <Space.Compact>
            {(['week', 'month', 'list'] as const).map(v => (
              <Button
                key={v}
                type={view === v ? 'primary' : 'default'}
                icon={v === 'list' ? <UnorderedListOutlined /> : <CalendarOutlined />}
                onClick={() => setView(v)}
                style={view === v ? { background: '#1a3a5c', borderColor: '#1a3a5c' } : {}}
              >
                {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Lista'}
              </Button>
            ))}
          </Space.Compact>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/eventos/nuevo')}>
            Nuevo Evento
          </Button>
        </Space>
      </Row>

      {/* ── Filters + navigation ── */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input.Search
            placeholder="Buscar evento..."
            onSearch={setSearch}
            allowClear
            style={{ width: 240 }}
          />
          <Select
            placeholder="Estado"
            allowClear
            style={{ width: 160 }}
            onChange={v => setStatusFilter(v ?? '')}
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />

          {view !== 'list' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <Space.Compact>
                <Button size="small" icon={<LeftOutlined />} onClick={prev} />
                <Button size="small" onClick={goToday}>Hoy</Button>
                <Button size="small" icon={<RightOutlined />} onClick={next} />
              </Space.Compact>
              <Text strong style={{ minWidth: 200, textAlign: 'center', color: '#1a3a5c' }}>
                {periodLabel}
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* ── Status legend ── */}
      {view !== 'list' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                background: STATUS_BG[status],
                border: `2px solid ${STATUS_BORDER[status]}`,
              }} />
              <Text style={{ fontSize: 11, color: '#6b7280' }}>{label}</Text>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar ── */}
      {view !== 'list' ? (
        <Card styles={{ body: { padding: 0 } }} loading={isLoading} style={{ borderRadius: 12, overflow: 'hidden' }}>
          {view === 'week' ? (
            <WeekView weekStart={weekStart} events={events} navigate={navigate} />
          ) : (
            <MonthView monthStart={anchor} events={events} navigate={navigate} />
          )}
        </Card>
      ) : (
        <Card loading={isLoading}>
          <List
            dataSource={events}
            locale={{ emptyText: 'Sin eventos' }}
            renderItem={(event: any) => (
              <List.Item
                key={event.id}
                onClick={() => navigate(`/eventos/${event.id}`)}
                style={{ cursor: 'pointer' }}
                actions={[
                  <Tag color={STATUS_BORDER[event.status]}>{STATUS_LABELS[event.status]}</Tag>,
                  <Text type="secondary">{event._count?.orders ?? 0} OS</Text>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: 4, height: 40, borderRadius: 2,
                      background: STATUS_BORDER[event.status] ?? '#1a73e8',
                    }} />
                  }
                  title={
                    <Space>
                      <Text strong style={{ color: '#1a3a5c' }}>{event.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{event.code}</Text>
                    </Space>
                  }
                  description={
                    <Space wrap>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {event.primaryClient?.companyName
                          || `${event.primaryClient?.firstName ?? ''} ${event.primaryClient?.lastName ?? ''}`.trim()
                          || '—'}
                      </Text>
                      {event.eventStart && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(event.eventStart).format('DD/MM/YYYY')} → {dayjs(event.eventEnd).format('DD/MM/YYYY')}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}
