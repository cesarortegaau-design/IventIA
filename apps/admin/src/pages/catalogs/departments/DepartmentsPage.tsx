import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography } from 'antd'
import { PlusOutlined, EditOutlined, PoweroffOutlined } from '@ant-design/icons'
import { apiClient } from '../../../api/client'

const { Title } = Typography

export default function DepartmentsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.get('/departments').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => editingId
      ? apiClient.put(`/departments/${editingId}`, values).then(r => r.data)
      : apiClient.post('/departments', values).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Departamento guardado')
    },
  })

  const columns = [
    { title: 'Nombre', dataIndex: 'name' },
    { title: 'Tipo', dataIndex: 'type', render: (v: string) => <Tag color={v === 'INTERNAL' ? 'blue' : 'orange'}>{v === 'INTERNAL' ? 'Interno' : 'Externo'}</Tag> },
    { title: 'Usuarios', render: (_: any, r: any) => r._count?.userDepartments ?? 0 },
    { title: 'Recursos', render: (_: any, r: any) => r._count?.resources ?? 0 },
    { title: 'Activo', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    {
      title: '', key: 'actions', render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); form.setFieldsValue(r); setModalOpen(true) }} />
          <Button size="small" icon={<PoweroffOutlined />} onClick={() => apiClient.patch(`/departments/${r.id}/toggle`).then(() => queryClient.invalidateQueries({ queryKey: ['departments'] }))} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Departamentos Operativos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Nuevo Departamento
        </Button>
      </Row>
      <Card>
        <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>
      <Modal title={editingId ? 'Editar Departamento' : 'Nuevo Departamento'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={saveMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Tipo" initialValue="INTERNAL">
            <Select options={[{ value: 'INTERNAL', label: 'Interno' }, { value: 'EXTERNAL', label: 'Externo' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
