import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Typography, Tag, Button, Tabs, Timeline, List, Avatar,
  Form, Input, Select, DatePicker, Modal, Popconfirm, Badge, Empty, Spin,
  Space, Tooltip, Divider,
} from 'antd'
import {
  ArrowLeftOutlined, PhoneOutlined, MailOutlined, MessageOutlined,
  TeamOutlined, FileTextOutlined, PlusOutlined, CheckOutlined,
  DeleteOutlined, EditOutlined, UserOutlined, CalendarOutlined,
  ShoppingCartOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { crmApi } from '../../api/crm'

const { Title, Text } = Typography
const { TextArea } = Input

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CALL:      { label: 'Llamada',  color: 'blue',   icon: <PhoneOutlined /> },
  EMAIL:     { label: 'Email',    color: 'cyan',   icon: <MailOutlined /> },
  WHATSAPP:  { label: 'WhatsApp', color: 'green',  icon: <MessageOutlined /> },
  MEETING:   { label: 'Reunión',  color: 'purple', icon: <TeamOutlined /> },
  NOTE:      { label: 'Nota',     color: 'orange', icon: <FileTextOutlined /> },
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_PAYMENT: 'En pago',
  PAID: 'Pagado', INVOICED: 'Facturado', CANCELLED: 'Cancelado',
}
const ORDER_STATUS_COLORS: Record<string, string> = {
  QUOTED: 'default', CONFIRMED: 'processing', IN_PAYMENT: 'warning',
  PAID: 'success', INVOICED: 'success', CANCELLED: 'error',
}
const EVENT_STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En ejecución',
  CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}

