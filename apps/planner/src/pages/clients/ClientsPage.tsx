import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Input, Button, Row, Col, Card, Typography, Space, Avatar, Empty,
  Spin, Modal, Form, App, Popconfirm, Select,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, MailOutlined, PhoneOutlined,
  DeleteOutlined, EyeOutlined, BuildOutlined, CloseOutlined,
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

interface ClientDraft {
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  notes: string
}

function clientToDraft(c: any): ClientDraft {
  return {
    firstName:   c.firstName   || '',
    lastName:    c.lastName    || '',
    companyName: c.companyName || '',
    email:       c.email       || '',
    phone:       c.phone       || '',
    notes:       c.notes       || '',
  }
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  // HSODAK panel state
  const [selected, setSelected] = useState<any | null>(null)
  const [draft, setDraft] = useState<ClientDraft | null>(null)
  const [dirty, setDirty] = useState(false)

  const openPanel = (client: any) => {
    setSelected(client)
    setDraft(clientToDraft(client))
    setDirty(false)
  }
  const closePanel = () => { setSelected(null); setDraft(null); setDirty(false) }
  const patchDraft = (patch: Partial<ClientDraft>) => {
    setDraft(d => d ? { ...d, ...patch } : d)
    setDirty(true)
  }

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['planner-clients'] })
      // Update selected with returned data so panel reflects truth
      if (updated?.data) setSelected(updated.data)
      setDirty(false)
      message.success('Cliente actualizado')
    },
    onError: () => message.error('Error al actualizar cliente'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-clients'] })
      message.success('Cliente eliminado')
      closePanel()
    },
    onError: () => message.error('Error al eliminar'),
  })

  const handleSavePanel = () => {
    if (!selected || !draft) return
    updateMutation.mutate({ id: selected.id, data: draft })
  }

  const EditPanel = () => {
    if (!selected || !draft) return null
    const color = avatarColor(selected.id)
    const displayName = draft.companyName || `${draft.firstName} ${draft.lastName}`.trim() || '—'

    return (
      <div style={{
        width: 300,
        flexShrink: 0,
        borderLeft: '1px solid #EDE9FE',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #EDE9FE',
          background: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={36}
              style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, fontSize: 14, fontWeight: 700, flexShrink: 0 }}
            >
              {initials(selected)}
            </Avatar>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{displayName}</div>
              <div style={{ fontSize: 10, color: '#aaa' }}>Editar cliente</div>
            </div>
          </div>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={closePanel} style={{ color: '#aaa' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>NOMBRE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={draft.firstName}
                onChange={e => patchDraft({ firstName: e.target.value })}
                placeholder="Nombre"
                style={{ borderRadius: 8, flex: 1 }}
              />
              <Input
                value={draft.lastName}
                onChange={e => patchDraft({ lastName: e.target.value })}
                placeholder="Apellido"
                style={{ borderRadius: 8, flex: 1 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>EMPRESA</div>
            <Input
              value={draft.companyName}
              onChange={e => patchDraft({ companyName: e.target.value })}
              placeholder="Nombre de la empresa"
              prefix={<BuildOutlined style={{ color: '#aaa' }} />}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>CONTACTO</div>
            <Input
              value={draft.email}
              onChange={e => patchDraft({ email: e.target.value })}
              placeholder="correo@ejemplo.com"
              prefix={<MailOutlined style={{ color: '#aaa' }} />}
              style={{ borderRadius: 8, marginBottom: 8 }}
            />
            <Input
              value={draft.phone}
              onChange={e => patchDraft({ phone: e.target.value })}
              placeholder="Teléfono"
              prefix={<PhoneOutlined style={{ color: '#aaa' }} />}
              style={{ borderRadius: 8 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.1em', marginBottom: 6 }}>NOTAS</div>
            <Input.TextArea
              value={draft.notes}
              onChange={e => patchDraft({ notes: e.target.value })}
              rows={3}
              placeholder="Observaciones..."
              style={{ borderRadius: 8, resize: 'none' }}
            />
          </div>

          <Button
            size="small" type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/clientes/${selected.id}`)}
            style={{ color: '#7C3AED', padding: 0 }}
          >
            Ver perfil completo
          </Button>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #EDE9FE', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            type="primary"
            disabled={!dirty}
            loading={updateMutation.isPending}
            onClick={handleSavePanel}
            style={{
              background: dirty ? '#059669' : undefined,
              borderColor: dirty ? '#059669' : undefined,
              borderRadius: 8, fontWeight: 600, width: '100%',
            }}
          >
            Guardar cambios
          </Button>
          <Popconfirm
            title="¿Eliminar este cliente?"
            onConfirm={() => deleteMutation.mutate(selected.id)}
            okButtonProps={{ danger: true }}
            okText="Sí, eliminar"
            cancelText="Cancelar"
          >
            <Button danger loading={deleteMutation.isPending} style={{ borderRadius: 8, width: '100%' }}>
              Eliminar cliente
            </Button>
          </Popconfirm>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 104px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        padding: '0 0 16px 0', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Clientes</Title>
        <Space>
          <Input
            placeholder="Buscar cliente..."
            prefix={<SearchOutlined style={{ color: 'var(--pl-primary)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, borderRadius: 10 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', height: 40, borderRadius: 10, fontWeight: 600 }}
          >
            Nuevo cliente
          </Button>
        </Space>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 400 }}>

        {/* Left: grid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
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
                const isSelected = selected?.id === client.id
                return (
                  <Col xs={24} sm={12} lg={8} key={client.id}>
                    <Card
                      onClick={() => openPanel(client)}
                      style={{
                        borderRadius: 16,
                        border: isSelected ? '2px solid #7C3AED' : '1px solid var(--pl-border)',
                        boxShadow: isSelected ? '0 0 0 3px #EDE9FE' : 'var(--pl-shadow)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
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

                      <div
                        style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}
                        onClick={e => e.stopPropagation()}
                      >
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
                          okButtonProps={{ danger: true }}
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
        </div>

        {/* Right: edit panel */}
        <EditPanel />
      </div>

      {/* Create modal */}
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
