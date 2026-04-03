import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Descriptions, Table, Tag, Button, Space, Timeline, Form,
  Input, InputNumber, Select, DatePicker, Modal, App, Typography, Row, Col, Statistic
} from 'antd'
import { ArrowLeftOutlined, DollarOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_PAYMENT: 'orange',
  PAID: 'purple', INVOICED: 'cyan', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_PAYMENT: 'En Pago',
  PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}
const TIER_LABELS: Record<string, string> = {
  EARLY: 'Anticipado', NORMAL: 'Normal', LATE: 'Tardío',
}
const NEXT_STATUSES: Record<string, string[]> = {
  QUOTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  IN_PAYMENT: [],
  PAID: [],
  INVOICED: [],
  CANCELLED: [],
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()
  const [paymentForm] = Form.useForm()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      message.success('Estado actualizado')
    },
  })

  const paymentMutation = useMutation({
    mutationFn: (values: any) => ordersApi.addPayment(id!, {
      ...values,
      paymentDate: values.paymentDate.toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      setPaymentModalOpen(false)
      paymentForm.resetFields()
      message.success('Pago registrado')
    },
  })

  const order = data?.data

  if (isLoading) return <Card loading />
  if (!order) return null

  const lineColumns = [
    { title: 'Descripción', dataIndex: 'description', key: 'description' },
    { title: 'Precio Unit.', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Cantidad', dataIndex: 'quantity', key: 'quantity', render: (v: number) => Number(v) },
    { title: 'Descuento', dataIndex: 'discountPct', key: 'discountPct', render: (v: number) => `${v}%` },
    { title: 'Total', dataIndex: 'lineTotal', key: 'lineTotal', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Observaciones', dataIndex: 'observations', key: 'observations' },
  ]

  const paymentColumns = [
    { title: 'Fecha', dataIndex: 'paymentDate', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Método', dataIndex: 'method' },
    { title: 'Monto', dataIndex: 'amount', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Referencia', dataIndex: 'reference' },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/eventos/${order.event?.id}`)}>
          {order.event?.name}
        </Button>
      </Space>

      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>{order.orderNumber}</Title>
            <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
            <Tag>{TIER_LABELS[order.pricingTier]}</Tag>
            {order.isCreditNote && <Tag color="red">Nota de Crédito</Tag>}
          </Space>
        }
        extra={
          <Space>
            {NEXT_STATUSES[order.status]?.map((s: string) => (
              <Button
                key={s}
                type={s === 'CANCELLED' ? 'default' : 'primary'}
                danger={s === 'CANCELLED'}
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
            {order.status === 'CONFIRMED' && (
              <Button icon={<DollarOutlined />} onClick={() => setPaymentModalOpen(true)}>
                Registrar Pago
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}><Statistic title="Subtotal" prefix="$" value={Number(order.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
          <Col span={6}><Statistic title="Descuento" prefix="$" value={Number(order.discountAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
          <Col span={6}><Statistic title="IVA" prefix="$" value={Number(order.taxAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
          <Col span={6}><Statistic title="Total" prefix="$" valueStyle={{ color: '#6B46C1', fontWeight: 'bold' }} value={Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Col>
        </Row>

        <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Cliente">
            {order.client?.companyName || `${order.client?.firstName} ${order.client?.lastName}`}
          </Descriptions.Item>
          <Descriptions.Item label="Cliente Facturación">
            {order.billingClient?.companyName || order.billingClient?.rfc || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Stand">{order.stand?.code || '—'}</Descriptions.Item>
          <Descriptions.Item label="Lista de Precios">{order.priceList?.name}</Descriptions.Item>
          <Descriptions.Item label="Pagado">
            ${Number(order.paidAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="Saldo">
            ${(Number(order.total) - Number(order.paidAmount)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>Productos y Servicios</Title>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => exportToCsv(`orden-${order.orderNumber}-partidas`, (order.lineItems ?? []).map((li: any) => ({
              descripcion: li.description,
              precioUnit: Number(li.unitPrice).toFixed(2),
              cantidad: Number(li.quantity),
              descuento: `${li.discountPct}%`,
              total: Number(li.lineTotal).toFixed(2),
            })), [
              { header: 'Descripción', key: 'descripcion' },
              { header: 'Precio Unit.', key: 'precioUnit' },
              { header: 'Cantidad', key: 'cantidad' },
              { header: 'Descuento', key: 'descuento' },
              { header: 'Total', key: 'total' },
            ])}
          >
            Exportar CSV
          </Button>
        </div>
        <Table
          dataSource={order.lineItems}
          columns={lineColumns}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
        />

        <Title level={5}>Pagos ({order.payments?.length ?? 0})</Title>
        <Table
          dataSource={order.payments}
          columns={paymentColumns}
          rowKey="id"
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
        />

        <Title level={5}>Historial de Estatus</Title>
        <Timeline
          items={order.statusHistory?.map((h: any) => ({
            color: STATUS_COLORS[h.toStatus] || 'blue',
            children: (
              <div>
                <Text strong>{STATUS_LABELS[h.toStatus]}</Text>
                {h.fromStatus && <Text type="secondary"> (desde {STATUS_LABELS[h.fromStatus]})</Text>}
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {h.changedBy?.firstName} {h.changedBy?.lastName} — {dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}
                </Text>
                {h.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{h.notes}</Text></div>}
              </div>
            ),
          }))}
        />
      </Card>

      <Modal
        title="Registrar Pago"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={paymentMutation.isPending}
      >
        <Form form={paymentForm} layout="vertical" onFinish={paymentMutation.mutate}>
          <Form.Item name="method" label="Método de Pago" rules={[{ required: true }]}>
            <Select options={[
              { value: 'CASH', label: 'Efectivo' },
              { value: 'TRANSFER', label: 'Transferencia' },
              { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
              { value: 'CHECK', label: 'Cheque' },
              { value: 'SWIFT', label: 'Swift' },
            ]} />
          </Form.Item>
          <Form.Item name="amount" label="Monto" rules={[{ required: true }]}>
            <InputNumber
              prefix="$"
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              min={0}
            />
          </Form.Item>
          <Form.Item name="paymentDate" label="Fecha" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="reference" label="Referencia">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

