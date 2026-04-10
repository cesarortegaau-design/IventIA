import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Row, Col, App, Typography, Select, Modal, Form, Input, DatePicker, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supplierPriceListsApi } from '../../../api/supplierPriceLists'
import { suppliersApi } from '../../../api/suppliers'

const { Title } = Typography

export default function SupplierPriceListsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<{ supplierId?: string }>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: priceListsData, isLoading } = useQuery({
    queryKey: ['supplierPriceLists', page, pageSize, filters],
    queryFn: () => supplierPriceListsApi.list({ page, pageSize, ...filters }).then(r => r.data),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supplierPriceListsApi.removeItem(id, id).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierPriceLists'] })
      message.success('Lista eliminada')
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

  const columns = [
    { title: 'Código', dataIndex: 'code', width: 120 },
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Proveedor', render: (_: any, r: any) => r.supplier?.name },
    { title: 'Válido desde', render: (_: any, r: any) => new Date(r.validFrom).toLocaleDateString('es-MX') },
    { title: 'Válido hasta', render: (_: any, r: any) => new Date(r.validTo).toLocaleDateString('es-MX') },
    { title: 'Estado', render: (_: any, r: any) => {
      const now = new Date()
      const from = new Date(r.validFrom)
      const to = new Date(r.validTo)
      let status = 'ACTIVO'
      let color = 'green'
      if (now < from) {
        status = 'PRÓXIMO'
        color = 'orange'
      } else if (now > to) {
        status = 'EXPIRADO'
        color = 'red'
      }
      return <Tag color={color}>{status}</Tag>
    } },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} title="Editar" />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMutation.mutate(r.id)} title="Eliminar" />
        </Space>
      ),
    },
  ]

  const supplierOptions = (suppliersData?.data ?? []).map((s: any) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
  }))

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
              <Form.Item name="validTo" label="Válido hasta" rules={[{ required: true }]}>
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
              <Form.Item name="creditDays" label="Días de Crédito" type="number">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minOrderQty" label="Cantidad Mínima" type="number">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxOrderQty" label="Cantidad Máxima" type="number">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="profitMarginSuggestion" label="Margen de Ganancia Sugerido (%)" type="number">
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
