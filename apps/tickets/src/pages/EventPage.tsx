import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Card, Col, Row, Typography, Space, Spin, InputNumber,
  Divider, Badge, message,
} from 'antd'
import {
  CalendarOutlined, EnvironmentOutlined, ShoppingCartOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { ticketsApi } from '../api/client'
import { useCart } from '../store/cart'
import VenueMapViewer from '../components/VenueMapViewer'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

interface Seat {
  id: string
  label: string
  row: string
  number: number
  available: boolean
}

interface Section {
  id: string
  name: string
  color?: string
  colorHex?: string
  price: number
  available: number
  capacity: number
  sold?: number
  mode: 'SECTION' | 'SEAT'
  seats?: Seat[]
  shapeType?: string
  shapeData?: any
  labelX?: number
  labelY?: number
}

interface EventDetail {
  id: string
  slug: string
  name: string
  imageUrl?: string
  startDate: string
  endDate?: string
  venue?: string
  description?: string
  mapData?: any
  sections: Section[]
}

const PLACEHOLDER = 'https://via.placeholder.com/1200x400/6B46C1/ffffff?text=Evento'

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { items, addItem, setSlug, slug: cartSlug, total } = useCart()

  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['public-event', slug],
    queryFn: () => ticketsApi.getEvent(slug!),
    enabled: !!slug,
  })

  // Map API response to EventDetail interface
  const event: EventDetail | null = eventData?.data ? {
    id: eventData.data.id,
    slug: eventData.data.slug,
    name: eventData.data.event?.name || 'Evento',
    imageUrl: eventData.data.event?.imageUrl,
    startDate: eventData.data.event?.eventStart || '',
    endDate: eventData.data.event?.eventEnd,
    venue: eventData.data.event?.venueLocation,
    description: eventData.data.event?.description,
    mapData: eventData.data.mapData,
    mode: eventData.data.mode,
    sections: (eventData.data.sections || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      colorHex: s.colorHex,
      color: s.colorHex,
      price: Number(s.price) || 0,
      available: (s.capacity || 0) - (s.sold || 0),
      capacity: s.capacity || 0,
      sold: s.sold || 0,
      mode: eventData.data.mode,
      seats: s.seats,
      shapeType: s.shapeType,
      shapeData: s.shapeData,
      labelX: s.labelX,
      labelY: s.labelY,
    })),
  } : null

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selectedSeats, setSelectedSeats] = useState<Record<string, Set<string>>>({})

  function handleAddSection(section: Section) {
    const qty = quantities[section.id] || 1
    if (!slug) return
    if (cartSlug && cartSlug !== slug) {
      message.warning('Tu carrito pertenece a otro evento. Limpia el carrito primero.')
      return
    }
    setSlug(slug)
    addItem({
      sectionId: section.id,
      sectionName: section.name,
      quantity: qty,
      unitPrice: section.price,
    })
    message.success(`${qty} boleto(s) de "${section.name}" agregados`)
  }

  function handleToggleSeat(section: Section, seat: Seat) {
    if (!seat.available) return
    if (!slug) return
    if (cartSlug && cartSlug !== slug) {
      message.warning('Tu carrito pertenece a otro evento.')
      return
    }
    setSlug(slug)
    setSelectedSeats(prev => {
      const current = new Set(prev[section.id] || [])
      if (current.has(seat.id)) {
        current.delete(seat.id)
      } else {
        current.add(seat.id)
        addItem({
          sectionId: section.id,
          sectionName: section.name,
          seatId: seat.id,
          seatLabel: seat.label,
          quantity: 1,
          unitPrice: section.price,
        })
      }
      return { ...prev, [section.id]: current }
    })
  }

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  )

  if (error || !event) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Text type="danger">Evento no encontrado.</Text>
      <br />
      <Button onClick={() => navigate('/')} style={{ marginTop: 16 }}>Volver al inicio</Button>
    </div>
  )

  const cartTotal = total()
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Back */}
      <div style={{ background: '#6B46C1', padding: '12px 24px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          style={{ color: '#fff' }}
          onClick={() => navigate('/')}
        >
          Todos los eventos
        </Button>
      </div>

      {/* Banner */}
      <img
        src={event.imageUrl || PLACEHOLDER}
        alt={event.name}
        style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
        onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
        <Row gutter={[32, 24]}>
          {/* Main content */}
          <Col xs={24} lg={16}>
            <Title level={2} style={{ marginBottom: 8 }}>{event.name}</Title>
            <Space size={16} wrap style={{ marginBottom: 16 }}>
              {event.startDate && (
                <Space size={6}>
                  <CalendarOutlined style={{ color: '#6B46C1' }} />
                  <Text type="secondary">{dayjs(event.startDate).format('DD MMM YYYY, HH:mm')}</Text>
                </Space>
              )}
              {event.venue && (
                <Space size={6}>
                  <EnvironmentOutlined style={{ color: '#6B46C1' }} />
                  <Text type="secondary">{event.venue}</Text>
                </Space>
              )}
            </Space>

            {event.description && (
              <Paragraph style={{ color: '#555', lineHeight: 1.7, marginBottom: 24 }}>
                {event.description}
              </Paragraph>
            )}

            <Divider />
            <Title level={4} style={{ marginBottom: 20 }}>Selecciona tus boletos</Title>

            {event.mapData ? (
              <VenueMapViewer
                sections={event.sections || []}
                mapData={event.mapData}
                onSectionSelect={(section) => {
                  if (event.mapData && !slug) return
                  if (cartSlug && cartSlug !== slug) {
                    message.warning('Tu carrito pertenece a otro evento.')
                    return
                  }
                  setSlug(slug!)
                }}
              />
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {(event.sections || []).map(section => (
                <Card
                  key={section.id}
                  style={{
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: 'none',
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <Row align="middle" justify="space-between" wrap>
                    <Col>
                      <Space size={10}>
                        {section.color && (
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            background: section.color, flexShrink: 0,
                          }} />
                        )}
                        <div>
                          <Text strong style={{ fontSize: 16 }}>{section.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {section.available} de {section.capacity} disponibles
                          </Text>
                        </div>
                      </Space>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 18, color: '#6B46C1' }}>
                        ${section.price.toLocaleString('es-MX')}
                      </Text>
                    </Col>
                  </Row>

                  {section.mode === 'SECTION' && (
                    <Row align="middle" gutter={12} style={{ marginTop: 16 }}>
                      <Col>
                        <InputNumber
                          min={1}
                          max={section.available}
                          value={quantities[section.id] || 1}
                          onChange={v => setQuantities(prev => ({ ...prev, [section.id]: v || 1 }))}
                          style={{ width: 80 }}
                        />
                      </Col>
                      <Col>
                        <Button
                          type="primary"
                          disabled={section.available === 0}
                          onClick={() => handleAddSection(section)}
                        >
                          Agregar al carrito
                        </Button>
                      </Col>
                    </Row>
                  )}

                  {section.mode === 'SEAT' && section.seats && (
                    <div style={{ marginTop: 16 }}>
                      <Space wrap>
                        {section.seats.map(seat => {
                          const isSelected = selectedSeats[section.id]?.has(seat.id)
                          const bg = isSelected ? '#6B46C1' : seat.available ? '#52c41a' : '#ff4d4f'
                          return (
                            <Button
                              key={seat.id}
                              size="small"
                              disabled={!seat.available}
                              onClick={() => handleToggleSeat(section, seat)}
                              style={{
                                background: bg,
                                borderColor: bg,
                                color: '#fff',
                                width: 44,
                                borderRadius: 6,
                                cursor: seat.available ? 'pointer' : 'not-allowed',
                              }}
                            >
                              {seat.label}
                            </Button>
                          )
                        })}
                      </Space>
                      <Space size={16} style={{ marginTop: 10 }}>
                        <Space size={6}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#52c41a' }} /><Text style={{ fontSize: 12 }}>Disponible</Text></Space>
                        <Space size={6}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#6B46C1' }} /><Text style={{ fontSize: 12 }}>Seleccionado</Text></Space>
                        <Space size={6}><div style={{ width: 12, height: 12, borderRadius: 3, background: '#ff4d4f' }} /><Text style={{ fontSize: 12 }}>No disponible</Text></Space>
                      </Space>
                    </div>
                  )}
                </Card>
              ))}
              </Space>
            )}
          </Col>

          {/* Cart sidebar */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 24 }}>
              <Card
                style={{
                  borderRadius: 12,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                  border: 'none',
                }}
                bodyStyle={{ padding: 24 }}
              >
                <Title level={5} style={{ marginBottom: 16 }}>
                  <ShoppingCartOutlined /> Resumen del carrito
                </Title>

                {items.length === 0 ? (
                  <Text type="secondary">Aún no has seleccionado boletos.</Text>
                ) : (
                  <>
                    <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
                      {items.map((item, idx) => (
                        <Row key={idx} justify="space-between">
                          <Col span={16}>
                            <Text style={{ fontSize: 13 }}>
                              {item.sectionName}{item.seatLabel ? ` – ${item.seatLabel}` : ''} ×{item.quantity}
                            </Text>
                          </Col>
                          <Col span={8} style={{ textAlign: 'right' }}>
                            <Text strong style={{ fontSize: 13 }}>
                              ${(item.unitPrice * item.quantity).toLocaleString('es-MX')}
                            </Text>
                          </Col>
                        </Row>
                      ))}
                    </Space>
                    <Divider style={{ margin: '12px 0' }} />
                    <Row justify="space-between" style={{ marginBottom: 20 }}>
                      <Text strong>Total</Text>
                      <Text strong style={{ color: '#6B46C1', fontSize: 18 }}>
                        ${cartTotal.toLocaleString('es-MX')}
                      </Text>
                    </Row>
                    <Badge count={cartCount} offset={[-8, 4]}>
                      <Button
                        type="primary"
                        block
                        size="large"
                        style={{ borderRadius: 8 }}
                        onClick={() => navigate('/carrito')}
                      >
                        Ir al carrito
                      </Button>
                    </Badge>
                  </>
                )}
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}

