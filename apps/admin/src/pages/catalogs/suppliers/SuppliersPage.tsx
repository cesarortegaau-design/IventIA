import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography, Tabs, InputNumber, DatePicker, Popconfirm, Badge, Divider, Avatar } from 'antd'
import { PlusOutlined, EditOutlined, KeyOutlined, StopOutlined, SearchOutlined, EyeOutlined, StarFilled } from '@ant-design/icons'
import { suppliersApi } from '../../../api/suppliers'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const PURPLE = '#6B46C1'

const SUPPLIER_TYPES = [
  { value: 'DISTRIBUTOR', label: 'Distribuidor' },
  { value: 'MANUFACTURER', label: 'Fabricante' },
  { value: 'WHOLESALER', label: 'Mayorista' },
  { value: 'SERVICES', label: 'Servicios' },
]

const SUPPLIER_STATUSES = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'BLOCKED', label: 'Bloqueado' },
]

export default function SuppliersPage() {
  const [form] = Form.useForm()
  const [codesForm] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeModalTab, setActiveModalTab] = useState('info')

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

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', page, pageSize],
    queryFn: () => suppliersApi.list({ page, pageSize }).then(r => r.data),
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
      message.error(error.response?.data?.message || 'Error')
    },
  })

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

  const suppliers = suppliersData?.data ?? []
  const COLORS = ['#fef3c7/#92400e', '#dbeafe/#1e40af', '#fce7f3/#9f1239', '#f3e8ff/#6b21a8', '#dcfce7/#166534', '#fee2e2/#991b1b']

  const columns = [
    {
      title: 'Proveedor', key: 'name',
      render: (_: any, r: any) => {
        const initials = (r.name || '').split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
        const idx = (r.id?.charCodeAt(0) || 0) % COLORS.length
        const [bg, fg] = COLORS[idx].split('/')
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={32} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600 }}>{initials}</Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontFamily: 'monospace' }}>{r.rfc || r.code}</div>
            </div>
          </div>
        )
      },
    },
    {
      title: 'Categoría', dataIndex: 'type', width: 120,
      render: (v: string) => {
        const type = SUPPLIER_TYPES.find(t => t.value === v)
        return <Tag color="purple">{type?.label ?? v}</Tag>
      },
    },
    {
      title: 'Contacto', key: 'contact',
      render: (_: any, r: any) => (
        <div>
          {r.email && <div style={{ fontSize: 13 }}>{r.email}</div>}
          {r.phone && <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{r.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Estado', dataIndex: 'status', width: 110,
      render: (v: string) => {
        const color = v === 'ACTIVE' ? 'green' : v === 'INACTIVE' ? 'default' : 'red'
        const label = SUPPLIER_STATUSES.find(s => s.value === v)?.label ?? v
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '', key: 'actions', width: 50,
      render: (_: any, r: any) => (
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
      ),
    },
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Proveedores</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Empresas que suministran recursos, servicios y personal</Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />}>Importar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setActiveModalTab('info'); setModalOpen(true) }}>
            Nuevo proveedor
          </Button>
        </Space>
      </div>

      {/* Filters + Table */}
      <Card bodyStyle={{ padding: '12px 16px 0' }} style={{ borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Buscar proveedor…"
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="Categoría"
            allowClear
            options={SUPPLIER_TYPES}
            style={{ minWidth: 150 }}
          />
          <Select
            placeholder="Estado"
            allowClear
            options={SUPPLIER_STATUSES}
            style={{ minWidth: 130 }}
          />
        </div>
        <Table
          dataSource={suppliers}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: suppliersData?.meta?.total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            showTotal: t => `${t} proveedores`,
          }}
        />
      </Card>
      <Modal
        title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setActiveModalTab('info') }}
        onOk={activeModalTab === 'info' ? () => form.submit() : undefined}
        footer={activeModalTab === 'portal' ? null : undefined}
        width={820}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
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
              <Form.Item name="averageDeliveryDays" label="Días de Entrega Promedio" type="number">
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
    </div>
  )
}
