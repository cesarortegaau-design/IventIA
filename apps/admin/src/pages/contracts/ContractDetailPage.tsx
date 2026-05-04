import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Descriptions, Table, Tag, Button, Space, Form,
  Input, InputNumber, Select, DatePicker, Modal, App, Typography,
  Row, Col, Statistic, Popconfirm, Slider, Divider, Tooltip
} from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, DownloadOutlined,
  DollarOutlined, CheckOutlined, CloseOutlined, EditOutlined, LinkOutlined, FileOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { contractsApi } from '../../api/contracts'
import GenerateDocumentModal from '../../components/GenerateDocumentModal'
import { templatesApi } from '../../api/templates'

const { Title, Text } = Typography
const { TextArea } = Input

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  EN_FIRMA: { label: 'En Firma', color: 'processing' },
  FIRMADO: { label: 'Firmado', color: 'success' },
  CANCELADO: { label: 'Cancelado', color: 'error' },
}

const NEXT_STATUSES: Record<string, { status: string; label: string; icon: any; color?: string }[]> = {
  EN_FIRMA: [
    { status: 'FIRMADO', label: 'Marcar como Firmado', icon: <CheckOutlined /> },
    { status: 'CANCELADO', label: 'Cancelar Contrato', icon: <CloseOutlined />, color: 'red' },
  ],
  FIRMADO: [
    { status: 'CANCELADO', label: 'Cancelar Contrato', icon: <CloseOutlined />, color: 'red' },
  ],
  CANCELADO: [],
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'SWIFT', label: 'Swift' },
]

const SP_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'default' },
  PARTIAL: { label: 'Parcial', color: 'warning' },
  PAID: { label: 'Pagado', color: 'success' },
}

