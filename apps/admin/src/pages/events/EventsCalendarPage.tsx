import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Badge, Card, Button, Row, Col, Select, Input, Space, Tag, List, Typography } from 'antd'
import { PlusOutlined, UnorderedListOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { eventsApi } from '../../api/events'

const { Title } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue',
  CONFIRMED: 'green',
  IN_EXECUTION: 'orange',
  CLOSED: 'default',
  CANCELLED: 'red',
}

const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado',
  CONFIRMED: 'Confirmado',
  IN_EXECUTION: 'En Ejecución',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

export default function EventsCalendarPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [filters, setFilters] = useState({ status: '', search: '', from: '', to: '' })
  const [currentDate, setCurrentDate] = useState(dayjs())

  const calendarMonth = currentDate.format('YYYY-MM')

  const { data, isLoading } = useQuery({
    queryKey: ['events', filters, view, calendarMonth],
    queryFn: () => eventsApi.list({
      ...filters,
      pageSize: 200,
      ...(view === 'calendar' ? {
        from: currentDate.startOf('month').toISOString(),
        to: currentDate.endOf('month').toISOString(),
      } : {}),
    }),
  })

  const events = data?.data ?? []

  function getEventsForDate(date: Dayjs) {
    return events.filter((e: any) => {
      const start = dayjs(e.eventStart)
      const end = dayjs(e.eventEnd)
      return date.isBetween(start, end, 'day', '[]')
    })
  }

  function dateCellRender(value: Dayjs) {
    const dayEvents = getEventsForDate(value)
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayEvents.slice(0, 3).map((event: any) => (
          <li key={event.id} onClick={(e) => { e.stopPropagation(); navigate(`/eventos/${event.id}`) }}>
            <Badge
              color={STATUS_COLORS[event.status] || 'blue'}
              text={<span style={{ fontSize: 11, cursor: 'pointer' }}>{event.code} {event.name}</span>}
            />
          </li>
        ))}
        {dayEvents.length > 3 && <li><Badge color="grey" text={`+${dayEvents.length - 3} más`} /></li>}
      </ul>
    )
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Calendario de Eventos</Title>
        </Col>
        <Col>
          <Space>
            <Button.Group>
              <Button
                icon={<CalendarOutlined />}
                type={view === 'calendar' ? 'primary' : 'default'}
                onClick={() => setView('calendar')}
              />
              <Button
                icon={<UnorderedListOutlined />}
                type={view === 'list' ? 'primary' : 'default'}
                onClick={() => setView('list')}
              />
            </Button.Group>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/eventos/nuevo')}>
              Nuevo Evento
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input.Search
              placeholder="Buscar evento..."
              onSearch={(v) => setFilters(f => ({ ...f, search: v }))}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Estado"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => setFilters(f => ({ ...f, status: v ?? '' }))}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Col>
        </Row>
      </Card>

      {view === 'calendar' ? (
        <Card>
          <Calendar
            onPanelChange={(date) => setCurrentDate(date)}
            cellRender={(date) => dateCellRender(date)}
          />
        </Card>
      ) : (
        <Card loading={isLoading}>
          <List
            dataSource={events}
            renderItem={(event: any) => (
              <List.Item
                key={event.id}
                onClick={() => navigate(`/eventos/${event.id}`)}
                style={{ cursor: 'pointer' }}
                actions={[
                  <Tag color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Tag>,
                  <span>{event._count?.orders ?? 0} órdenes</span>,
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ color: '#6B46C1' }}>{event.code} — {event.name}</span>}
                  description={
                    <Space>
                      <span>{event.primaryClient?.companyName || `${event.primaryClient?.firstName} ${event.primaryClient?.lastName}`}</span>
                      {event.eventStart && <span>{dayjs(event.eventStart).format('DD/MM/YYYY')} - {dayjs(event.eventEnd).format('DD/MM/YYYY')}</span>}
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
