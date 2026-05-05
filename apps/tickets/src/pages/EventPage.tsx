import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button, Typography, Space, Spin,
} from 'antd'
import {
  CalendarOutlined, EnvironmentOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { ticketsApi } from '../api/client'
import VenueMapViewer from '../components/VenueMapViewer'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

interface Section {
  id: string
  name: string
  color?: string
  colorHex?: string
  price: number
  available: number
  capacity: number
  sold?: number
  seats?: any[]
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
  mode: 'SECTION' | 'SEAT'
  sections: Section[]
}

const PLACEHOLDER = 'https://placehold.co/1200x400/6B46C1/ffffff?text=Evento'

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

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
    imageUrl: eventData.data.imageUrl || eventData.data.event?.imageUrl,
    startDate: eventData.data.event?.eventStart || '',
    endDate: eventData.data.event?.eventEnd,
    venue: eventData.data.event?.venueLocation,
    description: eventData.data.description || eventData.data.event?.description,
    mapData: eventData.data.mapData,
    mode: eventData.data.mode ?? 'SECTION',
    sections: (eventData.data.sections || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      colorHex: s.colorHex,
      color: s.colorHex,
      price: Number(s.price) || 0,
      available: (s.capacity || 0) - (s.sold || 0),
      capacity: s.capacity || 0,
      sold: s.sold || 0,
      seats: s.seats,
      shapeType: s.shapeType,
      shapeData: s.shapeData,
      labelX: s.labelX,
      labelY: s.labelY,
    })),
  } : null

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

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Top nav */}
      <div style={{
        background: 'linear-gradient(135deg, #6B46C1 0%, #9b79e3 100%)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52,
        boxShadow: '0 2px 8px rgba(107,70,193,0.25)',
      }}>
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
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

        {/* Back */}
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          size="small"
          style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}
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

      {/* Header info */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 0' }}>
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
          <Paragraph style={{ color: '#555', lineHeight: 1.7, marginBottom: 16 }}>
            {event.description}
          </Paragraph>
        )}
      </div>

      {/* Map / sections — full width */}
      <VenueMapViewer
        sections={event.sections}
        mapData={event.mapData}
        mode={eventData!.data.mode ?? 'SECTION'}
        slug={slug!}
      />
    </div>
  )
}
