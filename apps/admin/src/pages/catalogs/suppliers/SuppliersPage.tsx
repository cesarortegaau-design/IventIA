import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Tag, Modal, Form, Input, Select, Row, Col, App, Typography,
  Tabs, InputNumber, DatePicker, Popconfirm, Badge, Divider, Avatar,
  Space, Skeleton, Empty,
} from 'antd'
import {
  PlusOutlined, EditOutlined, KeyOutlined, StopOutlined, MoreOutlined,
  StarFilled, ThunderboltOutlined,
} from '@ant-design/icons'
import { suppliersApi } from '../../../api/suppliers'
import { approvalFlowsApi } from '../../../api/approvalFlows'
import dayjs from 'dayjs'
import { PageHeader, FilterBar, StatCard } from '../../../components/ui'
import { getInitials, getAvatarColors } from '../../../utils/format'
import ApprovalPanel from '../../../components/ApprovalPanel'

const { Text } = Typography

const SUPPLIER_TYPES = [
  { value: 'DISTRIBUTOR',  label: 'Distribuidor' },
  { value: 'MANUFACTURER', label: 'Fabricante' },
  { value: 'WHOLESALER',   label: 'Mayorista' },
  { value: 'SERVICES',     label: 'Servicios' },
]

const SUPPLIER_STATUSES = [
  { value: 'ACTIVE',   label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'BLOCKED',  label: 'Bloqueado' },
]

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green', INACTIVE: 'default', BLOCKED: 'red',
}

