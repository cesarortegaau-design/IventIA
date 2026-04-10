import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Row, Col, App, Typography, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { warehouseApi } from '../../api/warehouse'

const { Title } = Typography

export default function WarehousesPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ['warehouses', page, pageSize],
    queryFn: () => warehouseApi.listWarehouses({ page, pageSize }).then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editingId
        ? Promise.resolve(null) // Cannot edit warehouses
        : warehouseApi.createWarehouse(values).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Almacén creado')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error')
    },
  })

  function openNew() {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const columns = [
    { title: 'Código', dataIndex: 'code', width: 100 },
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Descripción', dataIndex: 'description', render: (v: string) => v || '-' },
    { title: 'Dirección', dataIndex: 'address', render: (v: string) => v || '-' },
    { title: 'Capacidad', dataIndex: 'capacity', render: (v: number) => v ? `${v} m²` : '-' },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} disabled title="Ver detalle" />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Almacenes</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
          Nuevo Almacén
        </Button>
      </Row>
      <Card>
        <Table
          dataSource={warehousesData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: warehousesData?.meta?.total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>
      <Modal
        title="Nuevo Almacén"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Código" rules={[{ required: true }]}>
                <Input placeholder="Ej: ALM-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Ej: Almacén Principal" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Descripción">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="Dirección">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="capacity" label="Capacidad (m²)" type="number">
                <InputNumber min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
