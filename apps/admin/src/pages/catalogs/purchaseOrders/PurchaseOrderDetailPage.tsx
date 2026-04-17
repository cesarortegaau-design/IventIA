import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Space, Row, Col, App, Typography, Tag, Table, Divider, Timeline, Modal, Form, Input, Descriptions, DatePicker } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
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
  const [confirmForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const { data: response, isLoading } = useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: () => (id ? purchaseOrdersApi.get(id).then(r => r.data) : Promise.resolve(null)),
  })

  const po = response?.data

  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      if (!id) throw new Error('No PO ID')
      return purchaseOrdersApi.update(id, {
        requiredDeliveryDate: values.requiredDeliveryDate?.toISOString(),
        deliveryLocation: values.deliveryLocation || undefined,
        description: values.description,
        notes: values.notes,
      }).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', id] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      setEditModalOpen(false)
      message.success('Orden de Compra actualizada')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar')
    },
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
      confirmForm.resetFields()
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
  if (!po) return <div>No encontrado</div>

  const status = PO_STATUSES[po.status as keyof typeof PO_STATUSES] || { label: po.status, color: 'default' }

  const lineItemColumns = [
    { title: 'Código', render: (_: any, r: any) => r.resource?.code },
    { title: 'Descripción', render: (_: any, r: any) => r.description || r.resource?.name },
    { title: 'Cantidad', render: (_: any, r: any) => r.quantity },
    { title: 'Precio', render: (_: any, r: any) => `$${parseFloat(r.unitPrice).toFixed(2)}` },
    { title: 'Total', render: (_: any, r: any) => `$${parseFloat(r.lineTotal).toFixed(2)}` },
    { title: 'Recibido', render: (_: any, r: any) => r.receivedQty || '0' },
  ]

  const statusHistoryItems = (po.statusHistory || []).map((sh: any) => ({
    label: `${sh.fromStatus} → ${sh.toStatus}`,
    children: <div>{sh.changedBy && `${sh.changedBy.firstName} ${sh.changedBy.lastName}`}{sh.notes && ` - ${sh.notes}`}</div>,
  }))

  function openEditModal() {
    editForm.setFieldsValue({
      requiredDeliveryDate: po.requiredDeliveryDate ? dayjs(po.requiredDeliveryDate) : null,
      deliveryLocation: po.deliveryLocation || '',
      description: po.description || '',
      notes: po.notes || '',
    })
    setEditModalOpen(true)
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/catalogos/ordenes-compra')} style={{ marginBottom: 16 }}>
        Volver
      </Button>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Title level={3} style={{ margin: 0 }}>{po.orderNumber}</Title>
              <Space>
                <Tag color={status.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {status.label}
                </Tag>
                {po.status === 'DRAFT' && (
                  <Button icon={<EditOutlined />} onClick={openEditModal}>
                    Editar
                  </Button>
                )}
              </Space>
            </Row>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Proveedor">{po.supplier?.name}</Descriptions.Item>
              <Descriptions.Item label="Fecha de Creación">{new Date(po.createdAt).toLocaleDateString('es-MX')}</Descriptions.Item>
              <Descriptions.Item label="Lista de Precios">{po.priceList?.name}</Descriptions.Item>
              <Descriptions.Item label="Fecha Requerida">
                {po.requiredDeliveryDate ? new Date(po.requiredDeliveryDate).toLocaleDateString('es-MX') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Creado por">
                {po.createdBy && `${po.createdBy.firstName} ${po.createdBy.lastName}`}
              </Descriptions.Item>
              <Descriptions.Item label="Confirmado por">
                {po.confirmedBy ? `${po.confirmedBy.firstName} ${po.confirmedBy.lastName}` : '-'}
              </Descriptions.Item>
              {po.originOrder && (
                <Descriptions.Item label="Orden de Servicio Origen">
                  <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/ordenes/${po.originOrder.id}`)}>
                    {po.originOrder.orderNumber}
                  </Button>
                </Descriptions.Item>
              )}
            </Descriptions>

            {po.description && (
              <>
                <Divider />
                <div><strong>Descripción:</strong></div>
                <div>{po.description}</div>
              </>
            )}

            {po.notes && (
              <>
                <Divider />
                <div><strong>Notas:</strong></div>
                <div>{po.notes}</div>
              </>
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Title level={4}>Líneas de Orden</Title>
            <Table
              dataSource={po.lineItems || []}
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
              <span>${parseFloat(po.subtotal).toFixed(2)}</span>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <span>Impuesto ({(po.taxRate * 100).toFixed(0)}%):</span>
              <span>${parseFloat(po.taxAmount).toFixed(2)}</span>
            </Row>
            <Divider />
            <Row justify="space-between" style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
              <span>Total:</span>
              <span>${parseFloat(po.total).toFixed(2)}</span>
            </Row>

            <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5' }}>
              <div><strong>Divisa:</strong> {po.currency}</div>
              {po.deliveryLocation && <div><strong>Ubicación:</strong> {po.deliveryLocation}</div>}
            </Card>

            <Space direction="vertical" style={{ width: '100%' }}>
              {po.status === 'DRAFT' && (
                <>
                  <Button type="primary" block onClick={() => setConfirmModalOpen(true)}>
                    Confirmar Orden
                  </Button>
                  <Button danger block onClick={() => cancelMutation.mutate()}>
                    Cancelar Orden
                  </Button>
                </>
              )}
              {['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
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
        onOk={() => confirmForm.submit()}
        confirmLoading={confirmMutation.isPending}
      >
        <Form form={confirmForm} layout="vertical" onFinish={(values) => confirmMutation.mutate(values.notes)}>
          <Form.Item name="notes" label="Notas (opcional)">
            <Input.TextArea rows={3} placeholder="Agrega notas sobre la confirmación" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Editar Orden de Compra"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item name="requiredDeliveryDate" label="Fecha de Entrega Requerida">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="deliveryLocation" label="Ubicación de Entrega">
            <Input placeholder="Ej: Bodega principal" />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
