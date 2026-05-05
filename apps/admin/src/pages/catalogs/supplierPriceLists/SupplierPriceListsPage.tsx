import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Tag, App, Typography, Select, Modal, Form, Input,
  DatePicker, InputNumber, Popconfirm, Space, Avatar, Skeleton, Empty,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, MoreOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supplierPriceListsApi, type AddPriceListItemInput } from '../../../api/supplierPriceLists'
import { suppliersApi } from '../../../api/suppliers'
import { resourcesApi } from '../../../api/resources'
import { PageHeader, FilterBar } from '../../../components/ui'
import { getInitials, getAvatarColors } from '../../../utils/format'

const { Text } = Typography

const AVAILABILITY_OPTIONS = [
  { value: 'AVAILABLE',       label: 'Disponible' },
  { value: 'BY_ORDER',        label: 'Bajo pedido' },
  { value: 'DISCONTINUED',    label: 'Descontinuado' },
  { value: 'TEMPORARILY_OUT', label: 'Agotado temporalmente' },
]

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Activas' },
  { value: 'upcoming', label: 'Próximas' },
  { value: 'expired',  label: 'Expiradas' },
]

const EXPIRING_OPTIONS = [
  { value: '7',  label: 'Vence en 7 días' },
  { value: '15', label: 'Vence en 15 días' },
  { value: '30', label: 'Vence en 30 días' },
  { value: '60', label: 'Vence en 60 días' },
]

function getListStatus(validFrom: string, validTo?: string): { label: string; color: string; key: string } {
  const now = new Date()
  const from = new Date(validFrom)
  const to = validTo ? new Date(validTo) : null
  if (now < from) return { label: 'Próxima', color: 'orange', key: 'upcoming' }
  if (to && now > to) return { label: 'Expirada', color: 'red', key: 'expired' }
  return { label: 'Activa', color: 'green', key: 'active' }
}

