import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography, Drawer, InputNumber, DatePicker, Popconfirm, Badge, Divider } from 'antd'
import { PlusOutlined, EditOutlined, KeyOutlined, StopOutlined, CopyOutlined } from '@ant-design/icons'
import { suppliersApi } from '../../../api/suppliers'
import dayjs from 'dayjs'

const { Title } = Typography

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
  const [codesDrawer, setCodesDrawer] = useState<{ open: boolean; supplier: any | null }>({ open: false, supplier: null })

  const { data: codesData, isLoading: loadingCodes } = useQuery({
    queryKey: ['supplier-portal-codes', codesDrawer.supplier?.id],
    queryFn: () => suppliersApi.listPortalCodes(codesDrawer.supplier!.id),
    enabled: codesDrawer.open && !!codesDrawer.supplier,
  })

  const generateCodesMut = useMutation({
    mutationFn: (values: any) => suppliersApi.generatePortalCodes(codesDrawer.supplier!.id, {
      count: values.count,
      maxUses: values.maxUses,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-codes', codesDrawer.supplier?.id] })
      message.success(`${data.meta?.created} código(s) generado(s)`)
      codesForm.resetFields()
    },
    onError: () => message.error('Error al generar códigos'),
  })

  const revokeCodeMut = useMutation({
    mutationFn: (codeId: string) => suppliersApi.revokePortalCode(codesDrawer.supplier!.id, codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-codes', codesDrawer.supplier?.id] })
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

  const columns = [
    { title: 'Código', dataIndex: 'code', width: 100 },
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Tipo', dataIndex: 'type', render: (v: string) => {
      const type = SUPPLIER_TYPES.find(t => t.value === v)
      return <Tag>{type?.label}</Tag>
    } },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Teléfono', dataIndex: 'phone' },
    { title: 'Estado', dataIndex: 'status', render: (v: string) => {
      const status = SUPPLIER_STATUSES.find(s => s.value === v)
      const color = v === 'ACTIVE' ? 'green' : v === 'INACTIVE' ? 'orange' : 'red'
      return <Tag color={color}>{status?.label}</Tag>
    } },
    {
      title: '',
      key: 'actions',
      width: 130,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} title="Editar" />
          <Button size="small" icon={<KeyOutlined />} onClick={() => setCodesDrawer({ open: true, supplier: r })} title="Códigos Portal" />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Proveedores</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Nuevo Proveedor
        </Button>
      </Row>
      <Card>
        <Table
          dataSource={suppliersData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: suppliersData?.meta?.total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>
      {/* Portal Codes Drawer */}
      <Drawer
        title={<Space><KeyOutlined /><span>Códigos Portal — {codesDrawer.supplier?.name}</span></Space>}
        open={codesDrawer.open}
        onClose={() => setCodesDrawer({ open: false, supplier: null })}
        width={540}
      >
        <Form form={codesForm} layout="inline" onFinish={generateCodesMut.mutate} style={{ marginBottom: 16 }}>
          <Form.Item name="count" label="Cantidad" initialValue={5}>
            <InputNumber min={1} max={100} style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="maxUses" label="Usos máx." initialValue={1}>
            <InputNumber min={1} style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="expiresAt" label="Expira">
            <DatePicker showTime disabledDate={d => d && d.isBefore(dayjs())} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={generateCodesMut.isPending} icon={<PlusOutlined />}>
              Generar
            </Button>
          </Form.Item>
        </Form>
        <Divider style={{ margin: '8px 0 16px' }} />
        <Table
          dataSource={codesData ?? []}
          loading={loadingCodes}
          rowKey="id"
          size="small"
          pagination={false}
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
              width: 70,
            },
            {
              title: 'Expira',
              dataIndex: 'expiresAt',
              render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
              width: 120,
            },
            {
              title: '',
              width: 50,
              render: (_: any, rec: any) => rec.isActive ? (
                <Popconfirm title="¿Revocar este código?" onConfirm={() => revokeCodeMut.mutate(rec.id)}>
                  <Button size="small" danger icon={<StopOutlined />} title="Revocar" />
                </Popconfirm>
              ) : <Tag color="red">Inactivo</Tag>,
            },
          ]}
        />
      </Drawer>

      <Modal
        title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={saveMutation.isPending}
      >
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
      </Modal>
    </div>
  )
}
