import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Space, Row, Col, App, Typography, Tag, Table, Divider, Timeline, Modal, Form, Input, Descriptions } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'

const { Title } = Typography

const PO_STATUSES = {
  DRAFT: { label: 'Borrador', color: 'default' },
  CONFIRMED: { label: 'Confirmado', color: 'blue' },
  PARTIALLY_RECEIVED: { label: 'Recibido Parcial', color: 'orange' },
  RECEIVED: { label: 'Recibido', color: 'green' },
  INVOICED: { label: 'Facturado', color: 'purple' },
  CANCELLED: { label: 'Cancelado', color: 'red' },
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: () => (id ? purchaseOrdersApi.get(id).then(r => r.data) : Promise.resolve(null)),
  })

  const confirmMutation = useMutation({
    mutationFn: (notes?: string) => {
      if (!id) throw new Error('No PO ID')
      return purchaseOrdersApi.confirm(id, notes).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', id] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      setConfirmModalOpen(false)
      form.resetFields()
      message.success('Orden de Compra confirmada')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al confirmar')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (notes?: string) => {
      if (!id) throw new Error('No PO ID')
      return purchaseOrdersApi.cancel(id, notes).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', id] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      message.success('Orden de Compra cancelada')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al cancelar')
    },
  })

  if (isLoading) return <div>Cargando...</div>
  if (!poData) return <div>No encontrado</div>

  const status = PO_STATUSES[poData.status as keyof typeof PO_STATUSES] || { label: poData.status, color: 'default' }

  const lineItemColumns = [
    { title: 'Código', render: (_: any, r: any) => r.resource?.code },
    { title: 'Descripción', render: (_: any, r: any) => r.description || r.resource?.name },
    { title: 'Cantidad', render: (_: any, r: any) => r.quantity },
    { title: 'Precio', render: (_: any, r: any) => `$${parseFloat(r.unitPrice).toFixed(2)}` },
    { title: 'Total', render: (_: any, r: any) => `$${parseFloat(r.lineTotal).toFixed(2)}` },
    { title: 'Recibido', render: (_: any, r: any) => r.receivedQty || '0' },
  ]

  const statusHistoryItems = (poData.statusHistory || []).map((sh: any) => ({
    label: `${sh.fromStatus} → ${sh.toStatus}`,
    children: <div>{sh.changedBy && `${sh.changedBy.firstName} ${sh.changedBy.lastName}`}{sh.notes && ` - ${sh.notes}`}</div>,
  }))

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/catalogs/ordenes-compra')} style={{ marginBottom: 16 }}>
        Volver
      </Button>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Title level={3} style={{ margin: 0 }}>{poData.orderNumber}</Title>
              <Tag color={status.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                {status.label}
              </Tag>
            </Row>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Proveedor">{poData.supplier?.name}</Descriptions.Item>
              <Descriptions.Item label="Fecha de Creación">{new Date(poData.createdAt).toLocaleDateString('es-MX')}</Descriptions.Item>
              <Descriptions.Item label="Lista de Precios">{poData.priceList?.name}</Descriptions.Item>
              <Descriptions.Item label="Fecha Requerida">
                {poData.requiredDeliveryDate ? new Date(poData.requiredDeliveryDate).toLocaleDateString('es-MX') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Creado por">
                {poData.createdBy && `${poData.createdBy.firstName} ${poData.createdBy.lastName}`}
              </Descriptions.Item>
              <Descriptions.Item label="Confirmado por">
                {poData.confirmedBy ? `${poData.confirmedBy.firstName} ${poData.confirmedBy.lastName}` : '-'}
              </Descriptions.Item>
            </Descriptions>

            {poData.description && (
              <>
                <Divider />
                <div><strong>Descripción:</strong></div>
                <div>{poData.description}</div>
              </>
            )}

            {poData.notes && (
              <>
                <Divider />
                <div><strong>Notas:</strong></div>
                <div>{poData.notes}</div>
              </>
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Title level={4}>Líneas de Orden</Title>
            <Table
              dataSource={poData.lineItems || []}
              columns={lineItemColumns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Title level={4}>Historial de Estado</Title>
            {statusHistoryItems.length > 0 ? (
              <Timeline items={statusHistoryItems} />
            ) : (
              <div>Sin cambios de estado registrados</div>
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Title level={4}>Totales</Title>
            <Divider />
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <span>Subtotal:</span>
              <span>${parseFloat(poData.subtotal).toFixed(2)}</span>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <span>Impuesto ({(poData.taxRate * 100).toFixed(0)}%):</span>
              <span>${parseFloat(poData.taxAmount).toFixed(2)}</span>
            </Row>
            <Divider />
            <Row justify="space-between" style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
              <span>Total:</span>
              <span>${parseFloat(poData.total).toFixed(2)}</span>
            </Row>

            <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
              <div><strong>Divisa:</strong> {poData.currency}</div>
              {poData.deliveryLocation && <div><strong>Ubicación:</strong> {poData.deliveryLocation}</div>}
            </Card>

            <Space direction="vertical" style={{ width: '100%' }}>
              {poData.status === 'DRAFT' && (
                <>
                  <Button type="primary" block onClick={() => setConfirmModalOpen(true)}>
                    Confirmar Orden
                  </Button>
                  <Button danger block onClick={() => cancelMutation.mutate()}>
                    Cancelar Orden
                  </Button>
                </>
              )}
              {['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(poData.status) && (
                <Button danger block onClick={() => cancelMutation.mutate()}>
                  Cancelar Orden
                </Button>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Confirmar Orden de Compra"
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={confirmMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => confirmMutation.mutate(values.notes)}>
          <Form.Item name="notes" label="Notas (opcional)">
            <Input.TextArea rows={3} placeholder="Agrega notas sobre la confirmación" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
