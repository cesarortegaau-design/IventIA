import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Input, Select, Button, Row, Col, Card, Tag, Typography, Space,
  Avatar, Empty, Spin,
} from 'antd'
import { PlusOutlined, SearchOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'

const { Title, Text } = Typography

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'QUOTED', label: 'Cotizado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_EXECUTION', label: 'En ejecución' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const STATUS_COLORS: Record<string, string> = {
  QUOTED: '#F97316',
  CONFIRMED: '#7C3AED',
  IN_EXECUTION: '#0D9488',
  CLOSED: '#6B7280',
  CANCELLED: '#DC2626',
}

const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado',
  CONFIRMED: 'Confirmado',
  IN_EXECUTION: 'En ejecución',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

export default function EventsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['planner-events', search, status],
    queryFn: () =>
      eventsApi.list({
        search: search || undefined,
        status: status || undefined,
        pageSize: 100,
      }),
  })

  const events: any[] = data?.data || []

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
          Eventos
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/eventos/nuevo')}
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            border: 'none',
            height: 40,
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Nuevo evento
        </Button>
      </div>

      <Space style={{ marginBottom: 20, width: '100%' }} size={12}>
        <Input
          placeholder="Buscar evento..."
          prefix={<SearchOutlined style={{ color: 'var(--pl-primary)' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300, borderRadius: 10 }}
          allowClear
        />
        <Select
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 200 }}
        />
      </Space>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : events.length === 0 ? (
        <Card
          style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}
        >
          <Empty description="No se encontraron eventos" />
          <Button
            type="primary"
            onClick={() => navigate('/eventos/nuevo')}
            style={{ marginTop: 16 }}
          >
            Crear evento
          </Button>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {events.map((event) => {
            const color = STATUS_COLORS[event.status] || '#7C3AED'
            return (
              <Col xs={24} sm={12} lg={8} key={event.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/eventos/${event.id}`)}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${color}25`,
                    boxShadow: 'var(--pl-shadow)',
                    cursor: 'pointer',
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <Tag
                      style={{
                        background: color + '18',
                        color,
                        border: `1px solid ${color}40`,
                        borderRadius: 20,
                        fontWeight: 600,
                      }}
                    >
                      {STATUS_LABELS[event.status] || event.status}
                    </Tag>
                    <Text style={{ color: 'var(--pl-text-muted)', fontSize: 12 }}>
                      #{event.code}
                    </Text>
                  </div>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>
                    {event.name}
                  </Text>
                  {event.primaryClient && (
                    <Space size={6} style={{ marginBottom: 6 }}>
                      <Avatar
                        size={16}
                        icon={<UserOutlined />}
                        style={{ background: '#7C3AED20', color: '#7C3AED' }}
                      />
                      <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>
                        {event.primaryClient.companyName ||
                          `${event.primaryClient.firstName} ${event.primaryClient.lastName}`}
                      </Text>
                    </Space>
                  )}
                  {event.venueLocation && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: 'var(--pl-text-muted)',
                        display: 'block',
                      }}
                    >
                      {event.venueLocation}
                    </Text>
                  )}
                  {event.eventStart && (
                    <Space size={4} style={{ marginTop: 8 }}>
                      <CalendarOutlined style={{ fontSize: 12, color }} />
                      <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>
                        {dayjs(event.eventStart).format('D MMM YYYY')}
                      </Text>
                    </Space>
                  )}
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}
