import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, Button, Typography, Spin, Empty, Tag, Tooltip } from 'antd'
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'

const { Title, Text } = Typography

const PURPLE = '#531dab'

const STATUS_COLOR: Record<string, string> = {
  QUOTED:     '#1677ff',
  CONFIRMED:  '#52c41a',
  IN_PAYMENT: '#fa8c16',
  PAID:       '#722ed1',
  INVOICED:   '#13c2c2',
}

const STATUS_LABEL: Record<string, string> = {
  QUOTED:     'Cotizada',
  CONFIRMED:  'Confirmada',
  IN_PAYMENT: 'En Pago',
  PAID:       'Pagada',
  INVOICED:   'Facturada',
}

// Stable palette for coloring orders distinctly
const PALETTE = [
  '#4096ff', '#73d13d', '#ffc53d', '#ff7a45', '#9254de',
  '#36cfc9', '#ff4d4f', '#597ef7', '#ff85c2', '#85a5ff',
]

const DAY_WIDTH  = 38  // px per day column
const ROW_HEIGHT = 44  // px per resource row
const NAME_COL   = 180 // px for resource name column

function getDaysInMonth(year: number, month: number) {
  const days = []
  const total = dayjs(`${year}-${month}`).daysInMonth()
  for (let d = 1; d <= total; d++) {
    const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    days.push({ d, weekday: date.day() }) // 0=Sun,6=Sat
  }
  return days
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

export default function CalendarPage() {
  const today = dayjs()
  const [year,  setYear]    = useState(today.year())
  const [month, setMonth]   = useState(today.month() + 1)
  const [eventId, setEventId] = useState<string | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['portal-calendar', eventId, year, month],
    queryFn:  () => ordersApi.calendar({ eventId, year, month }),
  })

  const events    = data?.events    ?? []
  const resources = data?.resources ?? []
  const orders    = data?.orders    ?? []
  const selEventId = eventId ?? data?.selectedEventId

  const days      = useMemo(() => getDaysInMonth(year, month), [year, month])
  const totalDays = days.length

  // Assign a stable color to each order
  const orderColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    orders.forEach((o: any, i: number) => {
      map[o.id] = STATUS_COLOR[o.status] ?? PALETTE[i % PALETTE.length]
    })
    return map
  }, [orders])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // For a resource row, find all orders that reference it and compute bar geometry
  function getBarsForResource(resourceId: string) {
    return orders
      .filter((o: any) => o.resourceIds.includes(resourceId) && o.startDate)
      .map((o: any) => {
        const start = dayjs(o.startDate)
        const end   = dayjs(o.endDate ?? o.startDate)

        const monthStart = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
        const monthEnd   = monthStart.endOf('month')

        const visStart = start.isBefore(monthStart) ? monthStart : start
        const visEnd   = end.isAfter(monthEnd)       ? monthEnd   : end

        const startDay = clamp(visStart.date() - 1, 0, totalDays - 1)
        const endDay   = clamp(visEnd.date() - 1,   0, totalDays - 1)
        const spanDays = endDay - startDay + 1

        return {
          orderId:     o.id,
          orderNumber: o.orderNumber,
          status:      o.status,
          clientName:  o.clientName,
          startDay,
          spanDays,
          color:       orderColorMap[o.id] ?? '#1677ff',
        }
      })
  }

  const gridWidth = totalDays * DAY_WIDTH

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarOutlined style={{ color: PURPLE, fontSize: 22 }} />
          <Title level={4} style={{ margin: 0, color: PURPLE }}>Calendario de Reservas</Title>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Event selector */}
          {events.length > 1 && (
            <Select
              style={{ width: 240 }}
              placeholder="Selecciona un evento"
              value={selEventId}
              onChange={v => setEventId(v)}
              options={events.map((e: any) => ({ value: e.id, label: e.name }))}
            />
          )}

          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f3ff', borderRadius: 8, padding: '4px 12px' }}>
            <Button type="text" size="small" icon={<LeftOutlined />} onClick={prevMonth} />
            <Text strong style={{ minWidth: 130, textAlign: 'center', color: PURPLE }}>
              {dayjs(`${year}-${month}`).format('MMMM YYYY').replace(/^\w/, c => c.toUpperCase())}
            </Text>
            <Button type="text" size="small" icon={<RightOutlined />} onClick={nextMonth} />
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <Tag key={k} color={STATUS_COLOR[k]}>{v}</Tag>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : resources.length === 0 ? (
        <Empty description="No hay reservas para este período" />
      ) : (
        <div style={{
          border: '1px solid #e8e0f7',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(83,29,171,0.07)',
        }}>
          {/* Scrollable grid wrapper */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: NAME_COL + gridWidth, position: 'relative' }}>

              {/* ── Column header: day numbers + names ── */}
              <div style={{ display: 'flex', background: '#f5f3ff', borderBottom: '2px solid #d3aef7', position: 'sticky', top: 0, zIndex: 10 }}>
                {/* Resource name header */}
                <div style={{ width: NAME_COL, minWidth: NAME_COL, padding: '10px 14px', borderRight: '2px solid #d3aef7' }}>
                  <Text strong style={{ color: PURPLE, fontSize: 12 }}>Recurso / Espacio</Text>
                </div>
                {/* Day columns */}
                {days.map(({ d, weekday }) => {
                  const isWeekend = weekday === 0 || weekday === 6
                  const isToday   = year === today.year() && month === today.month() + 1 && d === today.date()
                  return (
                    <div key={d} style={{
                      width: DAY_WIDTH, minWidth: DAY_WIDTH, textAlign: 'center', padding: '6px 0',
                      borderRight: '1px solid #e8e0f7',
                      background: isToday ? '#e9d8fd' : isWeekend ? '#fdf4ff' : 'transparent',
                    }}>
                      <div style={{ fontSize: 10, color: isWeekend ? '#9254de' : '#8c8c8c' }}>
                        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][weekday]}
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: isToday ? 700 : 500,
                        color: isToday ? PURPLE : isWeekend ? '#9254de' : '#262626',
                        lineHeight: 1.4,
                      }}>
                        {d}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Resource rows ── */}
              {resources.map((resource: any, rowIdx: number) => {
                const bars = getBarsForResource(resource.id)
                const isEven = rowIdx % 2 === 0
                return (
                  <div key={resource.id} style={{
                    display: 'flex',
                    borderBottom: '1px solid #f0e6ff',
                    background: isEven ? '#fff' : '#faf7ff',
                    height: ROW_HEIGHT,
                    position: 'relative',
                  }}>
                    {/* Resource name */}
                    <div style={{
                      width: NAME_COL, minWidth: NAME_COL,
                      padding: '0 14px', display: 'flex', alignItems: 'center',
                      borderRight: '2px solid #d3aef7', flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 12, color: '#262626', fontWeight: 500 }} ellipsis title={resource.name}>
                        {resource.name}
                      </Text>
                    </div>

                    {/* Day cells (background grid) */}
                    <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                      {days.map(({ d, weekday }) => {
                        const isWeekend = weekday === 0 || weekday === 6
                        const isToday   = year === today.year() && month === today.month() + 1 && d === today.date()
                        return (
                          <div key={d} style={{
                            width: DAY_WIDTH, minWidth: DAY_WIDTH, height: '100%',
                            borderRight: '1px solid #f0e6ff',
                            background: isToday ? 'rgba(146,84,222,0.08)' : isWeekend ? 'rgba(146,84,222,0.03)' : 'transparent',
                            flexShrink: 0,
                          }} />
                        )
                      })}

                      {/* Booking bars — absolute positioned over the grid */}
                      {bars.map(bar => (
                        <Tooltip
                          key={bar.orderId}
                          title={
                            <div>
                              <div><strong>{bar.orderNumber}</strong></div>
                              <div>{bar.clientName}</div>
                              <div>{STATUS_LABEL[bar.status] ?? bar.status}</div>
                            </div>
                          }
                        >
                          <div style={{
                            position: 'absolute',
                            left:   bar.startDay * DAY_WIDTH + 2,
                            width:  bar.spanDays * DAY_WIDTH - 4,
                            top:    6,
                            height: ROW_HEIGHT - 12,
                            borderRadius: 6,
                            background: bar.color,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 8,
                            paddingRight: 4,
                            cursor: 'default',
                            overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            zIndex: 2,
                          }}>
                            <Text style={{
                              color: '#fff', fontSize: 11, fontWeight: 500,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {bar.clientName || bar.orderNumber}
                            </Text>
                          </div>
                        </Tooltip>
                      ))}
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