function formatMoney(v: any) {
  return `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()

  // Forms
  const [editForm] = Form.useForm()
  const [spForm] = Form.useForm()
  const [paymentForm] = Form.useForm()

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addOrderModalOpen, setAddOrderModalOpen] = useState(false)
  const [spModalOpen, setSpModalOpen] = useState(false)
  const [editingSpId, setEditingSpId] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentSpId, setPaymentSpId] = useState<string | null>(null)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)

  // Queries
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id!),
    enabled: !!id,
  })

  const { data: availableOrders } = useQuery({
    queryKey: ['contract-available-orders', id],
    queryFn: () => contractsApi.getAvailableOrders(id!),
    enabled: !!id && addOrderModalOpen,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contract', id] })

  // Mutations
  const statusMutation = useMutation({
    mutationFn: (status: string) => contractsApi.updateStatus(id!, status),
    onSuccess: () => { invalidate(); message.success('Estado actualizado') },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => contractsApi.update(id!, data),
    onSuccess: () => { invalidate(); setEditModalOpen(false); message.success('Contrato actualizado') },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const addOrderMutation = useMutation({
    mutationFn: (orderId: string) => contractsApi.addOrder(id!, orderId),
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['contract-available-orders'] })
      message.success('Orden vinculada')
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const removeOrderMutation = useMutation({
    mutationFn: (orderId: string) => contractsApi.removeOrder(id!, orderId),
    onSuccess: () => {
      invalidate()
      message.success('Orden desvinculada')
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const addSpMutation = useMutation({
    mutationFn: (data: any) => contractsApi.addScheduledPayment(id!, data),
    onSuccess: () => { invalidate(); setSpModalOpen(false); spForm.resetFields(); message.success('Pago programado creado') },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const updateSpMutation = useMutation({
    mutationFn: ({ spId, data }: { spId: string; data: any }) => contractsApi.updateScheduledPayment(id!, spId, data),
    onSuccess: () => { invalidate(); setSpModalOpen(false); setEditingSpId(null); spForm.resetFields(); message.success('Pago programado actualizado') },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const deleteSpMutation = useMutation({
    mutationFn: (spId: string) => contractsApi.deleteScheduledPayment(id!, spId),
    onSuccess: () => { invalidate(); message.success('Pago programado eliminado') },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  const addPaymentMutation = useMutation({
    mutationFn: ({ spId, data }: { spId: string; data: any }) => contractsApi.addPayment(id!, spId, data),
    onSuccess: () => { invalidate(); setPaymentModalOpen(false); paymentForm.resetFields(); message.success('Pago registrado') },
    onError: (e: any) => message.error(e.response?.data?.message || 'Error'),
  })

  if (isLoading) {
    return <Card loading style={{ marginTop: 24 }} />
  }

  if (error || !contract) {
    return (
      <Card style={{ marginTop: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/contratos')} />
          <Text type="danger">Error al cargar el contrato: {(error as any)?.response?.data?.message || (error as any)?.message || 'No encontrado'}</Text>
        </Space>
      </Card>
    )
  }

  const isCancelled = contract.status === 'CANCELADO'
  const totalAmount = Number(contract.totalAmount)
  const paidAmount = Number(contract.paidAmount)
  const balance = totalAmount - paidAmount

  // ─── Edit handler ─────────────────────────────────────────────────────��──────

  function openEdit() {
    editForm.setFieldsValue({
      description: contract.description,
      signingDate: contract.signingDate ? dayjs(contract.signingDate) : null,
      notes: contract.notes,
    })
    setEditModalOpen(true)
  }

  function handleEditSubmit(values: any) {
    updateMutation.mutate({
      ...values,
      signingDate: values.signingDate ? values.signingDate.toISOString() : null,
    })
  }

  // ─── Scheduled payment handlers ──────────────────────────────────────────────

  function openAddSp() {
    setEditingSpId(null)
    spForm.resetFields()
    setSpModalOpen(true)
  }

  function openEditSp(sp: any) {
    setEditingSpId(sp.id)
    spForm.setFieldsValue({
      label: sp.label,
      dueDate: dayjs(sp.dueDate),
      expectedAmount: Number(sp.expectedAmount),
      percentage: totalAmount > 0 ? Math.round((Number(sp.expectedAmount) / totalAmount) * 100) : 0,
    })
    setSpModalOpen(true)
  }

  function handleSpSubmit(values: any) {
    const data = {
      label: values.label,
      dueDate: values.dueDate.toISOString(),
      expectedAmount: values.expectedAmount,
    }
    if (editingSpId) {
      updateSpMutation.mutate({ spId: editingSpId, data })
    } else {
      addSpMutation.mutate(data)
    }
  }

  // ─── Payment handler ────────────────────────────────────────────────────────

  function openPayment(spId: string) {
    setPaymentSpId(spId)
    const sp = contract.scheduledPayments.find((s: any) => s.id === spId)
    const spBalance = Number(sp.expectedAmount) - Number(sp.paidAmount)
    paymentForm.resetFields()
    paymentForm.setFieldsValue({
      amount: spBalance > 0 ? spBalance : undefined,
      paymentDate: dayjs(),
    })
    setPaymentModalOpen(true)
  }

  function handlePaymentSubmit(values: any) {
    if (!paymentSpId) return
    addPaymentMutation.mutate({
      spId: paymentSpId,
      data: {
        ...values,
        paymentDate: values.paymentDate.toISOString(),
      },
    })
  }

  // ─── Status transition ──────────────────────────────────────────────────────

  function handleStatusChange(status: string) {
    const label = STATUS_MAP[status]?.label || status
    modal.confirm({
      title: `Cambiar estado a "${label}"`,
      content: status === 'CANCELADO' ? 'Al cancelar se desvinculan todas las órdenes. Esta acción no se puede revertir.' : undefined,
      onOk: () => statusMutation.mutate(status),
    })
  }

  // ─── Orders table ───────────────────────────────────────────────────────────

  const orderColumns = [
    { title: 'Orden', dataIndex: 'orderNumber', width: 140 },
    {
      title: 'Evento', dataIndex: 'event',
      render: (e: any) => e ? `${e.code} - ${e.name}` : '-',
    },
    {
      title: 'Total', dataIndex: 'total', width: 130, align: 'right' as const,
      render: formatMoney,
    },
    {
      title: 'Estado', dataIndex: 'status', width: 110,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="Ver orden">
            <Button size="small" icon={<LinkOutlined />} onClick={() => navigate(`/ordenes/${r.id}`)} />
          </Tooltip>
          {!isCancelled && (
            <Popconfirm title="¿Desvincular esta orden?" onConfirm={() => removeOrderMutation.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // ─── Scheduled payments table ───────────────────────────────────────────────

  const spColumns = [
    { title: 'Concepto', dataIndex: 'label' },
    {
      title: 'Vencimiento', dataIndex: 'dueDate', width: 130,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Monto Esperado', dataIndex: 'expectedAmount', width: 150, align: 'right' as const,
      render: (v: any) => formatMoney(v),
    },
    {
      title: '% del Total', key: 'pct', width: 100, align: 'right' as const,
      render: (_: any, r: any) =>
        totalAmount > 0 ? `${((Number(r.expectedAmount) / totalAmount) * 100).toFixed(1)}%` : '-',
    },
    {
      title: 'Pagado', dataIndex: 'paidAmount', width: 130, align: 'right' as const,
      render: (v: any) => formatMoney(v),
    },
    {
      title: 'Estado', dataIndex: 'status', width: 100,
      render: (v: string) => {
        const s = SP_STATUS_MAP[v] || { label: v, color: 'default' }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: '', key: 'actions', width: 150,
      render: (_: any, r: any) => (
        <Space>
          {!isCancelled && (
            <>
              <Tooltip title="Registrar pago">
                <Button size="small" icon={<DollarOutlined />} onClick={() => openPayment(r.id)} />
              </Tooltip>
              <Tooltip title="Editar">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEditSp(r)} />
              </Tooltip>
              {r.payments.length === 0 && (
                <Popconfirm title="¿Eliminar pago programado?" onConfirm={() => deleteSpMutation.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ]

  // Expandable row: show actual payments for each scheduled payment
  function expandedPaymentsRow(sp: any) {
    if (!sp.payments || sp.payments.length === 0) {
      return <Text type="secondary">Sin pagos registrados</Text>
    }
    return (
      <Table
        dataSource={sp.payments}
        rowKey="id"
        size="small"
        pagination={false}
        columns={[
          {
            title: 'Fecha', dataIndex: 'paymentDate', width: 120,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
          },
          {
            title: 'Método', dataIndex: 'method', width: 140,
            render: (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.label || v,
          },
          {
            title: 'Monto', dataIndex: 'amount', width: 130, align: 'right' as const,
            render: formatMoney,
          },
          { title: 'Referencia', dataIndex: 'reference' },
          {
            title: 'Registrado por', dataIndex: 'recordedBy', width: 160,
            render: (u: any) => u ? `${u.firstName} ${u.lastName}` : '-',
          },
        ]}
      />
    )
  }

  // ─── Available orders for adding ────────────────────────────────────────────

  const unlinkedOrders = (availableOrders || []).filter(
    (o: any) => !contract.orders.some((co: any) => co.id === o.id)
  )

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/contratos')} />
          <Title level={4} style={{ margin: 0 }}>
            {contract.contractNumber}
          </Title>
          <Tag color={STATUS_MAP[contract.status]?.color}>{STATUS_MAP[contract.status]?.label}</Tag>
        </Space>
        <Space>
          {!isCancelled && (
            <>
              <Button icon={<EditOutlined />} onClick={openEdit}>Editar</Button>
              <Button icon={<FileOutlined />} onClick={() => setGenerateDocOpen(true)}>Generar Word</Button>
            </>
          )}
          {(NEXT_STATUSES[contract.status] || []).map((t: any) => (
            <Button
              key={t.status}
              icon={t.icon}
              danger={t.color === 'red'}
              onClick={() => handleStatusChange(t.status)}
            >
              {t.label}
            </Button>
          ))}
        </Space>
      </Row>

      {/* Summary stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="Monto Total" value={totalAmount} prefix="$" precision={2} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Pagado" value={paidAmount} prefix="$" precision={2} valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Saldo" value={balance} prefix="$" precision={2} valueStyle={balance > 0 ? { color: '#cf1322' } : undefined} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Órdenes" value={contract.orders.length} /></Card>
        </Col>
      </Row>

      {/* Contract details */}
      <Card title="Datos del Contrato" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Descripción" span={2}>{contract.description}</Descriptions.Item>
          <Descriptions.Item label="Cliente">
            {contract.client?.companyName || `${contract.client?.firstName || ''} ${contract.client?.lastName || ''}`.trim()}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha de Firma">
            {contract.signingDate ? dayjs(contract.signingDate).format('DD/MM/YYYY') : 'Sin definir'}
          </Descriptions.Item>
          <Descriptions.Item label="Creado por">
            {contract.createdBy ? `${contract.createdBy.firstName} ${contract.createdBy.lastName}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Creado">
            {dayjs(contract.createdAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          {contract.notes && (
            <Descriptions.Item label="Notas" span={2}>{contract.notes}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Orders section */}
      <Card
        title="Órdenes de Servicio"
        style={{ marginBottom: 16 }}
        extra={!isCancelled && (
          <Button icon={<PlusOutlined />} onClick={() => setAddOrderModalOpen(true)}>
            Agregar Orden
          </Button>
        )}
      >
        <Table
          dataSource={contract.orders}
          columns={orderColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      {/* Scheduled Payments section */}
      <Card
        title="Calendario de Pagos"
        extra={!isCancelled && (
          <Button icon={<PlusOutlined />} onClick={openAddSp}>
            Agregar Pago Programado
          </Button>
        )}
      >
        <Table
          dataSource={contract.scheduledPayments}
          columns={spColumns}
          rowKey="id"
          size="small"
          pagination={false}
          expandable={{
            expandedRowRender: expandedPaymentsRow,
            rowExpandable: (r: any) => r.payments && r.payments.length > 0,
          }}
        />
      </Card>

      {/* Documents section */}
      {contract.documents && contract.documents.length > 0 && (
        <Card title={`Documentos (${contract.documents.length})`} style={{ marginTop: 16 }}>
          <Table
            dataSource={contract.documents}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Archivo', dataIndex: 'fileName' },
              { title: 'Tipo', dataIndex: 'documentType', width: 180 },
              {
                title: 'Fecha', dataIndex: 'createdAt', width: 140,
                render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
              },
              {
                title: '', key: 'actions', width: 60,
                render: (_: any, doc: any) => (
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => doc.blobKey.startsWith('http')
                      ? window.open(doc.blobKey, '_blank')
                      : templatesApi.download(doc.blobKey, doc.fileName)
                    }
                  />
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ─── Edit Contract Modal ──────────────────────────────────────────────── */}
      <Modal
        title="Editar Contrato"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        forceRender
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="description" label="Descripción" rules={[{ required: true }]}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="signingDate" label="Fecha de Firma">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Add Order Modal ─────────────────────────────────────��────────────── */}
      <Modal
        title="Agregar Orden al Contrato"
        open={addOrderModalOpen}
        onCancel={() => setAddOrderModalOpen(false)}
        footer={null}
        width={700}
      >
        {unlinkedOrders.length === 0 ? (
          <Text type="secondary">No hay órdenes disponibles para este cliente</Text>
        ) : (
          <Table
            dataSource={unlinkedOrders}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Orden', dataIndex: 'orderNumber', width: 140 },
              {
                title: 'Evento', dataIndex: 'event',
                render: (e: any) => e ? `${e.code} - ${e.name}` : '-',
              },
              {
                title: 'Total', dataIndex: 'total', width: 130, align: 'right' as const,
                render: formatMoney,
              },
              { title: 'Estado', dataIndex: 'status', width: 100, render: (v: string) => <Tag>{v}</Tag> },
              {
                title: '', key: 'action', width: 80,
                render: (_: any, r: any) => (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={addOrderMutation.isPending}
                    onClick={() => addOrderMutation.mutate(r.id)}
                  >
                    Agregar
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* ─── Scheduled Payment Modal ──────────────────────────────────────────── */}
      <Modal
        title={editingSpId ? 'Editar Pago Programado' : 'Nuevo Pago Programado'}
        open={spModalOpen}
        onCancel={() => { setSpModalOpen(false); setEditingSpId(null) }}
        onOk={() => spForm.submit()}
        confirmLoading={addSpMutation.isPending || updateSpMutation.isPending}
        forceRender
      >
        <Form form={spForm} layout="vertical" onFinish={handleSpSubmit}>
          <Form.Item name="label" label="Concepto" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Anticipo 50%" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dueDate" label="Fecha de Vencimiento" rules={[{ required: true, message: 'Requerido' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedAmount" label="Monto Esperado" rules={[{ required: true, message: 'Requerido' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  precision={2}
                  formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v!.replace(/\$\s?|(,*)/g, '') as any}
                  onChange={(val) => {
                    if (totalAmount > 0 && val) {
                      spForm.setFieldValue('percentage', Math.round((Number(val) / totalAmount) * 100))
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="percentage" label="Porcentaje del Total">
            <Slider
              min={0}
              max={100}
              marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
              tooltip={{ formatter: (v) => `${v}%` }}
              onChange={(pct) => {
                if (totalAmount > 0) {
                  const amount = Math.round((pct / 100) * totalAmount * 100) / 100
                  spForm.setFieldValue('expectedAmount', amount)
                }
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Payment Modal ────────────────────────────────────────────────────── */}
      <Modal
        title="Registrar Pago"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={addPaymentMutation.isPending}
        forceRender
      >
        <Form form={paymentForm} layout="vertical" onFinish={handlePaymentSubmit}>
          <Form.Item name="method" label="Método de Pago" rules={[{ required: true, message: 'Requerido' }]}>
            <Select options={PAYMENT_METHODS} placeholder="Seleccionar método" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Monto" rules={[{ required: true, message: 'Requerido' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  precision={2}
                  formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v!.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="Fecha" rules={[{ required: true, message: 'Requerido' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Referencia">
            <Input placeholder="Folio o referencia de la transacción" />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <GenerateDocumentModal
        open={generateDocOpen}
        onClose={() => setGenerateDocOpen(false)}
        context="CONTRACT"
        entityId={id!}
      />
    </div>
  )
}