function clientDisplayName(client: any) {
  if (client.personType === 'MORAL') return client.companyName || '—'
  return [client.firstName, client.lastName].filter(Boolean).join(' ') || '—'
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [interactionModalOpen, setInteractionModalOpen] = useState(false)
  const [editingInteraction, setEditingInteraction] = useState<any>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [intForm] = Form.useForm()
  const [taskForm] = Form.useForm()

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['client-summary', clientId],
    queryFn: () => crmApi.getClientSummary(clientId!),
  })

  const { data: interactionsData } = useQuery({
    queryKey: ['client-interactions', clientId],
    queryFn: () => crmApi.listInteractions(clientId!),
  })

  const { data: tasksData } = useQuery({
    queryKey: ['client-tasks', clientId],
    queryFn: () => crmApi.listTasks(clientId!),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => import('../../api/client').then(m => m.apiClient.get('/users').then(r => r.data)),
  })

  const createInteraction = useMutation({
    mutationFn: (data: any) => crmApi.createInteraction(clientId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-interactions', clientId] }); qc.invalidateQueries({ queryKey: ['client-summary', clientId] }); setInteractionModalOpen(false); intForm.resetFields() },
  })

  const updateInteraction = useMutation({
    mutationFn: ({ id, data }: any) => crmApi.updateInteraction(clientId!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-interactions', clientId] }); setInteractionModalOpen(false); intForm.resetFields(); setEditingInteraction(null) },
  })

  const deleteInteraction = useMutation({
    mutationFn: (id: string) => crmApi.deleteInteraction(clientId!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-interactions', clientId] }); qc.invalidateQueries({ queryKey: ['client-summary', clientId] }) },
  })

  const createTask = useMutation({
    mutationFn: (data: any) => crmApi.createTask(clientId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }); qc.invalidateQueries({ queryKey: ['client-summary', clientId] }); setTaskModalOpen(false); taskForm.resetFields() },
  })

  const updateTask = useMutation({
    mutationFn: ({ id, data }: any) => crmApi.updateTask(clientId!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }); setTaskModalOpen(false); taskForm.resetFields(); setEditingTask(null) },
  })

  const completeTask = useMutation({
    mutationFn: (id: string) => crmApi.completeTask(clientId!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }); qc.invalidateQueries({ queryKey: ['client-summary', clientId] }) },
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => crmApi.deleteTask(clientId!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-tasks', clientId] }) },
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>

  const summary = summaryData?.data
  if (!summary) return null

  const { client, interactions: recentInteractions, tasks: pendingTasks, orders, events } = summary
  const allInteractions = interactionsData?.data ?? recentInteractions
  const allTasks = tasksData?.data ?? pendingTasks
  const users = usersData?.data ?? []

  function openEditInteraction(item: any) {
    setEditingInteraction(item)
    intForm.setFieldsValue({
      type: item.type,
      subject: item.subject,
      notes: item.notes,
      occurredAt: dayjs(item.occurredAt),
    })
    setInteractionModalOpen(true)
  }

  function openEditTask(item: any) {
    setEditingTask(item)
    taskForm.setFieldsValue({
      title: item.title,
      description: item.description,
      dueDate: item.dueDate ? dayjs(item.dueDate) : undefined,
      assignedToId: item.assignedToId,
    })
    setTaskModalOpen(true)
  }

  function handleInteractionSubmit(values: any) {
    const payload = { ...values, occurredAt: values.occurredAt?.toISOString() ?? new Date().toISOString() }
    if (editingInteraction) {
      updateInteraction.mutate({ id: editingInteraction.id, data: payload })
    } else {
      createInteraction.mutate(payload)
    }
  }

  function handleTaskSubmit(values: any) {
    const payload = { ...values, dueDate: values.dueDate?.toISOString() }
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data: payload })
    } else {
      createTask.mutate(payload)
    }
  }

  const pendingCount = allTasks.filter((t: any) => t.status === 'PENDING').length
  const overdueCount = allTasks.filter((t: any) => t.status === 'PENDING' && t.dueDate && dayjs(t.dueDate).isBefore(dayjs())).length

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/catalogos/clientes')} style={{ marginBottom: 16 }}>
          Volver a Clientes
        </Button>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              {clientDisplayName(client)}
            </Title>
            <Space style={{ marginTop: 4 }}>
              <Tag color={client.personType === 'MORAL' ? 'blue' : 'cyan'}>
                {client.personType === 'MORAL' ? 'Persona Moral' : 'Persona Física'}
              </Tag>
              {client.rfc && <Text type="secondary">RFC: {client.rfc}</Text>}
              {!client.isActive && <Tag color="red">Inactivo</Tag>}
            </Space>
          </Col>
          <Col>
            <Space>
              {client.email && <Tooltip title={client.email}><Button icon={<MailOutlined />} href={`mailto:${client.email}`} /></Tooltip>}
              {client.phone && <Tooltip title={client.phone}><Button icon={<PhoneOutlined />} href={`tel:${client.phone}`} /></Tooltip>}
              {client.whatsapp && <Tooltip title={client.whatsapp}><Button icon={<MessageOutlined />} style={{ color: '#25D366', borderColor: '#25D366' }} /></Tooltip>}
            </Space>
          </Col>
        </Row>
      </div>

      {/* KPI row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#6B46C1' }}>{allInteractions.length}</div>
            <div style={{ color: '#888', fontSize: 12 }}>Interacciones</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Badge count={overdueCount} offset={[8, 0]}>
              <div style={{ fontSize: 28, fontWeight: 700, color: pendingCount > 0 ? '#fa8c16' : '#52c41a' }}>{pendingCount}</div>
            </Badge>
            <div style={{ color: '#888', fontSize: 12 }}>Tareas pendientes</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>{orders.length}</div>
            <div style={{ color: '#888', fontSize: 12 }}>Órdenes</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#13c2c2' }}>{events.length}</div>
            <div style={{ color: '#888', fontSize: 12 }}>Eventos</div>
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'interactions',
            label: `Interacciones (${allInteractions.length})`,
            children: (
              <>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingInteraction(null); intForm.resetFields(); setInteractionModalOpen(true) }}>
                    Nueva interacción
                  </Button>
                </div>
                {allInteractions.length === 0 ? (
                  <Empty description="Sin interacciones registradas" />
                ) : (
                  <Timeline
                    items={allInteractions.map((item: any) => {
                      const cfg = INTERACTION_TYPE_CONFIG[item.type] ?? INTERACTION_TYPE_CONFIG.NOTE
                      return {
                        dot: <Avatar size="small" style={{ backgroundColor: '#6B46C1' }}>{cfg.icon}</Avatar>,
                        children: (
                          <Card
                            size="small"
                            style={{ marginBottom: 8 }}
                            extra={
                              <Space>
                                <Button size="small" icon={<EditOutlined />} onClick={() => openEditInteraction(item)} />
                                <Popconfirm title="¿Eliminar interacción?" onConfirm={() => deleteInteraction.mutate(item.id)}>
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              </Space>
                            }
                            title={
                              <Space>
                                <Tag color={cfg.color}>{cfg.label}</Tag>
                                <Text strong>{item.subject}</Text>
                              </Space>
                            }
                          >
                            {item.notes && <Text type="secondary">{item.notes}</Text>}
                            <Divider style={{ margin: '8px 0' }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm')} — {item.createdBy?.firstName} {item.createdBy?.lastName}
                            </Text>
                          </Card>
                        ),
                      }
                    })}
                  />
                )}
              </>
            ),
          },
          {
            key: 'tasks',
            label: (
              <span>
                Tareas{' '}
                {pendingCount > 0 && <Badge count={overdueCount > 0 ? overdueCount : pendingCount} color={overdueCount > 0 ? 'red' : 'orange'} />}
              </span>
            ),
            children: (
              <>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); taskForm.resetFields(); setTaskModalOpen(true) }}>
                    Nueva tarea
                  </Button>
                </div>
                {allTasks.length === 0 ? (
                  <Empty description="Sin tareas" />
                ) : (
                  <List
                    dataSource={allTasks}
                    renderItem={(task: any) => {
                      const isOverdue = task.status === 'PENDING' && task.dueDate && dayjs(task.dueDate).isBefore(dayjs())
                      return (
                        <List.Item
                          style={{ opacity: task.status === 'DONE' ? 0.6 : 1 }}
                          actions={[
                            task.status === 'PENDING' && (
                              <Tooltip title="Marcar como completada" key="complete">
                                <Button size="small" icon={<CheckOutlined />} type="primary" ghost onClick={() => completeTask.mutate(task.id)} />
                              </Tooltip>
                            ),
                            <Button size="small" icon={<EditOutlined />} key="edit" onClick={() => openEditTask(task)} />,
                            <Popconfirm key="del" title="¿Eliminar tarea?" onConfirm={() => deleteTask.mutate(task.id)}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>,
                          ].filter(Boolean)}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                size="small"
                                style={{ backgroundColor: task.status === 'DONE' ? '#52c41a' : isOverdue ? '#ff4d4f' : '#fa8c16' }}
                                icon={<ClockCircleOutlined />}
                              />
                            }
                            title={
                              <Space>
                                <Text delete={task.status === 'DONE'} strong>{task.title}</Text>
                                <Tag color={task.status === 'DONE' ? 'success' : task.status === 'CANCELLED' ? 'default' : isOverdue ? 'error' : 'warning'}>
                                  {task.status === 'DONE' ? 'Completada' : task.status === 'CANCELLED' ? 'Cancelada' : isOverdue ? 'Vencida' : 'Pendiente'}
                                </Tag>
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={0}>
                                {task.description && <Text type="secondary">{task.description}</Text>}
                                <Space size={12}>
                                  {task.dueDate && (
                                    <Text type={isOverdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                                      <CalendarOutlined /> Vence: {dayjs(task.dueDate).format('DD/MM/YYYY')}
                                    </Text>
                                  )}
                                  {task.assignedTo && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      <UserOutlined /> {task.assignedTo.firstName} {task.assignedTo.lastName}
                                    </Text>
                                  )}
                                </Space>
                              </Space>
                            }
                          />
                        </List.Item>
                      )
                    }}
                  />
                )}
              </>
            ),
          },
          {
            key: 'orders',
            label: `Órdenes (${orders.length})`,
            children: (
              <List
                dataSource={orders}
                locale={{ emptyText: 'Sin órdenes' }}
                renderItem={(order: any) => (
                  <List.Item
                    actions={[
                      <Button size="small" key="view" onClick={() => navigate(`/ordenes/${order.id}`)}>Ver</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<ShoppingCartOutlined />} style={{ backgroundColor: '#6B46C1' }} />}
                      title={<Space><Text strong>{order.orderNumber}</Text><Tag color={ORDER_STATUS_COLORS[order.status] ?? 'default'}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</Tag></Space>}
                      description={
                        <Space>
                          {order.event && <Text type="secondary">{order.event.name}</Text>}
                          <Text type="secondary">{dayjs(order.createdAt).format('DD/MM/YYYY')}</Text>
                          <Text strong>${Number(order.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'events',
            label: `Eventos (${events.length})`,
            children: (
              <List
                dataSource={events}
                locale={{ emptyText: 'Sin eventos' }}
                renderItem={(event: any) => (
                  <List.Item
                    actions={[
                      <Button size="small" key="view" onClick={() => navigate(`/eventos/${event.id}`)}>Ver</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<CalendarOutlined />} style={{ backgroundColor: '#13c2c2' }} />}
                      title={<Space><Text strong>{event.name}</Text><Tag>{EVENT_STATUS_LABELS[event.status] ?? event.status}</Tag></Space>}
                      description={event.startDate ? `${dayjs(event.startDate).format('DD/MM/YYYY')} — ${event.endDate ? dayjs(event.endDate).format('DD/MM/YYYY') : ''}` : ''}
                    />
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'contacts',
            label: `Contactos (${client.contacts?.length ?? 0})`,
            children: client.contacts?.length === 0 ? (
              <Empty description="Sin contactos registrados" />
            ) : (
              <List
                dataSource={client.contacts}
                renderItem={(contact: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={<Space>{contact.firstName} {contact.lastName} {contact.isPrimary && <Tag color="blue">Principal</Tag>}</Space>}
                      description={<Space>{contact.email && <Text>{contact.email}</Text>}{contact.phone && <Text>{contact.phone}</Text>}</Space>}
                    />
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />

      {/* Interaction Modal */}
      <Modal
        open={interactionModalOpen}
        title={editingInteraction ? 'Editar interacción' : 'Nueva interacción'}
        onCancel={() => { setInteractionModalOpen(false); setEditingInteraction(null); intForm.resetFields() }}
        onOk={() => intForm.submit()}
        confirmLoading={createInteraction.isPending || updateInteraction.isPending}
        destroyOnClose
      >
        <Form form={intForm} layout="vertical" onFinish={handleInteractionSubmit}>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select options={Object.entries(INTERACTION_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="subject" label="Asunto" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="occurredAt" label="Fecha y hora">
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Task Modal */}
      <Modal
        open={taskModalOpen}
        title={editingTask ? 'Editar tarea' : 'Nueva tarea'}
        onCancel={() => { setTaskModalOpen(false); setEditingTask(null); taskForm.resetFields() }}
        onOk={() => taskForm.submit()}
        confirmLoading={createTask.isPending || updateTask.isPending}
        destroyOnClose
      >
        <Form form={taskForm} layout="vertical" onFinish={handleTaskSubmit}>
          <Form.Item name="title" label="Título" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="dueDate" label="Fecha límite">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="assignedToId" label="Asignada a">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={users.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
