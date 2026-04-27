import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Row, Col, Typography, Tag, Button, Tabs, Timeline, List, Avatar,
  Form, Input, Select, DatePicker, Modal, Popconfirm, Badge, Empty, Spin,
  Space, Tooltip, Divider, Table, App, Upload, Switch, Image,
} from 'antd'
import {
  ArrowLeftOutlined, PhoneOutlined, MailOutlined, MessageOutlined,
  TeamOutlined, FileTextOutlined, PlusOutlined, CheckOutlined,
  DeleteOutlined, EditOutlined, UserOutlined, CalendarOutlined,
  ShoppingCartOutlined, ClockCircleOutlined, LinkOutlined, DisconnectOutlined,
  DownloadOutlined, FileOutlined, UploadOutlined, TrophyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { crmApi } from '../../api/crm'
import { clientsApi } from '../../api/clients'
import { auditApi } from '../../api/audit'
import { exportToCsv } from '../../utils/exportCsv'
import AuditDrawer from '../../components/AuditDrawer'

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
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada',
  INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}
const ORDER_STATUS_COLORS: Record<string, string> = {
  QUOTED: 'default', CONFIRMED: 'processing', EXECUTED: 'processing',
  INVOICED: 'success', CANCELLED: 'error', CREDIT_NOTE: 'warning',
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
  const { message } = App.useApp()

  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editClientForm] = Form.useForm()
  const [relationModalOpen, setRelationModalOpen] = useState(false)
  const [relationForm] = Form.useForm()

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

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['client-audit', clientId],
    queryFn: () => auditApi.getLog('Client', clientId!),
    enabled: !!clientId,
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

  const updateClientMutation = useMutation({
    mutationFn: (values: any) => clientsApi.update(clientId!, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-summary', clientId] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      setEditClientOpen(false)
      editClientForm.resetFields()
      message.success('Cliente actualizado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Error al guardar los cambios'
      message.error(msg)
    },
  })

  const [docUploading, setDocUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  async function handleLogoUpload(file: File) {
    setLogoUploading(true)
    try {
      await clientsApi.uploadLogo(clientId!, file)
      qc.invalidateQueries({ queryKey: ['client-summary', clientId] })
      message.success('Logotipo actualizado')
    } catch {
      message.error('Error al subir el logotipo')
    } finally {
      setLogoUploading(false)
    }
    return false
  }

  const updateIsTeamMutation = useMutation({
    mutationFn: (data: any) => clientsApi.update(clientId!, typeof data === 'boolean' ? { isTeam: data } : data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-summary', clientId] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      message.success('Actualizado')
    },
  })

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => clientsApi.deleteDocument(clientId!, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-summary', clientId] }); message.success('Documento eliminado') },
    onError: () => message.error('Error al eliminar documento'),
  })

  async function handleDocUpload(file: File) {
    setDocUploading(true)
    try {
      await clientsApi.uploadDocument(clientId!, file, 'GENERAL')
      qc.invalidateQueries({ queryKey: ['client-summary', clientId] })
      message.success('Documento subido')
    } catch {
      message.error('Error al subir documento')
    } finally {
      setDocUploading(false)
    }
    return false
  }

  const { data: portalUsersData } = useQuery({
    queryKey: ['portal-users'],
    queryFn: () => clientsApi.listPortalUsers(),
  })

  const linkPortalUserMutation = useMutation({
    mutationFn: (portalUserId: string | null) => clientsApi.linkPortalUser(clientId!, portalUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-summary', clientId] }),
  })

  // Client Relations
  const { data: allClientsData } = useQuery({
    queryKey: ['clients-for-relations'],
    queryFn: () => clientsApi.list({ pageSize: 500 }),
  })
  const availableClients = useMemo(() =>
    (allClientsData?.data ?? []).filter((c: any) => c.id !== clientId),
    [allClientsData, clientId],
  )

  const addRelationMutation = useMutation({
    mutationFn: (data: any) => clientsApi.addRelation(clientId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-summary', clientId] }); setRelationModalOpen(false); relationForm.resetFields(); message.success('Relación creada') },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al crear relación'),
  })

  const updateRelationMutation = useMutation({
    mutationFn: ({ relationId, data }: { relationId: string; data: any }) => clientsApi.updateRelation(clientId!, relationId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-summary', clientId] }); message.success('Relación actualizada') },
  })

  const deleteRelationMutation = useMutation({
    mutationFn: (relationId: string) => clientsApi.deleteRelation(clientId!, relationId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-summary', clientId] }); message.success('Relación eliminada') },
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
    <div>
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
            <Space wrap>
              {client.email && <Tooltip title={client.email}><Button icon={<MailOutlined />} href={`mailto:${client.email}`} /></Tooltip>}
              {client.phone && <Tooltip title={client.phone}><Button icon={<PhoneOutlined />} href={`tel:${client.phone}`} /></Tooltip>}
              {client.whatsapp && <Tooltip title={client.whatsapp}><Button icon={<MessageOutlined />} style={{ color: '#25D366', borderColor: '#25D366' }} /></Tooltip>}
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  editClientForm.setFieldsValue(client)
                  setEditClientOpen(true)
                }}
              >
                Editar
              </Button>
              <AuditDrawer
                entityType="Client"
                entityId={clientId!}
                entityName={client.companyName || `${client.firstName} ${client.lastName}`}
                data={auditData?.data ?? []}
                loading={auditLoading}
              />
            </Space>
          </Col>
        </Row>
      </div>

      {/* KPI row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#6B46C1' }}>{allInteractions.length}</div>
            <div style={{ color: '#888', fontSize: 12 }}>Interacciones</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Badge count={overdueCount} offset={[8, 0]}>
              <div style={{ fontSize: 28, fontWeight: 700, color: pendingCount > 0 ? '#fa8c16' : '#52c41a' }}>{pendingCount}</div>
            </Badge>
            <div style={{ color: '#888', fontSize: 12 }}>Tareas pendientes</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>{orders.length}</div>
            <div style={{ color: '#888', fontSize: 12 }}>Órdenes</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
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
              <>
                <div style={{ textAlign: 'right', marginBottom: 8 }}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => exportToCsv(`ordenes-${clientDisplayName(client).replace(/\s+/g, '-')}`, orders.map((o: any) => ({
                      numero: o.orderNumber,
                      estado: ORDER_STATUS_LABELS[o.status] ?? o.status,
                      evento: o.event?.name ?? '',
                      total: Number(o.total).toFixed(2),
                      fecha: dayjs(o.createdAt).format('DD/MM/YYYY'),
                    })), [
                      { header: 'Número', key: 'numero' },
                      { header: 'Estado', key: 'estado' },
                      { header: 'Evento', key: 'evento' },
                      { header: 'Total', key: 'total' },
                      { header: 'Fecha', key: 'fecha' },
                    ])}
                  >
                    Exportar CSV
                  </Button>
                </div>
              <Table
                dataSource={orders}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'Sin órdenes' }}
                columns={[
                  { title: 'Número', dataIndex: 'orderNumber', render: (v: string, r: any) => <Button type="link" size="small" onClick={() => navigate(`/ordenes/${r.id}`)}>{v}</Button> },
                  { title: 'Estado', dataIndex: 'status', render: (v: string) => <Tag color={ORDER_STATUS_COLORS[v] ?? 'default'}>{ORDER_STATUS_LABELS[v] ?? v}</Tag> },
                  { title: 'Evento', render: (_: any, r: any) => r.event?.name ?? '—' },
                  { title: 'Total', dataIndex: 'total', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
                  { title: 'Fecha', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
                ]}
              />
              </>
            ),
          },
          {
            key: 'events',
            label: `Eventos (${events.length})`,
            children: (
              <Table
                dataSource={events}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'Sin eventos' }}
                columns={[
                  { title: 'Nombre', dataIndex: 'name', render: (v: string, r: any) => <Button type="link" size="small" onClick={() => navigate(`/eventos/${r.id}`)}>{v}</Button> },
                  { title: 'Estado', dataIndex: 'status', render: (v: string) => <Tag>{EVENT_STATUS_LABELS[v] ?? v}</Tag> },
                  { title: 'Inicio', dataIndex: 'eventStart', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
                  { title: 'Fin', dataIndex: 'eventEnd', render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
                ]}
              />
            ),
          },
          {
            key: 'portal',
            label: 'Portal de Expositores',
            children: (() => {
              const linked = client.portalUser as any
              const allPortalUsers = portalUsersData ?? []
              const available = allPortalUsers.filter((u: any) => !u.client || u.client.id === client.id)
              return (
                <div style={{ maxWidth: 600 }}>
                  {linked ? (
                    <Card size="small" style={{ marginBottom: 16, borderColor: '#6B46C1' }}>
                      <Space>
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#6B46C1' }} />
                        <div>
                          <div><Text strong>{linked.firstName} {linked.lastName}</Text></div>
                          <div><Text type="secondary">{linked.email}</Text></div>
                          <Tag color={linked.isActive ? 'green' : 'red'} style={{ marginTop: 4 }}>
                            {linked.isActive ? 'Activo' : 'Inactivo'}
                          </Tag>
                        </div>
                      </Space>
                      <div style={{ marginTop: 12 }}>
                        <Popconfirm
                          title="¿Desvincular usuario del portal?"
                          onConfirm={() => linkPortalUserMutation.mutate(null)}
                        >
                          <Button danger icon={<DisconnectOutlined />} size="small" loading={linkPortalUserMutation.isPending}>
                            Desvincular
                          </Button>
                        </Popconfirm>
                      </div>
                    </Card>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin cuenta de portal vinculada"
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      {linked ? 'Cambiar cuenta vinculada' : 'Vincular cuenta de portal'}
                    </Text>
                    <Space.Compact style={{ width: '100%' }}>
                      <Select
                        showSearch
                        allowClear
                        placeholder="Buscar usuario por email o nombre..."
                        style={{ width: '100%' }}
                        optionFilterProp="label"
                        loading={linkPortalUserMutation.isPending}
                        options={available.map((u: any) => ({
                          value: u.id,
                          label: `${u.email} — ${u.firstName} ${u.lastName}`,
                        }))}
                        onSelect={(val: string) => linkPortalUserMutation.mutate(val)}
                      />
                    </Space.Compact>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                      Solo se muestran usuarios sin cliente asignado.
                    </Text>
                  </div>
                </div>
              )
            })(),
          },
          {
            key: 'imagen',
            label: (
              <Space>
                <TrophyOutlined />
                Imagen
              </Space>
            ),
            children: (
              <div style={{ maxWidth: 480 }}>
                <Card size="small" title="Logotipo" style={{ marginBottom: 16 }}>
                  {client.logoUrl ? (
                    <div style={{ marginBottom: 12 }}>
                      <Image src={client.logoUrl} height={80} style={{ objectFit: 'contain', borderRadius: 4 }} />
                    </div>
                  ) : (
                    <Empty description="Sin logotipo" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
                  )}
                  <Upload
                    beforeUpload={handleLogoUpload}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />} loading={logoUploading}>
                      {client.logoUrl ? 'Cambiar logotipo' : 'Subir logotipo'}
                    </Button>
                  </Upload>
                </Card>
                <Card size="small" title="Deportivo" style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Space>
                      <Switch
                        checked={client.isTeam ?? false}
                        loading={updateIsTeamMutation.isPending}
                        onChange={(v) => updateIsTeamMutation.mutate(v)}
                      />
                      <span>Marcar como Equipo</span>
                    </Space>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Los clientes de tipo Persona Moral marcados como Equipo aparecerán disponibles para seleccionar como equipos locales o visitantes en el Portal Deportivo del Evento.
                      </Text>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>Número de jugador</Text>
                    <Space>
                      <Input
                        style={{ width: 120 }}
                        placeholder="Ej: 7"
                        maxLength={10}
                        defaultValue={client.playerNumber ?? ''}
                        onBlur={(e) => {
                          const val = e.target.value.trim() || null
                          if (val !== (client.playerNumber ?? null)) {
                            updateIsTeamMutation.mutate({ playerNumber: val } as any)
                          }
                        }}
                        onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                      />
                    </Space>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'documents',
            label: `Documentos (${client.documents?.length ?? 0})`,
            children: (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Upload beforeUpload={handleDocUpload} showUploadList={false}>
                    <Button icon={<UploadOutlined />} loading={docUploading}>Subir documento</Button>
                  </Upload>
                </div>
                {(client.documents ?? []).length === 0 ? (
                  <Empty description="Sin documentos adjuntos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    dataSource={client.documents}
                    renderItem={(doc: any) => (
                      <List.Item
                        actions={[
                          doc.blobKey && (
                            <Button key="dl" size="small" icon={<DownloadOutlined />} href={doc.blobKey} target="_blank" rel="noopener noreferrer" />
                          ),
                          <Popconfirm key="del" title="¿Eliminar documento?" onConfirm={() => deleteDocMutation.mutate(doc.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteDocMutation.isPending} />
                          </Popconfirm>,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<FileOutlined />} />}
                          title={doc.fileName}
                          description={doc.documentType}
                        />
                      </List.Item>
                    )}
                  />
                )}
              </>
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
          {
            key: 'relations',
            label: `Relaciones (${(client.relationsFrom?.length ?? 0) + (client.relationsTo?.length ?? 0)})`,
            children: (() => {
              const RELATION_TYPES: Record<string, { label: string; color: string }> = {
                BILLING: { label: 'Facturación', color: 'blue' },
                SUBSIDIARY: { label: 'Filial', color: 'purple' },
                PARTNER: { label: 'Socio', color: 'green' },
                PARENT: { label: 'Empresa Matriz', color: 'orange' },
                JUGADOR: { label: 'Jugador', color: 'gold' },
                OTHER: { label: 'Otro', color: 'default' },
              }
              const relationsFrom = (client.relationsFrom ?? []).map((r: any) => ({
                ...r,
                direction: 'from',
                otherClient: r.relatedClient,
              }))
              const relationsTo = (client.relationsTo ?? []).map((r: any) => ({
                ...r,
                direction: 'to',
                otherClient: r.client,
              }))
              const allRelations = [...relationsFrom, ...relationsTo]

              return (
                <>
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { relationForm.resetFields(); setRelationModalOpen(true) }}>
                      Nueva relación
                    </Button>
                  </div>
                  {allRelations.length === 0 ? (
                    <Empty description="Sin relaciones con otros clientes" />
                  ) : (
                    <Table
                      dataSource={allRelations}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={[
                        {
                          title: 'Cliente Relacionado',
                          key: 'otherClient',
                          render: (_: any, r: any) => {
                            const c = r.otherClient
                            const name = c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim()
                            return (
                              <Button type="link" size="small" onClick={() => navigate(`/catalogos/clientes/${c?.id}`)}>
                                {name}
                              </Button>
                            )
                          },
                        },
                        {
                          title: 'Tipo de Relación',
                          dataIndex: 'relationType',
                          width: 160,
                          render: (v: string, r: any) => {
                            const cfg = RELATION_TYPES[v] ?? RELATION_TYPES.OTHER
                            const suffix = r.direction === 'to' ? ' (inversa)' : ''
                            return <Tag color={cfg.color}>{cfg.label}{suffix}</Tag>
                          },
                        },
                        {
                          title: 'Estado',
                          dataIndex: 'isActive',
                          width: 100,
                          render: (v: boolean, r: any) => (
                            <Button
                              size="small"
                              type="text"
                              onClick={() => updateRelationMutation.mutate({ relationId: r.id, data: { isActive: !v } })}
                            >
                              <Tag color={v ? 'green' : 'red'}>{v ? 'Activa' : 'Inactiva'}</Tag>
                            </Button>
                          ),
                        },
                        {
                          title: 'Notas',
                          dataIndex: 'notes',
                          ellipsis: true,
                          render: (v: string) => v || '—',
                        },
                        {
                          title: '',
                          width: 50,
                          render: (_: any, r: any) => (
                            <Popconfirm title="¿Eliminar relación?" onConfirm={() => deleteRelationMutation.mutate(r.id)}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ),
                        },
                      ]}
                    />
                  )}
                </>
              )
            })(),
          },
        ]}
      />

      {/* Relation Modal */}
      <Modal
        open={relationModalOpen}
        title="Nueva Relación entre Clientes"
        onCancel={() => { setRelationModalOpen(false); relationForm.resetFields() }}
        onOk={() => relationForm.submit()}
        confirmLoading={addRelationMutation.isPending}
        width="min(520px, 95vw)"
        destroyOnClose
      >
        <Form form={relationForm} layout="vertical" onFinish={(v: any) => addRelationMutation.mutate(v)}>
          <Form.Item name="relatedClientId" label="Cliente Relacionado" rules={[{ required: true, message: 'Selecciona un cliente' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar cliente..."
              options={availableClients.map((c: any) => ({
                value: c.id,
                label: c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
              }))}
            />
          </Form.Item>
          <Form.Item name="relationType" label="Tipo de Relación" rules={[{ required: true, message: 'Selecciona el tipo' }]}>
            <Select options={[
              { value: 'BILLING', label: 'Facturación (este cliente factura al otro)' },
              { value: 'SUBSIDIARY', label: 'Filial' },
              { value: 'PARTNER', label: 'Socio' },
              { value: 'PARENT', label: 'Empresa Matriz' },
              { value: 'JUGADOR', label: 'Jugador' },
              { value: 'OTHER', label: 'Otro' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Detalles opcionales sobre la relación..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Interaction Modal */}
      <Modal
        open={interactionModalOpen}
        title={editingInteraction ? 'Editar interacción' : 'Nueva interacción'}
        onCancel={() => { setInteractionModalOpen(false); setEditingInteraction(null); intForm.resetFields() }}
        onOk={() => intForm.submit()}
        confirmLoading={createInteraction.isPending || updateInteraction.isPending}
        width="min(560px, 95vw)"
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

      {/* Edit Client Modal */}
      <Modal
        open={editClientOpen}
        title="Editar Cliente"
        onCancel={() => { setEditClientOpen(false); editClientForm.resetFields() }}
        onOk={() => editClientForm.submit()}
        confirmLoading={updateClientMutation.isPending}
        width="min(700px, 95vw)"
        destroyOnClose
      >
        <Form form={editClientForm} layout="vertical" onFinish={updateClientMutation.mutate}>
          <Tabs items={[
            {
              key: 'general', label: 'Datos Generales',
              children: (
                <Row gutter={16}>
                  <Col xs={12}>
                    <Form.Item name="personType" label="Tipo de Persona" rules={[{ required: true }]}>
                      <Select options={[{ value: 'MORAL', label: 'Persona Moral' }, { value: 'PHYSICAL', label: 'Persona Física' }]} />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="companyName" label="Razón Social"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="firstName" label="Nombre"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="lastName" label="Apellido(s)"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="rfc" label="RFC / TAX ID"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="taxRegime" label="Régimen Fiscal"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="phone" label="Teléfono"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="whatsapp" label="WhatsApp"><Input /></Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item name="addressCountry" label="País"><Input /></Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'address', label: 'Dirección',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="addressStreet" label="Calle y Número"><Input /></Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item name="addressCity" label="Ciudad"><Input /></Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item name="addressState" label="Estado"><Input /></Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item name="addressZip" label="C.P."><Input /></Form.Item>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'imagen', label: 'Imagen',
              children: (
                <Form.Item name="isTeam" label="Equipo deportivo" valuePropName="checked">
                  <Switch />
                </Form.Item>
              ),
            },
          ]} />
        </Form>
      </Modal>

      {/* Task Modal */}
      <Modal
        open={taskModalOpen}
        title={editingTask ? 'Editar tarea' : 'Nueva tarea'}
        onCancel={() => { setTaskModalOpen(false); setEditingTask(null); taskForm.resetFields() }}
        onOk={() => taskForm.submit()}
        confirmLoading={createTask.isPending || updateTask.isPending}
        width="min(520px, 95vw)"
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
