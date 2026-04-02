import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Card, Input, Select, Space, Tag, Modal, Form, Typography,
  Row, Col, App, Switch, Tabs, InputNumber
} from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined } from '@ant-design/icons'
import { resourcesApi } from '../../../api/resources'

const { Title } = Typography

const TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: 'Consumible', EQUIPMENT: 'Equipo', SPACE: 'Espacio',
  FURNITURE: 'Mobiliario', SERVICE: 'Servicio', DISCOUNT: 'Descuento', TAX: 'Impuesto',
}
const TYPE_COLORS: Record<string, string> = {
  CONSUMABLE: 'orange', EQUIPMENT: 'blue', SPACE: 'green',
  FURNITURE: 'purple', SERVICE: 'cyan', DISCOUNT: 'red', TAX: 'gold',
}

export default function ResourcesPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filters, setFilters] = useState({ type: '', search: '', active: 'true' })

  const { data, isLoading } = useQuery({
    queryKey: ['resources', filters],
    queryFn: () => resourcesApi.list({ ...filters, pageSize: 100 }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => editingId
      ? resourcesApi.update(editingId, values)
      : resourcesApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      setModalOpen(false)
      form.resetFields()
      message.success(editingId ? 'Recurso actualizado' : 'Recurso creado')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })

  function openCreate() {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const columns = [
    { title: 'Código', dataIndex: 'code', key: 'code', width: 100 },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Tipo', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={TYPE_COLORS[v]}>{TYPE_LABELS[v]}</Tag>,
    },
    { title: 'Departamento', render: (_: any, r: any) => r.department?.name },
    { title: 'Stock', dataIndex: 'stock', key: 'stock' },
    { title: 'Unidad', dataIndex: 'unit', key: 'unit' },
    {
      title: 'Portal', dataIndex: 'portalVisible', key: 'portal',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Visible' : 'Oculto'}</Tag>,
    },
    {
      title: 'Activo', dataIndex: 'isActive', key: 'active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Acciones', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button size="small" icon={<PoweroffOutlined />} onClick={() => toggleMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ]

  const tabs = ['Todos', ...Object.keys(TYPE_LABELS)].map(t => ({
    key: t === 'Todos' ? '' : t,
    label: t === 'Todos' ? 'Todos' : TYPE_LABELS[t],
  }))

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Catálogo de Recursos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Agregar Recurso</Button>
      </Row>

      <Card>
        <Tabs
          items={tabs}
          onChange={(key) => setFilters(f => ({ ...f, type: key }))}
          style={{ marginBottom: 8 }}
          tabBarExtraContent={
            <Space>
              <Input.Search placeholder="Buscar..." onSearch={v => setFilters(f => ({ ...f, search: v }))} allowClear style={{ width: 200 }} />
              <Select
                value={filters.active}
                onChange={v => setFilters(f => ({ ...f, active: v }))}
                options={[{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }, { value: '', label: 'Todos' }]}
                style={{ width: 100 }}
              />
            </Space>
          }
        />
        <Table
          dataSource={data?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, total: data?.meta?.total }}
        />
      </Card>

      <Modal
        title={editingId ? 'Editar Recurso' : 'Agregar Recurso'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Tabs items={[
            {
              key: '1', label: 'Paso 1 — Tipo',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="type" label="Tipo de Recurso" rules={[{ required: true }]}>
                      <Select options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="code" label="Código" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="unit" label="Unidad">
                      <Input placeholder="pza, hr, m2..." />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="portalVisible" label="Visible en Portal" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="description" label="Notas">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: '2', label: 'Paso 2 — Datos',
              children: (
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="stock" label="Stock"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item name="stockLocation" label="Ubicación de Stock"><Input /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="recoveryTime" label="Tiempo de Recuperación (hrs)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="areaSqm" label="Metros Cuadrados"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="capacity" label="Capacidad"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="checkStock" label="Checar Stock" valuePropName="checked"><Switch /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="checkDuplicate" label="Checar Duplicado" valuePropName="checked"><Switch /></Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: '3', label: 'Paso 3 — Portal',
              children: (
                <>
                  <Form.Item name="portalDesc" label="Descripción para Portal">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </>
              ),
            },
          ]} />
        </Form>
      </Modal>
    </div>
  )
}
