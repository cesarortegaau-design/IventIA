import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Card, Steps, Button, Table, InputNumber, Typography, Space, Tag, App,
  Divider, Statistic, Row, Col, Input, Empty, Spin, Image
} from 'antd'
import { ArrowLeftOutlined, ShoppingCartOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { eventsApi } from '../../api/events'
import { ordersApi } from '../../api/orders'

const { Title, Text } = Typography

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: 'Consumible', EQUIPMENT: 'Equipo', FURNITURE: 'Mobiliario',
  SERVICE: 'Servicio', SPACE: 'Espacio',
}
const TIER_LABELS: Record<string, string> = { EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío' }
const TIER_COLORS: Record<string, string> = { EARLY: 'green', NORMAL: 'blue', LATE: 'orange' }

interface CartItem {
  priceListItemId: string
  resourceId: string
  name: string
  type: string
  unit: string | null
  unitPrice: number
  tier: string
  quantity: number
  observations?: string
}

export default function NewOrderPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [step, setStep] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [orderCreated, setOrderCreated] = useState<any>(null)

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['portal-catalog', eventId],
    queryFn: () => eventsApi.getCatalog(eventId!),
  })

  const catalog = catalogData?.data?.data ?? []

  const createOrderMutation = useMutation({
    mutationFn: () => ordersApi.create(eventId!, {
      items: cart.map((item) => ({
        priceListItemId: item.priceListItemId,
        quantity: item.quantity,
        observations: item.observations,
      })),
      notes,
    }),
    onSuccess: (res) => {
      setOrderCreated(res.data.data)
      setStep(2)
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.error?.message ?? 'Error al crear la solicitud')
    },
  })

  const updateQty = (itemId: string, qty: number, item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.priceListItemId === itemId)
      if (qty <= 0) return prev.filter((c) => c.priceListItemId !== itemId)
      if (existing) return prev.map((c) => c.priceListItemId === itemId ? { ...c, quantity: qty } : c)
      return [...prev, {
        priceListItemId: itemId,
        resourceId: item.resource.id,
        name: item.resource.name,
        type: item.resource.type,
        unit: item.unit ?? item.resource.unit,
        unitPrice: Number(item.unitPrice),
        tier: item.tier,
        quantity: qty,
      }]
    })
  }

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const tax = subtotal * 0.16
  const total = subtotal + tax

  const catalogColumns = [
    { title: '', key: 'img', width: 64, render: (_: any, r: any) => r.resource.imageMain
      ? <Image src={r.resource.imageMain} width={52} height={52} style={{ objectFit: 'cover', borderRadius: 4 }} />
      : <div style={{ width: 52, height: 52, background: '#f5f5f5', borderRadius: 4 }} />
    },
    { title: 'Recurso', key: 'name', render: (_: any, r: any) => (
      <div>
        <div>{r.resource.name}</div>
        {r.resource.portalDesc && <Text type="secondary" style={{ fontSize: 12 }}>{r.resource.portalDesc}</Text>}
      </div>
    )},
    { title: 'Tipo', dataIndex: ['resource', 'type'], render: (v: string) => RESOURCE_TYPE_LABELS[v] ?? v },
    { title: 'Precio', key: 'price', render: (_: any, r: any) => (
      <Space direction="vertical" size={0}>
        <Text strong>${Number(r.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
        <Tag color={TIER_COLORS[r.tier]} style={{ fontSize: 10 }}>{TIER_LABELS[r.tier]}</Tag>
      </Space>
    )},
    { title: 'Cantidad', key: 'qty', render: (_: any, r: any) => {
      const cartItem = cart.find((c) => c.priceListItemId === r.id)
      return (
        <InputNumber
          min={0}
          value={cartItem?.quantity ?? 0}
          onChange={(val) => updateQty(r.id, val ?? 0, r)}
          style={{ width: 80 }}
        />
      )
    }},
  ]

  const cartColumns = [
    { title: 'Recurso', dataIndex: 'name' },
    { title: 'Precio unit.', dataIndex: 'unitPrice', render: (v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Cantidad', dataIndex: 'quantity' },
    { title: 'Total', render: (_: any, r: CartItem) => `$${(r.unitPrice * r.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/events/${eventId}`)}>Evento</Button>
      </Space>

      <Title level={4} style={{ marginBottom: 16 }}>Nueva Solicitud de Productos y Servicios</Title>

      <Steps current={step} size="small" style={{ marginBottom: 24 }} items={[
        { title: 'Seleccionar productos' },
        { title: 'Confirmar' },
        { title: 'Listo' },
      ]} />

      {step === 0 && (
        <>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
          ) : catalog.length === 0 ? (
            <Empty description="No hay productos disponibles en el catálogo" />
          ) : (
            <Table
              dataSource={catalog}
              columns={catalogColumns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          )}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Text>Seleccionados: <strong>{cart.length} ítem(s)</strong></Text>
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                disabled={cart.length === 0}
                onClick={() => setStep(1)}
              >
                Continuar ({cart.length})
              </Button>
            </Space>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Table
            dataSource={cart}
            columns={cartColumns}
            rowKey="priceListItemId"
            size="small"
            pagination={false}
          />
          <Divider />
          <Row justify="end">
            <Col xs={24} sm={12}>
              <Card size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Subtotal:</Text>
                  <Text>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>IVA (16%):</Text>
                  <Text>${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Total:</Text>
                  <Text strong style={{ fontSize: 18 }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                </div>
              </Card>
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <Text>Notas adicionales:</Text>
            <Input.TextArea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, fechas de entrega, etc."
              style={{ marginTop: 8 }}
            />
          </div>
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => setStep(0)}>Volver</Button>
            <Button type="primary" loading={createOrderMutation.isPending} onClick={() => createOrderMutation.mutate()}>
              Confirmar solicitud
            </Button>
          </Space>
        </>
      )}

      {step === 2 && orderCreated && (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
          <Title level={3}>¡Solicitud enviada!</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Tu solicitud <strong>{orderCreated.orderNumber}</strong> ha sido recibida.
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            El equipo del evento la revisará y te notificará sobre el estado.
          </Text>
          <Space>
            <Button onClick={() => navigate('/orders')}>Ver mis solicitudes</Button>
            <Button type="primary" onClick={() => navigate(`/events/${eventId}`)}>Volver al evento</Button>
          </Space>
        </Card>
      )}
    </div>
  )
}
