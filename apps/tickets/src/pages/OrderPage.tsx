import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Badge, Button, Card, Col, Divider, Row, Space,
  Spin, Table, Tag, Typography,
} from 'antd'
import {
  CalendarOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, WhatsAppOutlined,
} from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import { ticketsApi } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text } = Typography

type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED'

interface OrderItem {
  id: string
  sectionName: string
  seatLabel?: string
  quantity: number
  unitPrice: number
}

interface OrderDetail {
  token: string
  status: OrderStatus
  createdAt: string
  buyer: { name: string; email: string; phone?: string }
  event: { name: string; startDate: string; venue?: string }
  items: OrderItem[]
  total: number
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: 'blue',
  PAID: 'green',
  CANCELLED: 'red',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
}

const columns = [
  {
    title: 'Sección / Asiento',
    key: 'section',
    render: (_: unknown, r: OrderItem) => `${r.sectionName}${r.seatLabel ? ` – ${r.seatLabel}` : ''}`,
  },
  { title: 'Cantidad', dataIndex: 'quantity', key: 'quantity', width: 90, align: 'center' as const },
  {
    title: 'Precio unit.',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 120,
    align: 'right' as const,
    render: (v: number) => `$${v.toLocaleString('es-MX')}`,
  },
  {
    title: 'Subtotal',
    key: 'subtotal',
    width: 120,
    align: 'right' as const,
    render: (_: unknown, r: OrderItem) => `$${(r.unitPrice * r.quantity).toLocaleString('es-MX')}`,
  },
]

export default function OrderPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['public-order', token],
    queryFn: async () => {
      const res = await ticketsApi.getOrder(token!)
      const raw = res.data ?? res
      return {
        token: raw.token,
        status: raw.status,
        createdAt: raw.createdAt,
        total: Number(raw.total),
        buyer: { name: raw.buyerName, email: raw.buyerEmail, phone: raw.buyerPhone },
        event: {
          name: raw.ticketEvent?.event?.name ?? '',
          startDate: raw.ticketEvent?.event?.eventStart ?? '',
          venue: raw.ticketEvent?.event?.venueLocation,
        },
        items: (raw.items ?? []).map((i: any) => ({
          id: i.id,
          sectionName: i.section?.name ?? '',
          seatLabel: i.seat ? `${i.seat.row}${i.seat.number}` : undefined,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
      }
    },
    enabled: !!token,
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  if (error || !order) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Text type="danger">Orden no encontrada.</Text>
      <br />
      <Button onClick={() => navigate('/')} style={{ marginTop: 16 }}>Volver al inicio</Button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#6B46C1', padding: '12px 24px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          style={{ color: '#fff' }}
          onClick={() => navigate('/')}
        >
          Inicio
        </Button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 48px' }}>
        {/* Order header */}
        <Card
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', marginBottom: 24 }}
          bodyStyle={{ padding: 24 }}
        >
          <Row justify="space-between" align="top" wrap>
            <Col>
              <Title level={4} style={{ marginBottom: 4 }}>{order.event.name}</Title>
              <Space direction="vertical" size={4}>
                <Space size={6}>
                  <CalendarOutlined style={{ color: '#6B46C1' }} />
                  <Text type="secondary">{dayjs(order.event.startDate).format('DD MMM YYYY, HH:mm')}</Text>
                </Space>
                {order.event.venue && (
                  <Space size={6}>
                    <EnvironmentOutlined style={{ color: '#6B46C1' }} />
                    <Text type="secondary">{order.event.venue}</Text>
                  </Space>
                )}
              </Space>
            </Col>
            <Col>
              <Badge.Ribbon text={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]}>
                <Tag color={STATUS_COLOR[order.status]} style={{ fontSize: 14, padding: '4px 12px', borderRadius: 8 }}>
                  {STATUS_LABEL[order.status]}
                </Tag>
              </Badge.Ribbon>
            </Col>
          </Row>

          <Divider />

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>COMPRADOR</Text>
              <br />
              <Text strong>{order.buyer.name}</Text>
              <br />
              <Text type="secondary">{order.buyer.email}</Text>
              {order.buyer.phone && <><br /><Text type="secondary">{order.buyer.phone}</Text></>}
            </Col>
            <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>ORDEN</Text>
              <br />
              <Text code style={{ fontSize: 12 }}>{order.token}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Items */}
        <Card
          title="Boletos"
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', marginBottom: 24 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table
            dataSource={order.items}
            columns={columns}
            pagination={false}
            rowKey="id"
            size="middle"
            footer={() => (
              <Row justify="end" style={{ padding: '8px 16px' }}>
                <Space size={24}>
                  <Text strong style={{ fontSize: 16 }}>Total</Text>
                  <Text strong style={{ fontSize: 22, color: '#6B46C1' }}>
                    ${order.total.toLocaleString('es-MX')}
                  </Text>
                </Space>
              </Row>
            )}
          />
        </Card>

        {/* QR + share for PAID orders */}
        {order.status === 'PAID' && (
          <Card
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', textAlign: 'center' }}
            bodyStyle={{ padding: 32 }}
          >
            <div style={{ marginBottom: 8, fontSize: 14, color: '#555', fontWeight: 600 }}>
              Tu boleto electrónico
            </div>
            <div style={{
              display: 'inline-block',
              background: '#fff',
              border: '3px solid #6B46C1',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 4px 12px rgba(107,70,193,0.15)',
              marginBottom: 12,
            }}>
              <QRCodeSVG
                value={`${window.location.origin}/mi-orden/${order.token}`}
                size={180}
                level="H"
                fgColor="#1a1a2e"
                bgColor="#ffffff"
              />
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
              Presenta este código en el acceso al evento
            </div>
            <Button
              icon={<WhatsAppOutlined />}
              size="large"
              onClick={() => {
                const url = `${window.location.origin}/mi-orden/${order.token}`
                const text = `Mis boletos para ${order.event.name} 🎟️ ${url}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
              style={{
                background: '#25D366', borderColor: '#25D366', color: '#fff',
                borderRadius: 10, height: 44, fontWeight: 600,
              }}
            >
              Compartir por WhatsApp
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
