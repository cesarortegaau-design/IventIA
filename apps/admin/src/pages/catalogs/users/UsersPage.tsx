import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import { apiClient } from '../../../api/client'
import { exportToCsv } from '../../../utils/exportCsv'

const { Title } = Typography

export default function UsersPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then(r => r.data),
  })

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.get('/departments').then(r => r.data),
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => apiClient.get('/profiles').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      return editingId
        ? apiClient.put(`/users/${editingId}`, values).then(r => r.data)
        : apiClient.post('/users', values).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Usuario guardado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      departmentIds: record.userDepartments?.map((ud: any) => ud.department.id),
      profileId: record.profile?.id ?? null,
      password: undefined,
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Nombre', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Rol', dataIndex: 'role', render: (v: string) => <Tag color={v === 'ADMIN' ? 'red' : v === 'NORMAL' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Perfil', render: (_: any, r: any) => r.profile?.name ?? <Tag>Sin perfil</Tag> },
    { title: 'Departamentos', render: (_: any, r: any) => r.userDepartments?.map((ud: any) => ud.department.name).join(', ') },
    { title: 'Activo', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    { title: '', key: 'actions', render: (_: any, r: any) => <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /> },
  ]

  const deptOptions = (deptsData?.data ?? []).map((d: any) => ({ value: d.id, label: d.name }))
  const profileOptions = (profilesData?.data ?? []).map((p: any) => ({ value: p.id, label: p.name }))

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Usuarios</Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('usuarios', (usersData?.data ?? []).map((r: any) => ({
              nombre: `${r.firstName} ${r.lastName}`,
              email: r.email,
              rol: r.role,
              perfil: r.profile?.name ?? '',
              activo: r.isActive ? 'Activo' : 'Inactivo',
            })), [
              { header: 'Nombre', key: 'nombre' },
              { header: 'Email', key: 'email' },
              { header: 'Rol', key: 'rol' },
              { header: 'Perfil', key: 'perfil' },
              { header: 'Activo', key: 'activo' },
            ])}
          >
            Exportar CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            Nuevo Usuario
          </Button>
        </Space>
      </Row>
      <Card>
        <Table dataSource={usersData?.data ?? []} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>
      <Modal
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="lastName" label="Apellido(s)" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="WhatsApp / Teléfono"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="password" label={editingId ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'} rules={editingId ? [] : [{ required: true, min: 8 }]}><Input.Password /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="role" label="Rol" initialValue="NORMAL" rules={[{ required: true }]}>
                <Select options={[{ value: 'ADMIN', label: 'Administrador' }, { value: 'NORMAL', label: 'Normal' }, { value: 'READ_ONLY', label: 'Consulta' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="profileId" label="Perfil" rules={[{ required: true, message: 'Cada usuario debe tener un perfil asignado' }]}>
                <Select options={profileOptions} placeholder="Selecciona un perfil" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentIds" label="Departamentos">
                <Select mode="multiple" options={deptOptions} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
