import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Card, Col, Divider, Empty, Form, Input,
  Row, Space, Table, Typography, message, Radio,
} from 'antd'
import {
  ArrowLeftOutlined, ShoppingCartOutlined,
  UserOutlined, MailOutlined, PhoneOutlined, TagOutlined,
} from '@ant-design/icons'
import { useCart } from '../store/cart'
import { ticketsApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

interface AttendeeData {
  firstName: string
  paternalLastName: string
  maternalLastName?: string
  phone?: string
  email: string
}

export default function CartPage() {
  const navigate = useNavigate()
  const { items, slug, mode, clear, total } = useCart()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'CODE'>('STRIPE')
  const [accessCode, setAccessCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [attendees, setAttendees] = useState<Record<string, Partial<AttendeeData>>>({})
  const [attendeeErrors, setAttendeeErrors] = useState<Record<string, string>>({})

  const isRegistro = mode === 'REGISTRO'
  const cartTotal = total()
  const isFree = cartTotal === 0

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Empty description="Tu carrito está vacío" />
          <Button type="primary" style={{ marginTop: 16, borderRadius: 8 }} onClick={() => navigate('/')}>Ver eventos</Button>
        </div>
      </div>
    )
  }

  const setAttendee = (key: string, field: keyof AttendeeData, value: string) => {
    setAttendees(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
    setAttendeeErrors(prev => { const n = { ...prev }; delete n[`${key}-${field}`]; return n })
  }

  const validateAttendees = () => {
    const errors: Record<string, string> = {}
    for (const item of items) {
      const key = item.seatId ?? item.sectionId
      const att = attendees[key] ?? {}
      if (!att.firstName?.trim()) errors[`${key}-firstName`] = 'Requerido'
      if (!att.paternalLastName?.trim()) errors[`${key}-paternalLastName`] = 'Requerido'
      if (!att.email?.trim() || !/\S+@\S+\.\S+/.test(att.email)) errors[`${key}-email`] = 'Email inválido'
    }
    setAttendeeErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handlePay() {
    if (!user) return
    if (isRegistro && !validateAttendees()) {
      message.error('Completa los datos de todos los asistentes')
      return
    }
    const method = isFree ? 'FREE' : paymentMethod
    if (method === 'CODE' && !accessCode.trim()) {
      setCodeError('Ingresa un código de acceso')
      return
    }
    setLoading(true)
    try {
      const payload: any = {
        slug,
        buyerName: `${user.firstName} ${user.lastName}`,
        buyerEmail: user.email,
        buyerPhone: user.phone ?? undefined,
        items: items.map(i => ({
          sectionId: i.sectionId,
          seatId: i.seatId?.startsWith('registro-') ? undefined : i.seatId,
          quantity: i.quantity,
          ...(isRegistro ? { attendee: attendees[i.seatId ?? i.sectionId] ?? {} } : {}),
        })),
      }
      if (method !== 'STRIPE') {
        payload.paymentMethod = method
        if (method === 'CODE') payload.accessCode = accessCode.trim().toUpperCase()
      }
      const res = await ticketsApi.createOrder(payload)
      const data = res.data ?? res
      clear()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        navigate(`/mi-orden/${data.token}`)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Error al crear la orden. Intenta de nuevo.'
      if (method === 'CODE') setCodeError(msg)
      else message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Sección',
      dataIndex: 'sectionName',
      key: 'sectionName',
      render: (name: string, record: typeof items[0]) => (
        <span>{name}{record.seatLabel ? ` — ${record.seatLabel}` : ''}</span>
      ),
    },
    { title: 'Cantidad', dataIndex: 'quantity', key: 'quantity', width: 90, align: 'center' as const },
    {
      title: 'Precio unit.',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right' as const,
      render: (v: number) => v === 0 ? 'Gratis' : `$${v.toLocaleString('es-MX')}`,
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, record: typeof items[0]) =>
        record.unitPrice === 0 ? 'Gratis' : `$${(record.unitPrice * record.quantity).toLocaleString('es-MX')}`,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      <div style={{ background: '#6B46C1', padding: '12px 24px' }}>
        <Button icon={<ArrowLeftOutlined />} type="text" style={{ color: '#fff' }}
          onClick={() => slug ? navigate(`/evento/${slug}`) : navigate('/')}>
          Seguir comprando
        </Button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 48px' }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          <ShoppingCartOutlined /> Tu carrito
        </Title>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={15}>
            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', marginBottom: 24 }}
              bodyStyle={{ padding: 0 }}>
              <Table dataSource={items} columns={columns} pagination={false}
                rowKey={r => r.seatId ?? r.sectionId} size="middle" />
            </Card>

            {isRegistro && (
              <Card
                title={`Datos de asistentes (${items.length} ${items.length === 1 ? 'boleto' : 'boletos'})`}
                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', marginBottom: 24 }}
              >
                {items.map((item, idx) => {
                  const key = item.seatId ?? item.sectionId
                  const att = attendees[key] ?? {}
                  const fe = (f: string) => attendeeErrors[`${key}-${f}`]
                  return (
                    <div key={key} style={{ marginBottom: idx < items.length - 1 ? 24 : 0 }}>
                      <div style={{ fontWeight: 600, color: '#6B46C1', marginBottom: 12 }}>
                        Boleto {idx + 1} — {item.sectionName}
                      </div>
                      <Row gutter={12}>
                        <Col xs={24} sm={12}>
                          <Form.Item validateStatus={fe('firstName') ? 'error' : ''} help={fe('firstName')} style={{ marginBottom: 12 }}>
                            <Input placeholder="Nombre *" value={att.firstName ?? ''}
                              onChange={e => setAttendee(key, 'firstName', e.target.value)} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item validateStatus={fe('paternalLastName') ? 'error' : ''} help={fe('paternalLastName')} style={{ marginBottom: 12 }}>
                            <Input placeholder="Apellido paterno *" value={att.paternalLastName ?? ''}
                              onChange={e => setAttendee(key, 'paternalLastName', e.target.value)} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item style={{ marginBottom: 12 }}>
                            <Input placeholder="Apellido materno" value={att.maternalLastName ?? ''}
                              onChange={e => setAttendee(key, 'maternalLastName', e.target.value)} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item style={{ marginBottom: 12 }}>
                            <Input placeholder="Teléfono" value={att.phone ?? ''}
                              onChange={e => setAttendee(key, 'phone', e.target.value)} />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item validateStatus={fe('email') ? 'error' : ''} help={fe('email')} style={{ marginBottom: 0 }}>
                            <Input type="email" placeholder="Email *" value={att.email ?? ''}
                              onChange={e => setAttendee(key, 'email', e.target.value)} />
                          </Form.Item>
                        </Col>
                      </Row>
                      {idx < items.length - 1 && <Divider style={{ margin: '16px 0 0' }} />}
                    </div>
                  )
                })}
              </Card>
            )}

            <Card title="Comprando como"
              style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none' }}>
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
              </Space>

              {!isFree && (
                <div style={{ marginTop: 20 }}>
                  <Text strong style={{ display: 'block', marginBottom: 12 }}>Método de pago</Text>
                  <Radio.Group value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setCodeError('') }}>
                    <Space direction="vertical">
                      <Radio value="STRIPE">Tarjeta de crédito/débito (Stripe)</Radio>
                      <Radio value="CODE"><TagOutlined /> Código de acceso</Radio>
                    </Space>
                  </Radio.Group>
                  {paymentMethod === 'CODE' && (
                    <div style={{ marginTop: 12 }}>
                      <Input
                        placeholder="Ingresa tu código"
                        value={accessCode}
                        onChange={e => { setAccessCode(e.target.value.toUpperCase()); setCodeError('') }}
                        style={{ fontFamily: 'monospace', maxWidth: 240 }}
                        status={codeError ? 'error' : ''}
                      />
                      {codeError && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{codeError}</div>}
                    </div>
                  )}
                </div>
              )}

              {isFree && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                  <Text style={{ color: '#52c41a', fontWeight: 600 }}>Registro gratuito</Text>
                </div>
              )}

              <Button type="primary" size="large" block loading={loading} onClick={handlePay}
                style={{ borderRadius: 8, background: '#6B46C1', borderColor: '#6B46C1', marginTop: 20 }}>
                {isFree ? 'Completar registro' : paymentMethod === 'CODE' ? 'Canjear código' : 'Pagar con Stripe'}
              </Button>
            </Card>
          </Col>

          <Col xs={24} lg={9}>
            <Card style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.10)', border: 'none', position: 'sticky', top: 24 }}
              bodyStyle={{ padding: 24 }}>
              <Title level={5} style={{ marginBottom: 16 }}>Resumen</Title>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {items.map((item, idx) => (
                  <Row key={idx} justify="space-between">
                    <Col span={16}>
                      <Text style={{ fontSize: 13 }}>
                        {item.sectionName}{item.seatLabel ? ` – ${item.seatLabel}` : ''} x{item.quantity}
                      </Text>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 13 }}>
                        {item.unitPrice === 0 ? 'Gratis' : `$${(item.unitPrice * item.quantity).toLocaleString('es-MX')}`}
                      </Text>
                    </Col>
                  </Row>
                ))}
              </Space>
              <Divider />
              <Row justify="space-between">
                <Text strong style={{ fontSize: 16 }}>Total</Text>
                <Text strong style={{ fontSize: 20, color: '#6B46C1' }}>
                  {cartTotal === 0 ? 'Gratis' : `$${cartTotal.toLocaleString('es-MX')}`}
                </Text>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