function getAvailabilityTag(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    AVAILABLE:       { label: 'Disponible',  color: 'green' },
    BY_ORDER:        { label: 'Bajo pedido', color: 'blue' },
    DISCONTINUED:    { label: 'Descontinuado', color: 'red' },
    TEMPORARILY_OUT: { label: 'Agotado',     color: 'orange' },
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
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [expiringDays, setExpiringDays] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const { data: priceListsData, isLoading } = useQuery({
    queryKey: ['supplierPriceLists', page, pageSize, supplierId],
    queryFn: () => supplierPriceListsApi.list({ page, pageSize, ...(supplierId ? { supplierId } : {}) }).then(r => r.data),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

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
      message.success(editingId ? 'Lista actualizada' : 'Lista creada')
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error')
    },
  })

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
      message.error(error?.response?.data?.message || 'Error al guardar recurso')
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
      message.error(error?.response?.data?.message || 'Error al eliminar')
    },
  })

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

  const existingResourceIds = new Set((detail?.items ?? []).map((item: any) => item.resourceId))
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

  // Filter client-side by status and expiring days
  const allLists: any[] = priceListsData?.data ?? []
  const filteredLists = allLists.filter((r: any) => {
    const st = getListStatus(r.validFrom, r.validTo)
    if (statusFilter && st.key !== statusFilter) return false
    if (expiringDays && r.validTo) {
      const daysLeft = dayjs(r.validTo).diff(dayjs(), 'day')
      if (daysLeft < 0 || daysLeft > parseInt(expiringDays)) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const supplierName = r.supplier?.name?.toLowerCase() ?? ''
      const name = r.name?.toLowerCase() ?? ''
      const code = r.code?.toLowerCase() ?? ''
      if (!supplierName.includes(q) && !name.includes(q) && !code.includes(q)) return false
    }
    return true
  })

  const hasFilters = !!(supplierId || statusFilter || expiringDays || search)
  function clearFilters() {
    setSupplierId(undefined)
    setStatusFilter(undefined)
    setExpiringDays(undefined)
    setSearch('')
    setPage(1)
  }

  // Detail view (items management)
  if (selectedPriceListId && detail) {
    const items = detail.items ?? []
    const { bg, fg } = getAvatarColors(detail.supplier?.name ?? '')

    return (
      <div>
        <PageHeader
          title={detail.name}
          meta={`${detail.supplier?.name ?? '—'} · ${detail.code} · ${items.length} recursos`}
          actions={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedPriceListId(null)}>
                Volver
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddItem}>
                Agregar recurso
              </Button>
            </Space>
          }
        />

        <div style={{ background: '#fff' }}>
          {detailLoading ? (
            <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
          ) : items.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No hay recursos en esta lista"
              style={{ padding: 64 }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddItem}>Agregar recurso</Button>
            </Empty>
          ) : (
            <Table
              dataSource={items}
              rowKey="id"
              size="middle"
              pagination={false}
              columns={[
                {
                  title: 'Código',
                  width: 120,
                  render: (_: any, r: any) => (
                    <Text code style={{ fontSize: 12 }}>{r.resource?.code}</Text>
                  ),
                },
                {
                  title: 'Recurso',
                  render: (_: any, r: any) => (
                    <div>
                      <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.resource?.name}</Text>
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{r.resource?.unit}</div>
                    </div>
                  ),
                },
                {
                  title: 'SKU Proveedor',
                  dataIndex: 'supplierSku',
                  width: 130,
                  render: (v: string) => v
                    ? <Text code style={{ fontSize: 12 }}>{v}</Text>
                    : <Text type="secondary">—</Text>,
                },
                {
                  title: 'Precio Unitario',
                  width: 130,
                  render: (_: any, r: any) => (
                    <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${parseFloat(r.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Text>
                  ),
                },
                {
                  title: 'Días Entrega',
                  dataIndex: 'deliveryTimeDays',
                  width: 110,
                  render: (v: number) => v != null ? `${v} días` : <Text type="secondary">—</Text>,
                },
                {
                  title: 'Disponibilidad',
                  width: 140,
                  render: (_: any, r: any) => getAvailabilityTag(r.availabilityStatus),
                },
                {
                  title: '',
                  key: 'actions',
                  width: 80,
                  render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditItem(r)} />
                      <Popconfirm title="¿Eliminar este recurso?" onConfirm={() => removeItemMutation.mutate(r.id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </div>

        <Modal
          title={editingItemId ? 'Editar Recurso' : 'Agregar Recurso'}
          open={itemModalOpen}
          onCancel={() => { setItemModalOpen(false); setEditingItemId(null) }}
          onOk={() => itemForm.submit()}
          confirmLoading={addItemMutation.isPending}
          width={600}
          forceRender
        >
          <Form form={itemForm} layout="vertical" onFinish={addItemMutation.mutate}>
            <Form.Item name="resourceId" label="Recurso" rules={[{ required: true, message: 'Selecciona un recurso' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Buscar recurso..."
                options={resourceOptions}
                disabled={!!editingItemId}
              />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="unitPrice" label="Precio Unitario" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" />
              </Form.Item>
              <Form.Item name="supplierSku" label="SKU Proveedor">
                <Input placeholder="Código del proveedor" />
              </Form.Item>
              <Form.Item name="availabilityStatus" label="Disponibilidad">
                <Select options={AVAILABILITY_OPTIONS} />
              </Form.Item>
              <Form.Item name="deliveryTimeDays" label="Días de Entrega">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </div>
    )
  }

  // List view
  return (
    <div>
      <PageHeader
        title="Listas de Precio — Proveedores"
        meta={`Tarifas de compra por proveedor · ${priceListsData?.meta?.total ?? allLists.length} listas`}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            Nueva Lista
          </Button>
        }
      />

      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        placeholder="Buscar proveedor, lista…"
        right={
          hasFilters ? (
            <Button type="link" style={{ color: '#6B46C1', paddingLeft: 0 }} onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : undefined
        }
      >
        <Select
          placeholder="Proveedor"
          allowClear
          value={supplierId}
          onChange={(v) => { setSupplierId(v); setPage(1) }}
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={supplierOptions}
          style={{ minWidth: 200 }}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={STATUS_OPTIONS}
          style={{ width: 130 }}
        />
        <Select
          placeholder="Por vencer"
          allowClear
          value={expiringDays}
          onChange={(v) => { setExpiringDays(v); setPage(1) }}
          options={EXPIRING_OPTIONS}
          style={{ width: 160 }}
        />
      </FilterBar>

      <div style={{ background: '#fff' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : filteredLists.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay listas de precios aún'}
            style={{ padding: 64 }}
          >
            {hasFilters && <Button onClick={clearFilters}>Limpiar filtros</Button>}
          </Empty>
        ) : (
          <Table
            dataSource={filteredLists}
            rowKey="id"
            size="middle"
            pagination={{
              current: page,
              pageSize,
              total: priceListsData?.meta?.total,
              showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
              showTotal: t => `${t} listas`,
            }}
            columns={[
              {
                title: 'Proveedor',
                render: (_: any, r: any) => {
                  const name = r.supplier?.name ?? '—'
                  const { bg, fg } = getAvatarColors(name)
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar size={28} style={{ background: bg, color: fg, fontSize: 11, flexShrink: 0 }}>
                        {getInitials(name)}
                      </Avatar>
                      <Text style={{ fontSize: 13, fontWeight: 500 }}>{name}</Text>
                    </div>
                  )
                },
              },
              {
                title: 'Lista',
                render: (_: any, r: any) => (
                  <div>
                    <Text style={{ fontSize: 13 }}>{r.name}</Text>
                    <div>
                      <Text code style={{ fontSize: 11 }}>{r.code}</Text>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Moneda',
                dataIndex: 'currency',
                width: 80,
                render: (v: string) => <Tag>{v || 'MXN'}</Tag>,
              },
              {
                title: 'Items',
                width: 70,
                render: (_: any, r: any) => (
                  <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{r._count?.items ?? 0}</Text>
                ),
              },
              {
                title: 'Vigencia',
                width: 180,
                render: (_: any, r: any) => (
                  <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    {r.validFrom ? dayjs(r.validFrom).format('DD/MM/YY') : '—'}
                    {' → '}
                    {r.validTo ? dayjs(r.validTo).format('DD/MM/YY') : '∞'}
                  </span>
                ),
              },
              {
                title: 'Condiciones',
                render: (_: any, r: any) => r.description
                  ? (
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, display: 'block', maxWidth: 240 }}
                      ellipsis={{ tooltip: r.description }}
                    >
                      {r.description}
                    </Text>
                  )
                  : <Text type="secondary">—</Text>,
              },
              {
                title: 'Estado',
                width: 90,
                render: (_: any, r: any) => {
                  const st = getListStatus(r.validFrom, r.validTo)
                  return <Tag color={st.color}>{st.label}</Tag>
                },
              },
              {
                title: '',
                key: 'actions',
                width: 80,
                fixed: 'right' as const,
                render: (_: any, r: any) => (
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, color: '#6B46C1' }}
                      onClick={() => setSelectedPriceListId(r.id)}
                    >
                      Recursos
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      onClick={() => openEdit(r)}
                    />
                  </Space>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        title={editingId ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={saveMutation.isPending}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="supplierId" label="Proveedor" rules={[{ required: true }]}>
              <Select options={supplierOptions} disabled={!!editingId} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="validFrom" label="Válido desde" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="validTo" label="Válido hasta">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="currency" label="Divisa" initialValue="MXN" rules={[{ required: true }]}>
              <Select options={[
                { value: 'MXN', label: 'MXN' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]} />
            </Form.Item>
            <Form.Item name="creditDays" label="Días de Crédito">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minOrderQty" label="Cantidad Mínima">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxOrderQty" label="Cantidad Máxima">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="profitMarginSuggestion" label="Margen Sugerido (%)">
              <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Condiciones / Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
