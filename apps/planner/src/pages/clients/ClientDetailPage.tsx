import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Typography, Avatar, Button, Tabs, Spin, Alert, Tag, Space,
  Form, Input, Select, Table, Modal, App, Timeline, Row, Col, Empty,
} from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, MailOutlined, PhoneOutlined,
  EditOutlined, CalendarOutlined, MessageOutlined, CheckCircleOutlined,
  ClockCircleOutlined, BuildOutlined, SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { clientsApi } from '../../api/clients'
import { eventsApi } from '../../api/events'

const { Title, Text, Paragraph } = Typography

const INTERACTION_TYPES = [
  { value: 'CALL', label: 'Llamada' },
  { value: 'EMAIL', label: 'Correo' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'NOTE', label: 'Nota' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

const INTERACTION_COLORS: Record<string, string> = {
  CALL: '#0D9488',
  EMAIL: '#7C3AED',
  MEETING: '#F97316',
  NOTE: '#6B7280',
  WHATSAPP: '#059669',
}

function initials(c: any) {
  if (c.companyName) return c.companyName.slice(0, 2).toUpperCase()
  return `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase()
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [activeTab, setActiveTab] = useState('info')
  const [interactionModal, setInteractionModal] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [interactionForm] = Form.useForm()
  const [taskForm] = Form.useForm()
  const [infoForm] = Form.useForm()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['planner-client', id],
    queryFn: () => clientsApi.get(id!),
    enabled: !!id,
  })

  const { data: interactionsData } = useQuery({
    queryKey: ['planner-client-interactions', id],
    queryFn: () => clientsApi.getInteractions(id!),
    enabled: !!id,
  })

  const { data: tasksData } = useQuery({
    queryKey: ['planner-client-tasks', id],
    queryFn: () => clientsApi.getTasks(id!),
    enabled: !!id,
  })

  const { data: eventsData } = useQuery({
    queryKey: ['planner-events'],
    queryFn: () => eventsApi.list({ pageSize: 200 }),
  })

  const createInteractionMutation = useMutation({
    mutationFn: (d: any) => clientsApi.createInteraction(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-client-interactions', id] })
      message.success('Interacción registrada')
      setInteractionModal(false)
      interactionForm.resetFields()
    },
    onError: () => message.error('Error al registrar'),
  })

  const createTaskMutation = useMutation({
    mutationFn: (d: any) => clientsApi.createTask(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-client-tasks', id] })
      message.success('Tarea creada')
      setTaskModal(false)
      taskForm.resetFields()
    },
    onError: () => message.error('Error al crear tarea'),
  })

  const updateClientMutation = useMutation({
    mutationFn: (d: any) => clientsApi.update(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-client', id] })
      message.success('Cliente actualizado')
      setEditingInfo(false)
    },
    onError: () => message.error('Error al actualizar'),
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (isError) return <Alert type="error" message="No se pudo cargar el cliente" action={<Button onClick={() => navigate('/clientes')}>Volver</Button>} />

  const client = data?.data
  if (!client) return null

  const interactions: any[] = interactionsData?.data || []
  const tasks: any[] = tasksData?.data || []
  const allEvents: any[] = eventsData?.data || []
  const clientEvents = allEvents.filter((e) => e.primaryClientId === id)

  const name = client.companyName || `${client.firstName} ${client.lastName}`

  const startEditInfo = () => {
    infoForm.setFieldsValue({
      firstName: client.firstName,
      lastName: client.lastName,
      companyName: client.companyName,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
    })
    setEditingInfo(true)
  }

  const taskColumns = [
    { title: 'Tarea', dataIndex: 'title', key: 'title', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Estado', dataIndex: 'status', key: 'status', width: 120,
      render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Vence', dataIndex: 'dueDate', key: 'dueDate', width: 130,
      render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
  ]

  const tabs = [
    {
      key: 'info',
      label: 'Información',
      children: editingInfo ? (
        <Card style={{ borderRadius: 16 }}>
          <Form form={infoForm} layout="vertical" onFinish={(vals) => updateClientMutation.mutate(vals)}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lastName" label="Apellido" rules={[{ required: true }]}><Input /></Form.Item>
              </Col>
            </Row>
            <Form.Item name="companyName" label="Empresa"><Input prefix={<BuildOutlined />} /></Form.Item>
            <Form.Item name="email" label="Correo" rules={[{ type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item>
            <Form.Item name="phone" label="Teléfono"><Input prefix={<PhoneOutlined />} /></Form.Item>
            <Form.Item name="notes" label="Notas"><Input.TextArea rows={3} /></Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateClientMutation.isPending}
                style={{ background: 'var(--pl-primary)', border: 'none' }}>Guardar</Button>
              <Button onClick={() => setEditingInfo(false)}>Cancelar</Button>
            </Space>
          </Form>
        </Card>
      ) : (
        <Card style={{ borderRadius: 16 }}
          extra={<Button icon={<EditOutlined />} onClick={startEditInfo}>Editar</Button>}
          title="Datos del cliente">
          <Row gutter={[16, 12]}>
            {[
              { label: 'Nombre', value: `${client.firstName} ${client.lastName}` },
              { label: 'Empresa', value: client.companyName || '—' },
              { label: 'Correo', value: client.email || '—' },
              { label: 'Teléfono', value: client.phone || '—' },
            ].map((f) => (
              <Col xs={24} sm={12} key={f.label}>
                <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)', textTransform: 'uppercase' }}>{f.label}</Text>
                <div style={{ fontWeight: 500, marginTop: 2 }}>{f.value}</div>
              </Col>
            ))}
            {client.notes && (
              <Col span={24}>
                <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)', textTransform: 'uppercase' }}>Notas</Text>
                <Paragraph style={{ marginTop: 4 }}>{client.notes}</Paragraph>
              </Col>
            )}
          </Row>
        </Card>
      ),
    },
    {
      key: 'interacciones',
      label: `Interacciones (${interactions.length})`,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInteractionModal(true)}
              style={{ background: 'var(--pl-primary)', border: 'none' }}>
              Registrar interacción
            </Button>
          </div>
          {interactions.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '32px 0' }}>
              <Empty description="Sin interacciones registradas" />
            </Card>
          ) : (
            <Timeline
              items={interactions.map((i) => ({
                color: INTERACTION_COLORS[i.type] || '#7C3AED',
                children: (
                  <Card style={{ borderRadius: 12, marginBottom: 4 }} styles={{ body: { padding: '12px 16px' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Space>
                        <Tag style={{ background: (INTERACTION_COLORS[i.type] || '#7C3AED') + '18', color: INTERACTION_COLORS[i.type] || '#7C3AED', border: 'none', borderRadius: 20 }}>
                          {INTERACTION_TYPES.find((t) => t.value === i.type)?.label || i.type}
                        </Tag>
                      </Space>
                      <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)' }}>
                        {i.createdAt ? dayjs(i.createdAt).format('DD MMM YYYY HH:mm') : ''}
                      </Text>
                    </div>
                    {i.notes && <Paragraph style={{ margin: '8px 0 0', fontSize: 13 }}>{i.notes}</Paragraph>}
                  </Card>
                ),
              }))}
            />
          )}
        </div>
      ),
    },
    {
      key: 'tareas',
      label: `Tareas (${tasks.length})`,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModal(true)}
              style={{ background: 'var(--pl-primary)', border: 'none' }}>
              Nueva tarea
            </Button>
          </div>
          <Table dataSource={tasks} columns={taskColumns} rowKey="id" size="small" pagination={false} />
        </div>
      ),
    },
    {
      key: 'eventos',
      label: `Eventos (${clientEvents.length})`,
      children: (
        <Row gutter={[16, 16]}>
          {clientEvents.length === 0 ? (
            <Col span={24}>
              <Card style={{ borderRadius: 16, textAlign: 'center', padding: '32px 0' }}>
                <Empty description="Sin eventos asociados" />
              </Card>
            </Col>
          ) : clientEvents.map((ev) => (
            <Col xs={24} sm={12} key={ev.id}>
              <Card
                hoverable
                onClick={() => navigate(`/eventos/${ev.id}`)}
                style={{ borderRadius: 14, cursor: 'pointer', border: '1px solid var(--pl-border)' }}
                styles={{ body: { padding: 16 } }}
              >
                <Text strong style={{ display: 'block', marginBottom: 4 }}>{ev.name}</Text>
                <Space>
                  <Tag>{ev.status}</Tag>
                  {ev.eventStart && (
                    <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      {dayjs(ev.eventStart).format('D MMM YYYY')}
                    </Text>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clientes')} />
        <Avatar
          size={56}
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', fontSize: 20, fontWeight: 700, flexShrink: 0 }}
        >
          {initials(client)}
        </Avatar>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800 }}>{name}</Title>
          <Space size={12}>
            {client.email && <Text style={{ fontSize: 13, color: 'var(--pl-text-secondary)' }}><MailOutlined style={{ marginRight: 4 }} />{client.email}</Text>}
            {client.phone && <Text style={{ fontSize: 13, color: 'var(--pl-text-secondary)' }}><PhoneOutlined style={{ marginRight: 4 }} />{client.phone}</Text>}
          </Space>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabs}
        style={{ background: '#fff', borderRadius: 16, padding: '0 16px 16px', boxShadow: 'var(--pl-shadow)' }}
      />

      {/* Interaction Modal */}
      <Modal
        title="Registrar interacción"
        open={interactionModal}
        onCancel={() => { setInteractionModal(false); interactionForm.resetFields() }}
        onOk={() => interactionForm.submit()}
        okText="Registrar"
        confirmLoading={createInteractionMutation.isPending}
      >
        <Form form={interactionForm} layout="vertical" onFinish={(v) => createInteractionMutation.mutate(v)}>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select options={INTERACTION_TYPES} />
          </Form.Item>
          <Form.Item name="notes" label="Notas / Resumen" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Describe la interacción..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Task Modal */}
      <Modal
        title="Nueva tarea"
        open={taskModal}
        onCancel={() => { setTaskModal(false); taskForm.resetFields() }}
        onOk={() => taskForm.submit()}
        okText="Crear"
        confirmLoading={createTaskMutation.isPending}
      >
        <Form form={taskForm} layout="vertical" onFinish={(v) => createTaskMutation.mutate(v)}>
          <Form.Item name="title" label="Tarea" rules={[{ required: true }]}>
            <Input placeholder="Descripción de la tarea" />
          </Form.Item>
          <Form.Item name="dueDate" label="Fecha límite">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
