import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Table, Typography, Button, Space, Divider, Timeline, Skeleton,
  Modal, Form, Select, Input, Upload, App, Alert,
} from 'antd'
import {
  ArrowLeftOutlined, FileOutlined, DownloadOutlined, CreditCardOutlined,
  BankOutlined, UploadOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_PAYMENT: 'orange', PAID: 'purple', INVOICED: 'cyan', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_PAYMENT: 'En Pago', PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}

const PAYABLE_STATUSES = ['QUOTED', 'CONFIRMED']

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [voucherModalOpen, setVoucherModalOpen] = useState(false)
  const [voucherFile, setVoucherFile] = useState<File | null>(null)
  const [voucherForm] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['portal-order', orderId],
    queryFn: () => ordersApi.get(orderId!),
  })

  const stripeMutation = useMutation({
    mutationFn: () => ordersApi.createStripeCheckout(orderId!),
    onSuccess: (res) => {
      window.location.href = res.data.url
    },
    onError: () => message.error('No se pudo iniciar el pago en línea'),
  })

  const voucherMutation = useMutation({
    mutationFn: (vals: any) =>
      ordersApi.uploadPaymentVoucher(orderId!, voucherFile!, vals.method, vals.reference, vals.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['portal-orders'] })
      setVoucherModalOpen(false)
      voucherForm.resetFields()
      setVoucherFile(null)
      message.success('Comprobante enviado. Contabilidad lo revisará a la brevedad.')
    },
    onError: () => message.error('Error al enviar el comprobante'),
  })

  const order = data?.data?.data

  if (isLoading) return <Skeleton active />
  if (!order) return null

  const isPayable = PAYABLE_STATUSES.includes(order.status)

  const lineColumns = [
    { title: 'Recurso', dataIndex: 'description' },
    { title: 'Tipo', render: (_: any, r: any) => r.resource?.type ?? '—' },
    { title: 'Precio unit.', dataIndex: 'unitPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Cant.', dataIndex: 'quantity', render: (v: number) => Number(v) },
    { title: 'Total', dataIndex: 'lineTotal', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
  ]

  const timelineItems = (order.statusHistory ?? []).map((h: any) => ({
    color: STATUS_COLORS[h.toStatus] ?? 'gray',
    children: (
      <div>
        <Tag color={STATUS_COLORS[h.toStatus]}>{STATUS_LABELS[h.toStatus]}</Tag>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
        {h.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{h.notes}</Text></div>}
      </div>
    ),
  }))

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>Mis Solicitudes</Button>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{order.orderNumber}</Title>
          <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Evento">{order.event?.name}</Descriptions.Item>
          <Descriptions.Item label="Fecha">{dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Subtotal">${Number(order.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Descriptions.Item>
          <Descriptions.Item label="IVA (16%)">${Number(order.taxAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Descriptions.Item>
          <Descriptions.Item label="Total" span={2}>
            <Text strong style={{ fontSize: 16 }}>${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </Descriptions.Item>
          {order.notes && <Descriptions.Item label="Notas" span={2}>{order.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>

      {/* ── Payment section ─────────────────────────────────────────────── */}
      {isPayable && (
        <Card title="Opciones de pago" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button
              type="primary"
              icon={<CreditCardOutlined />}
              size="large"
              loading={stripeMutation.isPending}
              onClick={() => stripeMutation.mutate()}
              style={{ flex: 1, minWidth: 200 }}
            >
              Pagar en línea con tarjeta
            </Button>
            <Button
              icon={<BankOutlined />}
              size="large"
              onClick={() => setVoucherModalOpen(true)}
              style={{ flex: 1, minWidth: 200 }}
            >
              Pagar con transferencia / cheque
            </Button>
          </div>
        </Card>
      )}

      {order.status === 'IN_PAYMENT' && (
        <Alert
          type="info"
          showIcon
          icon={<CheckCircleOutlined />}
          message="Comprobante de pago recibido"
          description="Tu comprobante fue enviado y está en revisión por el equipo de contabilidad. Te notificaremos cuando sea aprobado."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Payment details section */}
      {(order.payments && order.payments.length > 0) && (
        <Card title="Datos de Pago" style={{ marginBottom: 16 }}>
          <div>
            {order.payments.map((payment: any, idx: number) => (
              <div key={idx}>
                {idx > 0 && <Divider />}
                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                  <Descriptions.Item label="Método">
                    <Text strong>{payment.method === 'TRANSFER' ? 'Transferencia' : payment.method === 'CHECK' ? 'Cheque' : payment.method === 'CREDIT_CARD' ? 'Tarjeta de crédito' : payment.method === 'CASH' ? 'Efectivo' : payment.method === 'SWIFT' ? 'Swift' : payment.method}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Fecha">
                    <Text>{dayjs(payment.paymentDate).format('DD/MM/YYYY')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Monto">
                    <Text strong>${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                  </Descriptions.Item>
                  {payment.reference && <Descriptions.Item label="Referencia">{payment.reference}</Descriptions.Item>}
                </Descriptions>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Productos y servicios solicitados"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => exportToCsv(`solicitud-${order.orderNumber}`, (order.lineItems ?? []).map((li: any) => ({
              recurso: li.description,
              tipo: li.resource?.type ?? '',
              precioUnit: Number(li.unitPrice).toFixed(2),
              cantidad: Number(li.quantity),
              total: Number(li.lineTotal).toFixed(2),
            })), [
              { header: 'Recurso', key: 'recurso' },
              { header: 'Tipo', key: 'tipo' },
              { header: 'Precio Unit.', key: 'precioUnit' },
              { header: 'Cantidad', key: 'cantidad' },
              { header: 'Total', key: 'total' },
            ])}
          >
            Exportar CSV
          </Button>
        }
      >
        <Table
          dataSource={order.lineItems ?? []}
          columns={lineColumns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {(order.documents ?? []).length > 0 && (
        <Card title="Documentos" style={{ marginBottom: 16 }}>
          {order.documents.map((doc: any) => (
            <Space key={doc.id} style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <FileOutlined />
                <Text>{doc.fileName}</Text>
                <Tag>{doc.documentType === 'COMPROBANTE_PAGO' ? 'Comprobante de pago' : doc.documentType}</Tag>
              </Space>
              {doc.blobKey && (
                <Button size="small" icon={<DownloadOutlined />} href={doc.blobKey} target="_blank" rel="noopener noreferrer">
                  Descargar
                </Button>
              )}
            </Space>
          ))}
        </Card>
      )}

      {timelineItems.length > 0 && (
        <Card title="Historial de estados">
          <Timeline items={timelineItems} />
        </Card>
      )}

      {/* ── Voucher upload modal ─────────────────────────────────────────── */}
      <Modal
        title="Adjuntar comprobante de pago"
        open={voucherModalOpen}
        onCancel={() => { setVoucherModalOpen(false); voucherForm.resetFields(); setVoucherFile(null) }}
        onOk={() => voucherForm.validateFields().then(voucherMutation.mutate)}
        confirmLoading={voucherMutation.isPending}
        okText="Enviar comprobante"
        width={480}
      >
        <Form form={voucherForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="method" label="Método de pago" rules={[{ required: true, message: 'Selecciona el método' }]}>
            <Select options={[
              { value: 'TRANSFER', label: 'Transferencia bancaria' },
              { value: 'CHECK',    label: 'Cheque' },
              { value: 'CASH',     label: 'Depósito en efectivo' },
            ]} />
          </Form.Item>
          <Form.Item name="reference" label="Referencia / folio de operación (opcional)">
            <Input placeholder="Ej. 123456789" />
          </Form.Item>
          <Form.Item label="Archivo comprobante" required>
            <Upload
              beforeUpload={(file) => { setVoucherFile(file); return false }}
              onRemove={() => setVoucherFile(null)}
              maxCount={1}
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
            </Upload>
            {!voucherFile && <Text type="secondary" style={{ fontSize: 12 }}>PDF, JPG o PNG, máx. 20 MB</Text>}
          </Form.Item>
          <Form.Item name="notes" label="Notas adicionales (opcional)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
