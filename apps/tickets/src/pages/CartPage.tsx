import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Card, Col, Divider, Empty, Row,
  Space, Table, Typography, message,
} from 'antd'
import { ArrowLeftOutlined, ShoppingCartOutlined, UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useCart } from '../store/cart'
import { ticketsApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function CartPage() {
  const navigate = useNavigate()
  const { items, slug, clear, total } = useCart()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Empty description="Tu carrito está vacío" />
          <Button type="primary" style={{ marginTop: 16, borderRadius: 8 }} onClick={() => navigate('/')}>
            Ver eventos
          </Button>
        </div>
      </div>
    )
  }

  const cartTotal = total()

  const columns = [
    {
      title: 'Sección',
      dataIndex: 'sectionName',
      key: 'sectionName',
      render: (name: string, record: typeof items[0]) => (
        <span>{name}{record.seatLabel ? ` — ${record.seatLabel}` : ''}</span>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'center' as const,
    },
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
      render: (_: unknown, record: typeof items[0]) =>
        `$${(record.unitPrice * record.quantity).toLocaleString('es-MX')}`,
    },
  ]

  async function handlePay() {
    if (!user) return
    setLoading(true)
    try {
      const payload = {
        slug,
        buyerName: `${user.firstName} ${user.lastName}`,
        buyerEmail: user.email,
        buyerPhone: user.phone ?? undefined,
        items: items.map(i => ({
          sectionId: i.sectionId,
          seatId: i.seatId,
          quantity: i.quantity,
        })),
      }
      const res = await ticketsApi.createOrder(payload)
      const { checkoutUrl, token: orderToken } = res.data ?? res
      clear()
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        navigate(`/mi-orden/${orderToken}`)
      }
    } catch {
      message.error('Error al crear la orden. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#6B46C1', padding: '12px 24px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          style={{ color: '#fff' }}
          onClick={() => slug ? navigate(`/evento/${slug}`) : navigate('/')}
        >
          Seguir comprando
        </Button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 48px' }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          <ShoppingCartOutlined /> Tu carrito
        </Title>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={15}>
            {/* Items table */}
            <Card
              style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', marginBottom: 24 }}
              bodyStyle={{ padding: 0 }}
            >
              <Table
                dataSource={items}
                columns={columns}
                pagination={false}
                rowKey={r => `${r.sectionId}-${r.seatId || 'x'}`}
                size="middle"
              />
            </Card>

            {/* Buyer info — read-only from auth */}
            <Card
              title="Comprando como"
              style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none' }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Space size={10}>
                  <UserOutlined style={{ color: '#6B46C1' }} />
                  <Text strong>{user?.firstName} {user?.lastName}</Text>
                </Space>
                <Space size={10}>
                  <MailOutlined style={{ color: '#6B46C1' }} />
                  <Text>{user?.email}</Text>
                </Space>
                {user?.phone && (
                  <Space size={10}>
                    <PhoneOutlined style={{ color: '#6B46C1' }} />
                    <Text>{user.phone}</Text>
                  </Space>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Los boletos se enviarán a este correo.{' '}
                  <span
                    style={{ color: '#6B46C1', cursor: 'pointer' }}
                    onClick={() => navigate('/')}
                  >
                    ¿No eres tú? Cambia de cuenta
                  </span>
                </Text>
              </Space>

              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={handlePay}
                style={{ borderRadius: 8, background: '#6B46C1', borderColor: '#6B46C1', marginTop: 24 }}
              >
                Pagar con Stripe
              </Button>
            </Card>
          </Col>

          <Col xs={24} lg={9}>
            <Card
              style={{
                borderRadius: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                border: 'none',
                position: 'sticky',
                top: 24,
              }}
              bodyStyle={{ padding: 24 }}
            >
              <Title level={5} style={{ marginBottom: 16 }}>Resumen</Title>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {items.map((item, idx) => (
                  <Row key={idx} justify="space-between">
                    <Col span={16}>
                      <Text style={{ fontSize: 13 }}>
                        {item.sectionName}{item.seatLabel ? ` – ${item.seatLabel}` : ''} ×{item.quantity}
                      </Text>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 13 }}>
                        ${(item.unitPrice * item.quantity).toLocaleString('es-MX')}
                      </Text>
                    </Col>
                  </Row>
                ))}
              </Space>
              <Divider />
              <Row justify="space-between">
                <Text strong style={{ fontSize: 16 }}>Total</Text>
                <Text strong style={{ fontSize: 20, color: '#6B46C1' }}>
                  ${cartTotal.toLocaleString('es-MX')}
                </Text>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
