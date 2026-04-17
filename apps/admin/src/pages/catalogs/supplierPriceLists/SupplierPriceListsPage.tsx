import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Space, Tag, Row, Col, App, Typography, Select, Modal, Form, Input,
  DatePicker, InputNumber, Divider, Popconfirm,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supplierPriceListsApi, type AddPriceListItemInput } from '../../../api/supplierPriceLists'
import { suppliersApi } from '../../../api/suppliers'
import { resourcesApi } from '../../../api/resources'

const { Title } = Typography

const AVAILABILITY_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'BY_ORDER', label: 'Bajo pedido' },
  { value: 'DISCONTINUED', label: 'Descontinuado' },
  { value: 'TEMPORARILY_OUT', label: 'Agotado temporalmente' },
]

function getAvailabilityTag(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: 'Disponible', color: 'green' },
    BY_ORDER: { label: 'Bajo pedido', color: 'blue' },
    DISCONTINUED: { label: 'Descontinuado', color: 'red' },
    TEMPORARILY_OUT: { label: 'Agotado', color: 'orange' },
  }
  const s = map[status] || { label: status, color: 'default' }
  return <Tag color={s.color}>{s.label}</Tag>
}

export default function SupplierPriceListsPage() {
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<{ supplierId?: string }>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // --- List queries ---
  const { data: priceListsData, isLoading } = useQuery({
    queryKey: ['supplierPriceLists', page, pageSize, filters],
    queryFn: () => supplierPriceListsApi.list({ page, pageSize, ...filters }).then(r => r.data),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

  // --- Detail query (when a price list is selected) ---
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['supplierPriceList', selectedPriceListId],
    queryFn: () => selectedPriceListId
      ? supplierPriceListsApi.get(selectedPriceListId).then(r => r.data)
      : Promise.resolve(null),
    enabled: !!selectedPriceListId,
  })

  const { data: resourcesData } = useQuery({
    queryKey: ['resources-all'],
    queryFn: () => resourcesApi.list({ pageSize: 5000 }),
    enabled: !!selectedPriceListId,
  })

  const detail = detailData?.data ?? detailData

  // --- Price list mutations ---
  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        validFrom: values.validFrom?.format('YYYY-MM-DD'),
        validTo: values.validTo?.format('YYYY-MM-DD'),
      }
      return editingId
        ? supplierPriceListsApi.update(editingId, payload).then(r => r.data)
        : supplierPriceListsApi.create(payload).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierPriceLists'] })
      setModalOpen(false)
      form.resetFields()
      message.success(editingId ? 'Lista de precios actualizada' : 'Lista de precios creada')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error')
    },
  })

  // --- Item mutations ---
  const addItemMutation = useMutation({
    mutationFn: (values: any) => {
      if (!selectedPriceListId) throw new Error('No price list selected')
      const payload: AddPriceListItemInput = {
        resourceId: values.resourceId,
        unitPrice: String(values.unitPrice),
        supplierSku: values.supplierSku || undefined,
        availabilityStatus: values.availabilityStatus || 'AVAILABLE',
        deliveryTimeDays: values.deliveryTimeDays ?? undefined,
      }
      if (editingItemId) {
        return supplierPriceListsApi.updateItem(selectedPriceListId, editingItemId, payload).then(r => r.data)
      }
      return supplierPriceListsApi.addItem(selectedPriceListId, payload).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierPriceList', selectedPriceListId] })
      setItemModalOpen(false)
      itemForm.resetFields()
      setEditingItemId(null)
      message.success(editingItemId ? 'Recurso actualizado' : 'Recurso agregado')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al guardar recurso')
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => {
      if (!selectedPriceListId) throw new Error('No price list selected')
      return supplierPriceListsApi.removeItem(selectedPriceListId, itemId).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierPriceList', selectedPriceListId] })
      message.success('Recurso eliminado')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al eliminar')
    },
  })

  // --- Handlers ---
  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      validFrom: record.validFrom ? dayjs(record.validFrom) : null,
      validTo: record.validTo ? dayjs(record.validTo) : null,
    })
    setModalOpen(true)
  }

  function openNew() {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, currency: 'MXN' })
    setModalOpen(true)
  }

  function openAddItem() {
    setEditingItemId(null)
    itemForm.resetFields()
    itemForm.setFieldsValue({ availabilityStatus: 'AVAILABLE', deliveryTimeDays: 5 })
    setItemModalOpen(true)
  }

  function openEditItem(item: any) {
    setEditingItemId(item.id)
    itemForm.setFieldsValue({
      resourceId: item.resourceId,
      unitPrice: parseFloat(item.unitPrice),
      supplierSku: item.supplierSku || '',
      availabilityStatus: item.availabilityStatus,
      deliveryTimeDays: item.deliveryTimeDays,
    })
    setItemModalOpen(true)
  }

  // --- Existing items resourceIds for filtering ---
  const existingResourceIds = new Set(
    (detail?.items ?? []).map((item: any) => item.resourceId)
  )

  const resourceOptions = (resourcesData?.data ?? [])
    .filter((r: any) => r.isActive)
    .map((r: any) => ({
      value: r.id,
      label: `${r.code} - ${r.name} (${r.unit})`,
      disabled: !editingItemId && existingResourceIds.has(r.id),
    }))

  const supplierOptions = (suppliersData?.data ?? []).map((s: any) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
  }))

  // --- Detail view (items management) ---
  if (selectedPriceListId && detail) {
    const items = detail.items ?? []

    const itemColumns = [
      { title: 'Código', width: 120, render: (_: any, r: any) => r.resource?.code },
      { title: 'Recurso', render: (_: any, r: any) => r.resource?.name },
      { title: 'SKU Proveedor', dataIndex: 'supplierSku', width: 130 },
      { title: 'Precio Unitario', width: 130, render: (_: any, r: any) => `$${parseFloat(r.unitPrice).toFixed(2)}` },
      { title: 'Unidad', width: 80, render: (_: any, r: any) => r.resource?.unit },
      { title: 'Días Entrega', dataIndex: 'deliveryTimeDays', width: 100 },
      { title: 'Disponibilidad', width: 140, render: (_: any, r: any) => getAvailabilityTag(r.availabilityStatus) },
      {
        title: '', key: 'actions', width: 100,
        render: (_: any, r: any) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditItem(r)} />
            <Popconfirm title="¿Eliminar este recurso?" onConfirm={() => removeItemMutation.mutate(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedPriceListId(null)} style={{ marginBottom: 16 }}>
          Volver a listas
        </Button>

        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <div>
              <Title level={4} style={{ margin: 0 }}>{detail.name}</Title>
              <span style={{ color: '#888' }}>{detail.code} — {detail.supplier?.name}</span>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddItem}>
              Agregar Recurso
            </Button>
          </Row>
        </Card>

        <Card>
          <Table
            dataSource={items}
            columns={itemColumns}
            rowKey="id"
            loading={detailLoading}
            size="small"
            pagination={false}
            locale={{ emptyText: 'No hay recursos en esta lista. Agrega el primero.' }}
          />
        </Card>

        <Modal
          title={editingItemId ? 'Editar Recurso' : 'Agregar Recurso'}
          open={itemModalOpen}
          onCancel={() => { setItemModalOpen(false); setEditingItemId(null) }}
          onOk={() => itemForm.submit()}
          confirmLoading={addItemMutation.isPending}
          width={600}
        >
          <Form form={itemForm} layout="vertical" onFinish={addItemMutation.mutate}>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="resourceId" label="Recurso" rules={[{ required: true, message: 'Selecciona un recurso' }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Buscar recurso..."
                    options={resourceOptions}
                    disabled={!!editingItemId}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="unitPrice" label="Precio Unitario" rules={[{ required: true, message: 'Ingresa el precio' }]}>
                  <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="supplierSku" label="SKU Proveedor">
                  <Input placeholder="Código del proveedor" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="availabilityStatus" label="Disponibilidad">
                  <Select options={AVAILABILITY_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="deliveryTimeDays" label="Días de Entrega">
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    )
  }

  // --- List view ---
  const columns = [
    { title: 'Código', dataIndex: 'code', width: 120 },
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Proveedor', render: (_: any, r: any) => r.supplier?.name },
    { title: 'Items', render: (_: any, r: any) => r._count?.items ?? 0, width: 70 },
    { title: 'Válido desde', render: (_: any, r: any) => new Date(r.validFrom).toLocaleDateString('es-MX') },
    { title: 'Válido hasta', render: (_: any, r: any) => r.validTo ? new Date(r.validTo).toLocaleDateString('es-MX') : '-' },
    {
      title: 'Estado', width: 100, render: (_: any, r: any) => {
        const now = new Date()
        const from = new Date(r.validFrom)
        const to = r.validTo ? new Date(r.validTo) : null
        let status = 'ACTIVO'
        let color = 'green'
        if (now < from) { status = 'PRÓXIMO'; color = 'orange' }
        else if (to && now > to) { status = 'EXPIRADO'; color = 'red' }
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: '', key: 'actions', width: 130,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => setSelectedPriceListId(r.id)} title="Ver recursos">
            Recursos
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} title="Editar" />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Listas de Precios de Proveedores</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
          Nueva Lista
        </Button>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="Filtrar por proveedor"
              allowClear
              options={supplierOptions}
              onChange={(v) => { setFilters({ supplierId: v }); setPage(1) }}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={priceListsData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: priceListsData?.meta?.total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>

      <Modal
        title={editingId ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplierId" label="Proveedor" rules={[{ required: true }]}>
                <Select options={supplierOptions} disabled={!!editingId} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="validFrom" label="Válido desde" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="validTo" label="Válido hasta">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currency" label="Divisa" initialValue="MXN" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'MXN', label: 'MXN' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="creditDays" label="Días de Crédito">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minOrderQty" label="Cantidad Mínima">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxOrderQty" label="Cantidad Máxima">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="profitMarginSuggestion" label="Margen de Ganancia Sugerido (%)">
                <InputNumber min={0} max={100} step={0.01} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Descripción">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
