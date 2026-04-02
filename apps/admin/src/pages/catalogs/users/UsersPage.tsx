import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Modal, Form, Input, Select, Row, Col, App, Typography, Checkbox } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { apiClient } from '../../../api/client'
import { PRIVILEGES } from '@iventia/shared'

const { Title } = Typography

const PRIVILEGE_LABELS: Record<string, string> = {
  [PRIVILEGES.EVENT_CREATE_QUOTED]: 'Crear eventos (Cotizado)',
  [PRIVILEGES.EVENT_CREATE_CONFIRMED]: 'Crear eventos (Confirmado)',
  [PRIVILEGES.ORDER_CREATE]: 'Crear órdenes',
  [PRIVILEGES.ORDER_CONFIRM]: 'Confirmar órdenes',
  [PRIVILEGES.ORDER_CANCEL]: 'Cancelar órdenes',
  [PRIVILEGES.ORDER_RECORD_PAYMENT]: 'Registrar pagos',
  [PRIVILEGES.ORDER_ATTACH_INVOICE]: 'Adjuntar facturas',
  [PRIVILEGES.ORDER_DISCOUNT_ASSIGN]: 'Asignar descuentos',
  [PRIVILEGES.ORDER_CREATE_CREDIT_NOTE]: 'Crear notas de crédito',
  [PRIVILEGES.CATALOG_RESOURCES_MANAGE]: 'Administrar recursos',
  [PRIVILEGES.CATALOG_PRICE_LISTS_MANAGE]: 'Administrar listas de precio',
  [PRIVILEGES.CATALOG_CLIENTS_MANAGE]: 'Administrar clientes',
  [PRIVILEGES.DASHBOARD_ACCOUNTING]: 'Dashboard Contabilidad',
  [PRIVILEGES.DASHBOARD_OPERATIONS]: 'Dashboard Operaciones',
}

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

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const privileges = Object.entries(PRIVILEGES).map(([, key]) => ({
        privilegeKey: key,
        granted: (values.privileges ?? []).includes(key),
      }))
      const payload = { ...values, privileges, privileges: privileges }
      delete payload.privilegeKeys
      return editingId
        ? apiClient.put(`/users/${editingId}`, { ...values, privileges }).then(r => r.data)
        : apiClient.post('/users', { ...values, privileges }).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Usuario guardado')
    },
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      departmentIds: record.userDepartments?.map((ud: any) => ud.department.id),
      privileges: record.privileges?.filter((p: any) => p.granted).map((p: any) => p.privilegeKey),
      password: undefined,
    })
    setModalOpen(true)
  }

  const columns = [
    { title: 'Nombre', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Rol', dataIndex: 'role', render: (v: string) => <Tag color={v === 'ADMIN' ? 'red' : v === 'NORMAL' ? 'blue' : 'default'}>{v}</Tag> },
    { title: 'Departamentos', render: (_: any, r: any) => r.userDepartments?.map((ud: any) => ud.department.name).join(', ') },
    { title: 'Activo', dataIndex: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
    { title: '', key: 'actions', render: (_: any, r: any) => <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /> },
  ]

  const deptOptions = (deptsData?.data ?? []).map((d: any) => ({ value: d.id, label: d.name }))

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Usuarios y Privilegios</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Nuevo Usuario
        </Button>
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
            <Col span={24}>
              <Form.Item name="departmentIds" label="Departamentos">
                <Select mode="multiple" options={deptOptions} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="privileges" label="Privilegios">
                <Checkbox.Group
                  options={Object.entries(PRIVILEGE_LABELS).map(([value, label]) => ({ value, label }))}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
