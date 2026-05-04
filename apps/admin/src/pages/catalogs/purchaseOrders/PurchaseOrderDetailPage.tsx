import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Button, Space, App, Typography, Tag, Table, Timeline,
  Modal, Form, Input, Descriptions, DatePicker, Tabs, Progress, Popconfirm,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, CheckOutlined, StopOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'
import { PageHeader } from '../../../components/ui'
import { formatMoney } from '../../../utils/format'

const { Text } = Typography

const PO_STATUSES: Record<string, { label: string; color: string }> = {
  DRAFT:              { label: 'Borrador',        color: 'default' },
  CONFIRMED:         { label: 'Confirmada',      color: 'blue' },
  PARTIALLY_RECEIVED:{ label: 'Recibida parcial',color: 'orange' },
  RECEIVED:          { label: 'Recibida total',  color: 'green' },
  INVOICED:          { label: 'Facturada',       color: 'purple' },
  CANCELLED:         { label: 'Anulada',         color: 'red' },
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [confirmForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('items')
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

  if (isLoading) return <Card loading />
  if (!po) return null

  const status = PO_STATUSES[po.status as keyof typeof PO_STATUSES] ?? { label: po.status, color: 'default' }

  const lineItems = po.lineItems ?? []
  const receivedCount = lineItems.filter((li: any) => parseFloat(li.receivedQty ?? 0) >= parseFloat(li.quantity)).length
  const receptionPct = lineItems.length > 0 ? Math.round((receivedCount / lineItems.length) * 100) : 0

  const subtotal = parseFloat(po.subtotal || 0)
  const taxAmt = parseFloat(po.taxAmount || 0)
  const totalAmt = parseFloat(po.total || 0)

  function openEditModal() {
    editForm.setFieldsValue({
      requiredDeliveryDate: po.requiredDeliveryDate ? dayjs(po.requiredDeliveryDate) : null,
      deliveryLocation: po.deliveryLocation || '',
      description: po.description || '',
      notes: po.notes || '',
    })
    setEditModalOpen(true)
  }

  const lineColumns = [
    {
      title: 'Código',
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.resource?.code ?? '—'}</span>
      ),
      width: 90,
    },
    {
      title: 'Descripción',
      render: (_: any, r: any) => r.description || r.resource?.name || '—',
    },
    {
      title: 'Unidad',
      render: (_: any, r: any) => r.resource?.unit ?? '—',
      width: 70,
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      width: 80,
      align: 'center' as const,
      render: (v: string) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{parseFloat(v)}</span>,
    },
    {
      title: 'Precio Unit.',
      dataIndex: 'unitPrice',
      width: 110,
      align: 'right' as const,
      render: (v: string) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(parseFloat(v), po.currency || 'MXN')}</span>,
    },
    {
      title: 'Total',
      dataIndex: 'lineTotal',
      width: 120,
      align: 'right' as const,
      render: (v: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(parseFloat(v), po.currency || 'MXN')}
        </Text>
      ),
    },
    {
      title: 'Recibido',
      width: 130,
      render: (_: any, r: any) => {
        const qty = parseFloat(r.quantity || 0)
        const recv = parseFloat(r.receivedQty || 0)
        const pct = qty > 0 ? Math.round((recv / qty) * 100) : 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Progress percent={pct} size="small" showInfo={false} strokeColor={pct >= 100 ? '#16a34a' : '#f59e0b'} style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'rgba(0,0,0,0.55)', minWidth: 40 }}>
              {recv}/{qty}
            </span>
          </div>
        )
      },
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Page header */}
      <PageHeader
        title={
          <Space size={8} align="center">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/catalogos/ordenes-compra')} />
            {po.orderNumber}
            <Tag color={status.color}>{status.label}</Tag>
          </Space>
        }
        meta={
          <span>
            Proveedor <strong>{po.supplier?.name ?? '—'}</strong>
            {po.originOrder && (
              <>
                {' · '}OS origen{' '}
                <Button type="link" size="small" style={{ padding: 0, fontSize: 13, color: '#6B46C1', height: 'auto' }} onClick={() => navigate(`/ordenes/${po.originOrder.id}`)}>
                  {po.originOrder.orderNumber}
                </Button>
              </>
            )}
            {po.requiredDeliveryDate && (
              <> · Entrega <strong>{dayjs(po.requiredDeliveryDate).format('DD/MM/YYYY')}</strong></>
            )}
          </span>
        }
        actions={
          <>
            {po.status === 'DRAFT' && (
              <Button icon={<EditOutlined />} onClick={openEditModal}>Editar</Button>
            )}
            {po.status === 'DRAFT' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setConfirmModalOpen(true)}>
                Confirmar OC
              </Button>
            )}
            {['DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
              <Popconfirm
                title="¿Cancelar esta OC?"
                onConfirm={() => cancelMutation.mutate()}
                okText="Sí, cancelar"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<StopOutlined />} loading={cancelMutation.isPending}>
                  Cancelar
                </Button>
              </Popconfirm>
            )}
          </>
        }
        tabs={
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ marginBottom: -1 }}
            items={[
              { key: 'items', label: `Items (${lineItems.length})` },
              { key: 'historial', label: 'Historial' },
            ]}
          />
        }
      />

      {/* Content */}
      <div style={{ padding: 24 }}>
        {activeTab === 'items' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
            {/* Main: items table */}
            <div>
              {/* Reception progress summary */}
              {lineItems.length > 0 && (
                <Card size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Recepción general</Text>
                    <Progress
                      percent={receptionPct}
                      strokeColor={receptionPct === 100 ? '#16a34a' : '#f59e0b'}
                      style={{ flex: 1 }}
                      size="small"
                    />
                    <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {receivedCount}/{lineItems.length} líneas
                    </Text>
                  </div>
                </Card>
              )}

              <Card styles={{ body: { padding: 0 } }} title="Líneas de orden">
                <Table
                  dataSource={lineItems}
                  columns={lineColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </Card>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Financial summary */}
              <Card size="small" title="Resumen financiero">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Subtotal</Text>
                    <Text>{formatMoney(subtotal, po.currency || 'MXN')}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Impuesto ({((po.taxRate || 0) * 100).toFixed(0)}%)</Text>
                    <Text>{formatMoney(taxAmt, po.currency || 'MXN')}</Text>
                  </div>
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong style={{ fontSize: 15 }}>Total</Text>
                    <Text strong style={{ fontSize: 15, color: '#6B46C1' }}>{formatMoney(totalAmt, po.currency || 'MXN')}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Divisa</Text>
                    <Tag>{po.currency || 'MXN'}</Tag>
                  </div>
                </div>
              </Card>

              {/* Proveedor */}
              <Card size="small" title="Proveedor">
                <Descriptions column={1} size="small" colon={false}>
                  <Descriptions.Item label="Nombre">
                    <Text strong>{po.supplier?.name ?? '—'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Código">{po.supplier?.code ?? '—'}</Descriptions.Item>
                  {po.deliveryLocation && (
                    <Descriptions.Item label="Entrega">{po.deliveryLocation}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="Lista de precios">{po.priceList?.name ?? '—'}</Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Info OC */}
              <Card size="small" title="Datos de OC">
                <Descriptions column={1} size="small" colon={false}>
                  <Descriptions.Item label="Creada">
                    {dayjs(po.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Creado por">
                    {po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : '—'}
                  </Descriptions.Item>
                  {po.requiredDeliveryDate && (
                    <Descriptions.Item label="Entrega requerida">
                      {dayjs(po.requiredDeliveryDate).format('DD/MM/YYYY')}
                    </Descriptions.Item>
                  )}
                  {po.confirmedBy && (
                    <Descriptions.Item label="Confirmada por">
                      {po.confirmedBy.firstName} {po.confirmedBy.lastName}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>

              {/* Notes */}
              {(po.description || po.notes) && (
                <Card size="small" title="Notas">
                  {po.description && <Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{po.description}</Text>}
                  {po.notes && <Text type="secondary" style={{ fontSize: 12 }}>{po.notes}</Text>}
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <Card title="Historial de Estado" style={{ maxWidth: 640 }}>
            {(po.statusHistory ?? []).length > 0 ? (
              <Timeline
                items={(po.statusHistory ?? []).map((sh: any) => ({
                  color: PO_STATUSES[sh.toStatus]?.color === 'default' ? 'gray' : PO_STATUSES[sh.toStatus]?.color ?? 'blue',
                  children: (
                    <div>
                      <Text strong>{PO_STATUSES[sh.fromStatus]?.label ?? sh.fromStatus} → {PO_STATUSES[sh.toStatus]?.label ?? sh.toStatus}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sh.changedBy ? `${sh.changedBy.firstName} ${sh.changedBy.lastName}` : '—'}
                        {' · '}{dayjs(sh.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                      {sh.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{sh.notes}</Text></div>}
                    </div>
                  ),
                }))}
              />
            ) : (
              <Text type="secondary">Sin cambios de estado registrados</Text>
            )}
          </Card>
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        title="Confirmar Orden de Compra"
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        onOk={() => confirmForm.submit()}
        confirmLoading={confirmMutation.isPending}
        okText="Confirmar OC"
      >
        <Form form={confirmForm} layout="vertical" onFinish={(values) => confirmMutation.mutate(values.notes)}>
          <Form.Item name="notes" label="Notas (opcional)">
            <Input.TextArea rows={3} placeholder="Agrega notas sobre la confirmación" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        title="Editar Orden de Compra"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical" onFinish={(values) => updateMutation.mutate(values)}>
          <Form.Item name="requiredDeliveryDate" label="Fecha de Entrega Requerida">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
