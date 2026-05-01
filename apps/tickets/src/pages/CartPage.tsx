import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Card, Col, Divider, Empty, Form, Input, Row,
  Space, Table, Typography, message,
} from 'antd'
import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { useCart } from '../store/cart'
import { ticketsApi } from '../api/client'

const { Title, Text } = Typography

interface BuyerForm {
  name: string
  email: string
  phone?: string
}

export default function CartPage() {
  const navigate = useNavigate()
  const { items, slug, clear, total } = useCart()
  const [form] = Form.useForm<BuyerForm>()
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

  async function handlePay(values: BuyerForm) {
    setLoading(true)
    try {
      const payload = {
        slug,
        buyerName: values.name,
        buyerEmail: values.email,
        buyerPhone: values.phone,
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

            {/* Buyer form */}
            <Card
              title="Datos del comprador"
              style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none' }}
            >
              <Form form={form} layout="vertical" onFinish={handlePay}>
                <Form.Item
                  name="name"
                  label="Nombre completo"
                  rules={[{ required: true, message: 'Ingresa tu nombre' }]}
                >
                  <Input placeholder="Juan Pérez" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Correo electrónico"
                  rules={[
                    { required: true, message: 'Ingresa tu correo' },
                    { type: 'email', message: 'Correo inválido' },
                  ]}
                >
                  <Input placeholder="juan@correo.com" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="phone" label="Teléfono (opcional)">
                  <Input placeholder="+52 33 1234 5678" size="large" style={{ borderRadius: 8 }} />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  style={{ borderRadius: 8, background: '#6B46C1', borderColor: '#6B46C1' }}
                >
                  Pagar con Stripe
                </Button>
              </Form>
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
