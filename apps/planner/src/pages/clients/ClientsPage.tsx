import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Input, Button, Row, Col, Card, Typography, Space, Avatar, Empty,
  Spin, Modal, Form, App, Popconfirm, Tag,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, MailOutlined, PhoneOutlined,
  DeleteOutlined, EyeOutlined, BuildOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { clientsApi } from '../../api/clients'

const { Title, Text } = Typography

function initials(c: any) {
  if (c.companyName) return c.companyName.slice(0, 2).toUpperCase()
  return `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase()
}

const AVATAR_COLORS = ['#7C3AED', '#EC4899', '#F97316', '#0D9488', '#2563EB', '#059669']

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['planner-clients', search],
    queryFn: () => clientsApi.list({ search: search || undefined, pageSize: 100 }),
  })
  const clients: any[] = data?.data || []

  const createMutation = useMutation({
    mutationFn: (d: any) => clientsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-clients'] })
      message.success('Cliente creado')
      setModalOpen(false)
      form.resetFields()
    },
    onError: () => message.error('Error al crear cliente'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-clients'] })
      message.success('Cliente eliminado')
    },
    onError: () => message.error('Error al eliminar'),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Clientes</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', height: 40, borderRadius: 10, fontWeight: 600 }}
        >
          Nuevo cliente
        </Button>
      </div>

      <Input
        placeholder="Buscar cliente..."
        prefix={<SearchOutlined style={{ color: 'var(--pl-primary)' }} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 300, borderRadius: 10, marginBottom: 20 }}
        allowClear
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : clients.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}>
          <Empty description="No se encontraron clientes" />
          <Button type="primary" onClick={() => setModalOpen(true)} style={{ marginTop: 16 }}>
            Agregar cliente
          </Button>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {clients.map((client) => {
            const color = avatarColor(client.id)
            const name = client.companyName || `${client.firstName} ${client.lastName}`
            return (
              <Col xs={24} sm={12} lg={8} key={client.id}>
                <Card
                  style={{
                    borderRadius: 16,
                    border: '1px solid var(--pl-border)',
                    boxShadow: 'var(--pl-shadow)',
                    transition: 'all 0.2s',
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                    <Avatar
                      size={48}
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: 18, fontWeight: 700, flexShrink: 0 }}
                    >
                      {initials(client)}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 2 }}>{name}</Text>
                      {client.companyName && (
                        <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>
                          {client.firstName} {client.lastName}
                        </Text>
                      )}
                    </div>
                  </div>

                  {client.email && (
                    <Space size={6} style={{ marginBottom: 4 }}>
                      <MailOutlined style={{ fontSize: 12, color: 'var(--pl-primary)' }} />
                      <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>{client.email}</Text>
                    </Space>
                  )}
                  {client.phone && (
                    <Space size={6} style={{ marginBottom: 4, display: 'flex' }}>
                      <PhoneOutlined style={{ fontSize: 12, color: 'var(--pl-teal)' }} />
                      <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>{client.phone}</Text>
                    </Space>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/clientes/${client.id}`)}
                      style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
                    >
                      Ver
                    </Button>
                    <Popconfirm
                      title="¿Eliminar este cliente?"
                      onConfirm={() => deleteMutation.mutate(client.id)}
                    >
                      <Button size="small" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      <Modal
        title="Nuevo cliente"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="Crear"
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(vals) => createMutation.mutate(vals)}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="companyName" label="Empresa">
            <Input prefix={<BuildOutlined />} />
          </Form.Item>
          <Form.Item name="email" label="Correo" rules={[{ type: 'email' }]}>
            <Input prefix={<MailOutlined />} />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono">
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
