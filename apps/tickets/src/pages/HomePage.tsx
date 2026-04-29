import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Button, Typography, Space, Empty, Spin, Tag } from 'antd'
import { CalendarOutlined, EnvironmentOutlined, TagOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ticketsApi } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface EventSummary {
  id: string
  slug: string
  name: string
  imageUrl?: string
  startDate: string
  venue?: string
  minPrice?: number
}

const PLACEHOLDER = 'https://via.placeholder.com/400x200/6B46C1/ffffff?text=Evento'

export default function HomePage() {
  const navigate = useNavigate()
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['public-events'],
    queryFn: ticketsApi.listEvents,
  })

  const events: EventSummary[] = (apiResponse?.data || []).map((te: any) => ({
    id: te.id,
    slug: te.slug,
    name: te.event?.name || 'Evento',
    imageUrl: te.event?.imageUrl,
    startDate: te.event?.eventStart || '',
    venue: te.event?.venueLocation,
    minPrice: te.sections && te.sections.length > 0
      ? Math.min(...te.sections.map((s: any) => Number(s.price) || 0))
      : undefined,
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6B46C1 0%, #553C9A 100%)',
        padding: '24px 32px',
        color: '#fff',
      }}>
        <Space align="center" size={12}>
          <span style={{ fontSize: 28 }}>🎫</span>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>IventIA Boletos</Title>
        </Space>
        <Text style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginTop: 4 }}>
          Compra tus boletos de forma segura
        </Text>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Title level={4} style={{ marginBottom: 24, color: '#333' }}>Eventos disponibles</Title>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <Empty description="No hay eventos disponibles en este momento" style={{ padding: 64 }} />
        )}

        {!isLoading && events.length > 0 && (
          <Row gutter={[24, 24]}>
            {events.map(event => (
              <Col xs={24} sm={12} lg={8} key={event.id}>
                <Card
                  hoverable
                  cover={
                    <img
                      alt={event.name}
                      src={event.imageUrl || PLACEHOLDER}
                      style={{ height: 180, objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                    />
                  }
                  style={{
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    border: 'none',
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <Title level={5} style={{ marginBottom: 12, color: '#1a1a1a' }}>{event.name}</Title>

                  <Space direction="vertical" size={6} style={{ width: '100%', marginBottom: 16 }}>
                    {event.startDate && (
                      <Space size={6}>
                        <CalendarOutlined style={{ color: '#6B46C1' }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {dayjs(event.startDate).format('DD MMM YYYY, HH:mm')}
                        </Text>
                      </Space>
                    )}
                    {event.venue && (
                      <Space size={6}>
                        <EnvironmentOutlined style={{ color: '#6B46C1' }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>{event.venue}</Text>
                      </Space>
                    )}
                    {event.minPrice !== undefined && (
                      <Space size={6}>
                        <TagOutlined style={{ color: '#6B46C1' }} />
                        <Tag color="purple" style={{ margin: 0 }}>
                          Desde ${event.minPrice.toLocaleString('es-MX')}
                        </Tag>
                      </Space>
                    )}
                  </Space>

                  <Button
                    type="primary"
                    block
                    style={{ borderRadius: 8 }}
                    onClick={() => navigate(`/evento/${event.slug}`)}
                  >
                    Ver boletos
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  )
}
