import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Button, Card, Col, Divider, Empty, Row, Space, Spin, Tag, Typography, message,
} from 'antd'
import {
  CalendarOutlined, EnvironmentOutlined, DownloadOutlined,
  LogoutOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { myTicketsApi } from '../api/myTickets'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

const STATUS_COLOR: Record<string, string> = {
  PAID: 'green', PENDING: 'orange', CANCELLED: 'red', REFUNDED: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado', PENDING: 'Pendiente', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado',
}

async function downloadPdf(token: string, eventName: string) {
  try {
    const res = await myTicketsApi.downloadPdf(token)
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `boleto-${eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    message.error('Error al descargar el boleto')
  }
}

export default function MyTicketsPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-ticket-orders'],
    queryFn: () => myTicketsApi.listOrders(),
  })

  const orders: any[] = data?.data?.data ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#6B46C1', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: '#fff' }} onClick={() => navigate('/')}>
          Inicio
        </Button>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Mis Boletos</div>
        <Button
          icon={<LogoutOutlined />}
          type="text"
          style={{ color: '#fff' }}
          onClick={() => { clearAuth(); navigate('/login') }}
        >
          Salir
        </Button>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 48px' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ marginBottom: 4 }}>Hola, {user?.firstName} 👋</Title>
          <Text type="secondary">Aquí están tus boletos adquiridos</Text>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : orders.length === 0 ? (
          <Card style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Empty
              description={<span>Aún no tienes boletos. <br /><Text type="secondary">Tus compras aparecerán aquí una vez confirmadas.</Text></span>}
            />
          </Card>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {orders.map((order: any) => {
              const event = order.ticketEvent?.event
              const imageUrl = order.ticketEvent?.imageUrl

              return (
                <Card
                  key={order.id}
                  style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}
                  bodyStyle={{ padding: 0 }}
                >
                  {imageUrl && (
                    <div style={{ height: 120, overflow: 'hidden' }}>
                      <img src={imageUrl} alt={event?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ padding: '20px 24px' }}>
                    <Row justify="space-between" align="top" wrap>
                      <Col>
                        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                          {event?.name ?? 'Evento'}
                        </div>
                        <Space direction="vertical" size={2}>
                          {event?.eventStart && (
                            <Space size={6}>
                              <CalendarOutlined style={{ color: '#6B46C1' }} />
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {dayjs(event.eventStart).format('DD MMM YYYY, HH:mm')}
                              </Text>
                            </Space>
                          )}
                          {event?.venueLocation && (
                            <Space size={6}>
                              <EnvironmentOutlined style={{ color: '#6B46C1' }} />
                              <Text type="secondary" style={{ fontSize: 13 }}>{event.venueLocation}</Text>
                            </Space>
                          )}
                        </Space>
                      </Col>
                      <Col>
                        <Tag color={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status] ?? order.status}</Tag>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* Items */}
                    <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 16 }}>
                      {order.items?.map((item: any, i: number) => (
                        <Row key={i} justify="space-between">
                          <Text style={{ fontSize: 13, color: '#555' }}>
                            {item.section?.name}
                            {item.seat ? ` — Asiento ${item.seat.row}${item.seat.number}` : ''}
                            {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                          </Text>
                          <Text style={{ fontSize: 13 }}>
                            ${Number(item.lineTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Text>
                        </Row>
                      ))}
                      <Row justify="space-between" style={{ marginTop: 8 }}>
                        <Text strong style={{ fontSize: 15 }}>Total</Text>
                        <Text strong style={{ fontSize: 17, color: '#6B46C1' }}>
                          ${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Text>
                      </Row>
                    </Space>

                    {/* Actions */}
                    <Space wrap>
                      {order.status === 'PAID' && (
                        <Button
                          icon={<DownloadOutlined />}
                          type="primary"
                          loading={downloading === order.token}
                          style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8 }}
                          onClick={async () => {
                            setDownloading(order.token)
                            await downloadPdf(order.token, event?.name ?? 'boleto')
                            setDownloading(null)
                          }}
                        >
                          Descargar boleto PDF
                        </Button>
                      )}
                      <Button
                        onClick={() => navigate(`/mi-orden/${order.token}`)}
                        style={{ borderRadius: 8, borderColor: '#d3adf7', color: '#6B46C1' }}
                      >
                        Ver detalle
                      </Button>
                    </Space>
                  </div>
                </Card>
              )
            })}
          </Space>
        )}
      </div>
    </div>
  )
}