export default function SuppliersPage() {
  const [form] = Form.useForm()
  const [codesForm] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [activeModalTab, setActiveModalTab] = useState('info')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [availableFlows, setAvailableFlows] = useState<any[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState<string | undefined>()
  const [triggering, setTriggering] = useState(false)

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', page, pageSize],
    queryFn: () => suppliersApi.list({ page, pageSize }).then(r => r.data),
  })

  const { data: codesData, isLoading: loadingCodes } = useQuery({
    queryKey: ['supplier-portal-codes', editingId],
    queryFn: () => suppliersApi.listPortalCodes(editingId!),
    enabled: modalOpen && !!editingId,
  })

  const generateCodesMut = useMutation({
    mutationFn: (values: any) => suppliersApi.generatePortalCodes(editingId!, {
      count: values.count,
      maxUses: values.maxUses,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-codes', editingId] })
      message.success(`${data.meta?.created} código(s) generado(s)`)
      codesForm.resetFields()
    },
    onError: () => message.error('Error al generar códigos'),
  })

  const revokeCodeMut = useMutation({
    mutationFn: (codeId: string) => suppliersApi.revokePortalCode(editingId!, codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-codes', editingId] })
      message.success('Código revocado')
    },
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editingId
        ? suppliersApi.update(editingId, values).then(r => r.data)
        : suppliersApi.create(values).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setModalOpen(false)
      form.resetFields()
      message.success(editingId ? 'Proveedor actualizado' : 'Proveedor creado')
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Error')
    },
  })

  async function openTriggerModal() {
    const flows = await approvalFlowsApi.list({ objectType: 'SUPPLIER' })
    setAvailableFlows(flows ?? [])
    setSelectedFlowId(undefined)
    setTriggerModalOpen(true)
  }

  async function handleTriggerFlow() {
    if (!selectedFlowId || !editingId) return
    setTriggering(true)
    try {
      await approvalFlowsApi.triggerRequest({ flowId: selectedFlowId, objectType: 'SUPPLIER', objectId: editingId })
      message.success('Flujo de aprobación iniciado')
      setTriggerModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['approval-active', 'SUPPLIER', editingId] })
    } catch {
      message.error('Error al iniciar el flujo')
    } finally {
      setTriggering(false)
    }
  }

  function openEdit(record: any) {
    setEditingId(record.id)
    setActiveModalTab('info')
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      status: record.status,
      description: record.description,
      email: record.email,
      phone: record.phone,
      whatsapp: record.whatsapp,
      website: record.website,
      legalName: record.legalName,
      rfc: record.rfc,
      taxId: record.taxId,
      fiscalRegime: record.fiscalRegime,
      currencyCode: record.currencyCode,
      street: record.addressStreet,
      city: record.addressCity,
      state: record.addressState,
      zip: record.addressZip,
      paymentTerms: record.defaultPaymentTerms,
      averageDeliveryDays: record.averageDeliveryDays,
    })
    setModalOpen(true)
  }

  const allSuppliers: any[] = suppliersData?.data ?? []

  const stats = useMemo(() => {
    const active = allSuppliers.filter((s: any) => s.status === 'ACTIVE').length
    const inactive = allSuppliers.filter((s: any) => s.status === 'INACTIVE').length
    const blocked = allSuppliers.filter((s: any) => s.status === 'BLOCKED').length
    return { active, inactive, blocked }
  }, [allSuppliers])

  const filtered = useMemo(() => {
    return allSuppliers.filter((s: any) => {
      if (typeFilter && s.type !== typeFilter) return false
      if (statusFilter && s.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (s.name ?? '').toLowerCase()
        const rfc = (s.rfc ?? '').toLowerCase()
        const code = (s.code ?? '').toLowerCase()
        if (!name.includes(q) && !rfc.includes(q) && !code.includes(q)) return false
      }
      return true
    })
  }, [allSuppliers, typeFilter, statusFilter, search])

  const hasFilters = !!(typeFilter || statusFilter || search)

  const columns = [
    {
      title: 'Proveedor',
      render: (_: any, r: any) => {
        const { bg, fg } = getAvatarColors(r.name ?? '')
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={32} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(r.name ?? '')}
            </Avatar>
            <div>
              <Text style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{r.name}</Text>
              {(r.rfc || r.code) && (
                <Text code style={{ fontSize: 11 }}>{r.rfc || r.code}</Text>
              )}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Categoría',
      dataIndex: 'type',
      width: 130,
      render: (v: string) => {
        const type = SUPPLIER_TYPES.find(t => t.value === v)
        return <Tag color="purple">{type?.label ?? v ?? '—'}</Tag>
      },
    },
    {
      title: 'Contacto',
      render: (_: any, r: any) => (
        <div>
          {r.email && <Text style={{ fontSize: 13, display: 'block' }}>{r.email}</Text>}
          {r.phone && <Text type="secondary" style={{ fontSize: 11 }}>{r.phone}</Text>}
          {!r.email && !r.phone && <Text type="secondary">—</Text>}
        </div>
      ),
    },
    {
      title: 'OC',
      width: 60,
      render: (_: any, r: any) => (
        <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
          {r._count?.purchaseOrders ?? '—'}
        </Text>
      ),
    },
    {
      title: 'Rating',
      width: 90,
      render: (_: any, r: any) => r.rating != null ? (
        <span style={{ color: '#f59e0b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          <StarFilled style={{ fontSize: 12, marginRight: 3 }} />
          {Number(r.rating).toFixed(1)}
        </span>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => {
        const label = SUPPLIER_STATUSES.find(s => s.value === v)?.label ?? v
        return <Tag color={STATUS_COLORS[v] ?? 'default'}>{label}</Tag>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Button size="small" type="text" icon={<MoreOutlined />} onClick={() => openEdit(r)} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Proveedores"
        meta={`Empresas que suministran recursos y servicios · ${suppliersData?.meta?.total ?? allSuppliers.length} totales`}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setEditingId(null); form.resetFields(); setActiveModalTab('info'); setModalOpen(true) }}
          >
            Nuevo proveedor
          </Button>
        }
      />

      {/* KPI cards */}
      <div style={{ padding: '20px 24px 4px', background: '#fafafa' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Total proveedores" value={suppliersData?.meta?.total ?? allSuppliers.length} tone="default" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Activos" value={stats.active} tone="primary" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Inactivos" value={stats.inactive} tone="default" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Bloqueados" value={stats.blocked} tone="warning" />
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        placeholder="Buscar proveedor, RFC…"
        right={
          hasFilters ? (
            <Button
              type="link"
              style={{ color: '#6B46C1', paddingLeft: 0 }}
              onClick={() => { setTypeFilter(undefined); setStatusFilter(undefined); setSearch(''); setPage(1) }}
            >
              Limpiar filtros
            </Button>
          ) : undefined
        }
      >
        <Select
          placeholder="Categoría"
          allowClear
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1) }}
          options={SUPPLIER_TYPES}
          style={{ width: 150 }}
        />
        <Select
          placeholder="Estado"
          allowClear
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={SUPPLIER_STATUSES}
          style={{ width: 130 }}
        />
      </FilterBar>

      {/* Table */}
      <div style={{ background: '#fff' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay proveedores aún'}
            style={{ padding: 64 }}
          >
            {hasFilters && <Button onClick={() => { setTypeFilter(undefined); setStatusFilter(undefined); setSearch('') }}>Limpiar filtros</Button>}
          </Empty>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="middle"
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              pageSize,
              total: suppliersData?.meta?.total,
              showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
              showTotal: t => `${t} proveedores`,
            }}
          />
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setActiveModalTab('info') }}
        onOk={activeModalTab === 'info' ? () => form.submit() : undefined}
        footer={activeModalTab === 'portal' ? null : (activeModalTab === 'info' ? undefined : undefined)}
        width={820}
        confirmLoading={saveMutation.isPending}
        forceRender
        extra={editingId ? (
          <Button icon={<ThunderboltOutlined />} onClick={openTriggerModal} style={{ marginRight: 8 }}>
            ⚡ Flujo de aprobación
          </Button>
        ) : undefined}
      >
        {editingId && (
          <div style={{ marginBottom: 16 }}>
            <Button
              icon={<ThunderboltOutlined />}
              size="small"
              onClick={openTriggerModal}
              style={{ marginBottom: 12 }}
            >
              ⚡ Flujo de aprobación
            </Button>
            <ApprovalPanel
              objectType="SUPPLIER"
              objectId={editingId}
              onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['suppliers'] })}
            />
          </div>
        )}
        <Tabs
          activeKey={activeModalTab}
          onChange={setActiveModalTab}
          items={[
            {
              key: 'info',
              label: 'Información',
              children: (
                <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
                        <Select options={SUPPLIER_TYPES} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="email" label="Email">
                        <Input type="email" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="phone" label="Teléfono">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="whatsapp" label="WhatsApp">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="website" label="Sitio Web">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="description" label="Descripción">
                        <Input.TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="legalName" label="Razón Social">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="rfc" label="RFC">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="taxId" label="Número de Contribuyente">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="fiscalRegime" label="Régimen Fiscal">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="currencyCode" label="Divisa" initialValue="MXN">
                        <Select options={[
                          { value: 'MXN', label: 'MXN' },
                          { value: 'USD', label: 'USD' },
                          { value: 'EUR', label: 'EUR' },
                        ]} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="street" label="Calle">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="city" label="Ciudad">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="state" label="Estado">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="zip" label="Código Postal">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="paymentTerms" label="Términos de Pago">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="averageDeliveryDays" label="Días de Entrega Promedio">
                        <Input type="number" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="status" label="Estado" initialValue="ACTIVE" rules={[{ required: true }]}>
                        <Select options={SUPPLIER_STATUSES} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              ),
            },
            ...(editingId ? [{
              key: 'portal',
              label: <Space><KeyOutlined />Portal de Proveedores</Space>,
              children: (
                <div>
                  <Form form={codesForm} layout="inline" onFinish={generateCodesMut.mutate} style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <Form.Item name="count" label="Cantidad" initialValue={5} style={{ marginBottom: 0 }}>
                      <InputNumber min={1} max={100} style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item name="maxUses" label="Usos máx." initialValue={1} style={{ marginBottom: 0 }}>
                      <InputNumber min={1} style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item name="expiresAt" label="Expira" style={{ marginBottom: 0 }}>
                      <DatePicker showTime disabledDate={d => d && d.isBefore(dayjs())} />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button type="primary" htmlType="submit" loading={generateCodesMut.isPending} icon={<PlusOutlined />}>
                        Generar códigos
                      </Button>
                    </Form.Item>
                  </Form>
                  <Divider style={{ margin: '12px 0' }} />
                  <Table
                    dataSource={codesData ?? []}
                    loading={loadingCodes}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'No hay códigos generados aún' }}
                    columns={[
                      {
                        title: 'Código',
                        dataIndex: 'code',
                        render: (code: string, rec: any) => (
                          <Space>
                            <Badge status={rec.isActive ? 'success' : 'error'} />
                            <Typography.Text code copyable={{ text: code }}>{code}</Typography.Text>
                          </Space>
                        ),
                      },
                      {
                        title: 'Usos',
                        render: (_: any, rec: any) => `${rec.usedCount} / ${rec.maxUses}`,
                        width: 80,
                      },
                      {
                        title: 'Expira',
                        dataIndex: 'expiresAt',
                        render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : 'Sin expiración',
                        width: 150,
                      },
                      {
                        title: '',
                        width: 60,
                        render: (_: any, rec: any) => rec.isActive ? (
                          <Popconfirm title="¿Revocar este código?" onConfirm={() => revokeCodeMut.mutate(rec.id)}>
                            <Button size="small" danger icon={<StopOutlined />} title="Revocar" />
                          </Popconfirm>
                        ) : <Tag color="red">Inactivo</Tag>,
                      },
                    ]}
                  />
                </div>
              ),
            }] : []),
          ]}
        />
      </Modal>

      {/* Trigger approval flow modal */}
      <Modal
        title="⚡ Iniciar Flujo de Aprobación"
        open={triggerModalOpen}
        onCancel={() => setTriggerModalOpen(false)}
        onOk={handleTriggerFlow}
        okText="Iniciar flujo"
        confirmLoading={triggering}
        okButtonProps={{ disabled: !selectedFlowId }}
      >
        <p style={{ marginBottom: 12, color: 'rgba(0,0,0,0.65)' }}>
          Selecciona el flujo de aprobación a iniciar para este proveedor:
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder="Seleccionar flujo…"
          value={selectedFlowId}
          onChange={setSelectedFlowId}
          options={availableFlows.map((f: any) => ({ value: f.id, label: f.name }))}
        />
      </Modal>
    </div>
  )
}
