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

  const events: EventSummary[] = (apiResponse?.data || []).map((te: any) => {
    const minPrice = te.sections && te.sections.length > 0
      ? Math.min(...te.sections.map((s: any) => Number(s.price) || 0))
      : undefined
    return {
      id: te.id,
      slug: te.slug,
      name: te.event?.name || 'Evento',
      imageUrl: te.imageUrl || te.event?.imageUrl,
      startDate: te.event?.eventStart || '',
      venue: te.event?.venueLocation,
      minPrice: minPrice > 0 ? minPrice : undefined,
    }
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6B46C1 0%, #9b79e3 100%)',
        padding: '0 28px',
        height: 52,
        display: 'flex', alignItems: 'center',
        boxShadow: '0 2px 8px rgba(107,70,193,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 800,
          }}>I</div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>IventIA</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 400 }}>Boletos</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #f4eeff 0%, #faf8ff 100%)',
        padding: '32px 28px 24px',
        borderBottom: '1px solid #ede9fe',
      }}>
        <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>
          <span style={{ fontSize: 22 }}>🎫</span> Compra tus boletos
        </Title>
        <Text style={{ color: '#666', fontSize: 14 }}>
          Selecciona un evento para ver disponibilidad y precios
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
