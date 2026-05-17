import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Tag, Modal, Form, Input, Select, Row, Col, App, Typography,
  Space, Avatar, Skeleton, Empty, Card, Checkbox, Collapse, Popconfirm,
  Drawer, List, Descriptions, Segmented, Switch, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DownloadOutlined, UserOutlined, ShopOutlined,
  LockOutlined, CheckCircleOutlined, StopOutlined, DeleteOutlined,
  CalendarOutlined, TeamOutlined, MailOutlined, MobileOutlined,
} from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { apiClient } from '../../../api/client'
import { resourcesApi } from '../../../api/resources'
import { clientsApi } from '../../../api/clients'
import { exportToCsv } from '../../../utils/exportCsv'
import { PageHeader } from '../../../components/ui'
import { getInitials, getAvatarColors } from '../../../utils/format'
import { PRIVILEGE_GROUPS } from '@iventia/shared'

const { Text } = Typography

const ALL_PRIVILEGE_KEYS = PRIVILEGE_GROUPS.flatMap(g => g.privileges.map(p => p.key))
const PROFILE_COLORS = ['#6B46C1', '#0369a1', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#65a30d']

type PortalType = 'ALL' | 'EXPOSITOR' | 'PROVEEDOR'

// ── Privileges selector (used in profile modal) ─────────────────────────────
function PrivilegesSelector({ value = [], onChange }: { value?: string[]; onChange?: (v: string[]) => void }) {
  const allChecked = value.length === ALL_PRIVILEGE_KEYS.length
  const someChecked = value.length > 0 && !allChecked
  function toggleAll() { onChange?.(allChecked ? [] : [...ALL_PRIVILEGE_KEYS]) }
  function toggleGroup(groupKeys: string[]) {
    const allIn = groupKeys.every(k => value.includes(k))
    onChange?.(allIn ? value.filter(k => !groupKeys.includes(k)) : [...new Set([...value, ...groupKeys])])
  }
  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox checked={allChecked} indeterminate={someChecked} onChange={toggleAll}>
          <span style={{ fontWeight: 600 }}>Marcar / Desmarcar todos</span>
        </Checkbox>
        <Tag color="blue">{value.length} / {ALL_PRIVILEGE_KEYS.length}</Tag>
      </div>
      <Checkbox.Group value={value} onChange={v => onChange?.(v as string[])} style={{ width: '100%' }}>
        <Collapse size="small" items={PRIVILEGE_GROUPS.map((group, i) => {
          const groupKeys = group.privileges.map(p => p.key)
          const sel = groupKeys.filter(k => value.includes(k))
          return {
            key: String(i),
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                <Checkbox checked={sel.length === groupKeys.length} indeterminate={sel.length > 0 && sel.length < groupKeys.length} onChange={() => toggleGroup(groupKeys)} />
                <span style={{ fontWeight: 600 }}>{group.label}</span>
                <Tag style={{ marginLeft: 'auto' }}>{sel.length}/{groupKeys.length}</Tag>
              </div>
            ),
            children: (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {group.privileges.map(p => <Checkbox key={p.key} value={p.key}>{p.label}</Checkbox>)}
              </div>
            ),
          }
        })} />
      </Checkbox.Group>
    </div>
  )
}

// ── Tab: Usuarios internos ───────────────────────────────────────────────────
function InternalUsersTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then(r => r.data),
  })

  const { data: depts = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => resourcesApi.listDepartments(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => apiClient.get('/profiles').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values }
      if (!payload.password || payload.password.length === 0) delete payload.password
      return editingId
        ? apiClient.put(`/users/${editingId}`, payload).then(r => r.data)
        : apiClient.post('/users', payload).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      form.resetFields()
      message.success('Usuario guardado')
    },
    onError: (err: any) => {
      const fieldErrors = err?.response?.data?.error?.details?.fieldErrors
      if (fieldErrors) {
        const msgs = Object.entries(fieldErrors)
          .map(([f, errs]) => `${f}: ${(errs as string[]).join(', ')}`)
          .join(' | ')
        message.error(`Validación: ${msgs}`, 6)
      } else {
        message.error(err?.response?.data?.error?.message ?? 'Error al guardar usuario')
      }
    },
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone ?? '',
      role: record.role,
      isActive: record.isActive,
      profileId: record.profile?.id ?? null,
      departmentIds: record.userDepartments?.map((ud: any) => ud.department.id) ?? [],
      password: undefined,
      notifyTaskEmail: record.notifyTaskEmail ?? true,
      notifyTaskWhatsapp: record.notifyTaskWhatsapp ?? false,
    })
    setModalOpen(true)
  }

  const users = usersData?.data ?? []
  const deptOptions = (depts as any[]).map((d: any) => ({ value: d.id, label: d.name }))
  const profileOptions = (profilesData?.data ?? []).map((p: any) => ({ value: p.id, label: p.name }))

  const ROLE_COLOR: Record<string, string> = { ADMIN: 'red', NORMAL: 'blue', READ_ONLY: 'default' }
  const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', NORMAL: 'Normal', READ_ONLY: 'Consulta' }

  return (
    <div style={{ background: '#fff' }}>
      <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderBottom: '1px solid #f0f0f0' }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => exportToCsv('usuarios', users.map((r: any) => ({
            nombre: `${r.firstName} ${r.lastName}`,
            email: r.email, rol: r.role,
            perfil: r.profile?.name ?? '', activo: r.isActive ? 'Activo' : 'Inactivo',
          })), [
            { header: 'Nombre', key: 'nombre' }, { header: 'Email', key: 'email' },
            { header: 'Rol', key: 'rol' }, { header: 'Perfil', key: 'perfil' }, { header: 'Activo', key: 'activo' },
          ])}
        >
          Exportar
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Invitar usuario
        </Button>
      </div>

      {isLoading ? (
        <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
      ) : users.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay usuarios internos" style={{ padding: 64 }} />
      ) : (
        <Table
          dataSource={users}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showTotal: t => `${t} usuarios` }}
          columns={[
            {
              title: 'Usuario',
              render: (_: any, r: any) => {
                const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()
                const { bg, fg } = getAvatarColors(name)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar size={32} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {getInitials(name)}
                    </Avatar>
                    <div>
                      <Text style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{name}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
                    </div>
                  </div>
                )
              },
            },
            {
              title: 'Rol',
              dataIndex: 'role',
              width: 100,
              render: (v: string) => <Tag color={ROLE_COLOR[v] ?? 'default'}>{ROLE_LABEL[v] ?? v}</Tag>,
            },
            {
              title: 'Perfil',
              render: (_: any, r: any) => r.profile?.name
                ? <Tag color="purple">{r.profile.name}</Tag>
                : <Tag>Sin perfil</Tag>,
            },
            {
              title: 'Departamentos',
              render: (_: any, r: any) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.userDepartments?.map((ud: any) => ud.department.name).join(', ') || '—'}
                </Text>
              ),
            },
            {
              title: 'Estado',
              dataIndex: 'isActive',
              width: 90,
              render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
            },
            {
              title: 'Notif. tareas',
              key: 'notif',
              width: 100,
              render: (_: any, r: any) => (
                <Space size={4}>
                  <Tooltip title="Email">
                    <MailOutlined style={{ color: r.notifyTaskEmail ? '#52c41a' : '#d9d9d9', fontSize: 15 }} />
                  </Tooltip>
                  <Tooltip title="WhatsApp">
                    <MobileOutlined style={{ color: r.notifyTaskWhatsapp ? '#25D366' : '#d9d9d9', fontSize: 15 }} />
                  </Tooltip>
                </Space>
              ),
            },
            {
              title: '',
              key: 'actions',
              width: 50,
              render: (_: any, r: any) => (
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              ),
            },
          ]}
        />
      )}

      <Modal
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        confirmLoading={saveMutation.isPending}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="firstName" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="lastName" label="Apellido(s)" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="WhatsApp / Teléfono"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label={editingId ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                rules={editingId
                  ? [{ validator: (_: any, value: string) => {
                      if (!value || value.length === 0) return Promise.resolve()
                      if (value.length < 8) return Promise.reject(new Error('Mínimo 8 caracteres'))
                      return Promise.resolve()
                    }}]
                  : [{ required: true, min: 8 }]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role" label="Rol" initialValue="NORMAL" rules={[{ required: true }]}>
                <Select options={[{ value: 'ADMIN', label: 'Administrador' }, { value: 'NORMAL', label: 'Normal' }, { value: 'READ_ONLY', label: 'Consulta' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="profileId" label="Perfil" rules={[{ required: true, message: 'Cada usuario debe tener un perfil' }]}>
                <Select options={profileOptions} placeholder="Selecciona un perfil" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentIds" label="Departamentos">
                <Select mode="multiple" options={deptOptions} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#595959' }}>
                  Notificaciones de nueva tarea asignada
                </div>
                <Row gutter={24}>
                  <Col>
                    <Form.Item name="notifyTaskEmail" valuePropName="checked" initialValue={true} style={{ marginBottom: 0 }}>
                      <Switch checkedChildren={<MailOutlined />} unCheckedChildren={<MailOutlined />} />
                    </Form.Item>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Correo electrónico</div>
                  </Col>
                  <Col>
                    <Form.Item name="notifyTaskWhatsapp" valuePropName="checked" initialValue={false} style={{ marginBottom: 0 }}>
                      <Switch checkedChildren={<MobileOutlined />} unCheckedChildren={<MobileOutlined />} style={{ background: '#25D366' }} />
                    </Form.Item>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>WhatsApp</div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

// ── Tab: Usuarios portal ─────────────────────────────────────────────────────
function PortalUsersTab() {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [portalFilter, setPortalFilter] = useState<PortalType>('ALL')
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedPortalType, setSelectedPortalType] = useState<'EXPOSITOR' | 'PROVEEDOR'>('EXPOSITOR')
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdForm] = Form.useForm()
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addClientForm] = Form.useForm()

  const { data: exhibitorUsersData, isLoading: loadingExhibitor } = useQuery({
    queryKey: ['portal-users'],
    queryFn: () => clientsApi.listPortalUsers(),
  })

  const { data: supplierUsersData, isLoading: loadingSupplier } = useQuery({
    queryKey: ['supplier-portal-users'],
    queryFn: () => clientsApi.listSupplierPortalUsers(),
  })

  const exhibitorUsers = (exhibitorUsersData ?? []).map((u: any) => ({ ...u, _portalType: 'EXPOSITOR' as const }))
  const supplierUsers = (supplierUsersData ?? []).map((u: any) => ({ ...u, _portalType: 'PROVEEDOR' as const }))
  const allUsers = [...exhibitorUsers, ...supplierUsers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const isLoading = loadingExhibitor || loadingSupplier

  const { data: exhibitorDetail } = useQuery({
    queryKey: ['portal-user-detail', selectedUserId],
    queryFn: () => clientsApi.getPortalUser(selectedUserId!),
    enabled: !!selectedUserId && selectedPortalType === 'EXPOSITOR',
  })

  const { data: supplierDetail } = useQuery({
    queryKey: ['supplier-portal-user-detail', selectedUserId],
    queryFn: () => clientsApi.getSupplierPortalUser(selectedUserId!),
    enabled: !!selectedUserId && selectedPortalType === 'PROVEEDOR',
  })

  const detail = selectedPortalType === 'EXPOSITOR' ? exhibitorDetail?.data : supplierDetail?.data

  const { data: allClientsData } = useQuery({
    queryKey: ['clients-for-portal'],
    queryFn: () => clientsApi.list({ pageSize: 500 }),
    enabled: addClientOpen,
  })

  const updateExhibitorMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.updatePortalUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-users'] }); qc.invalidateQueries({ queryKey: ['portal-user-detail', selectedUserId] }); message.success('Usuario actualizado') },
  })
  const resetExhibitorPwdMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => clientsApi.resetPortalUserPassword(id, password),
    onSuccess: () => { setResetPwdOpen(false); resetPwdForm.resetFields(); message.success('Contraseña restablecida') },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })
  const addClientMut = useMutation({
    mutationFn: ({ portalUserId, clientId }: { portalUserId: string; clientId: string }) => clientsApi.addPortalUserClient(portalUserId, clientId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-user-detail', selectedUserId] }); setAddClientOpen(false); addClientForm.resetFields(); message.success('Cliente vinculado') },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })
  const removeClientMut = useMutation({
    mutationFn: ({ portalUserId, clientId }: { portalUserId: string; clientId: string }) => clientsApi.removePortalUserClient(portalUserId, clientId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-user-detail', selectedUserId] }); message.success('Cliente desvinculado') },
  })
  const updateSupplierMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.updateSupplierPortalUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-portal-users'] }); qc.invalidateQueries({ queryKey: ['supplier-portal-user-detail', selectedUserId] }); message.success('Usuario actualizado') },
  })
  const resetSupplierPwdMut = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => clientsApi.resetSupplierPortalUserPassword(id, password),
    onSuccess: () => { setResetPwdOpen(false); resetPwdForm.resetFields(); message.success('Contraseña restablecida') },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const updateMut = selectedPortalType === 'EXPOSITOR' ? updateExhibitorMut : updateSupplierMut
  const resetPwdMut = selectedPortalType === 'EXPOSITOR' ? resetExhibitorPwdMut : resetSupplierPwdMut

  const filtered = allUsers.filter(u => {
    if (portalFilter !== 'ALL' && u._portalType !== portalFilter) return false
    if (search) return `${u.email} ${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
    return true
  })

  return (
    <div style={{ background: '#fff' }}>
      <div style={{ padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Buscar por nombre o email…"
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <Segmented
          options={[
            { label: 'Todos', value: 'ALL' },
            { label: 'Expositores', value: 'EXPOSITOR' },
            { label: 'Proveedores', value: 'PROVEEDOR' },
          ]}
          value={portalFilter}
          onChange={v => setPortalFilter(v as PortalType)}
        />
      </div>

      <Table
        dataSource={filtered}
        rowKey={r => `${r._portalType}-${r.id}`}
        loading={isLoading}
        size="middle"
        pagination={{ pageSize: 20, showTotal: t => `${t} usuarios` }}
        columns={[
          {
            title: 'Usuario',
            render: (_: any, r: any) => (
              <Space>
                <Avatar
                  icon={r._portalType === 'EXPOSITOR' ? <UserOutlined /> : <ShopOutlined />}
                  size="small"
                  style={{ backgroundColor: r.isActive ? (r._portalType === 'EXPOSITOR' ? '#6B46C1' : '#0369a1') : '#d9d9d9' }}
                />
                <div>
                  <Text strong style={{ fontSize: 13 }}>{r.firstName} {r.lastName}</Text>
                  <div><Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text></div>
                </div>
              </Space>
            ),
          },
          {
            title: 'Portal',
            width: 140,
            render: (_: any, r: any) => r._portalType === 'EXPOSITOR'
              ? <Tag color="purple">Expositores</Tag>
              : <Tag color="blue">Proveedores</Tag>,
          },
          {
            title: 'Vinculado a',
            render: (_: any, r: any) => {
              if (r._portalType === 'EXPOSITOR') {
                if (!r.client) return <Text type="secondary">—</Text>
                return <Text>{r.client.companyName || `${r.client.firstName ?? ''} ${r.client.lastName ?? ''}`.trim()}</Text>
              }
              const first = r.suppliers?.[0]?.supplier
              return first ? <Text>{first.name}</Text> : <Text type="secondary">—</Text>
            },
          },
          {
            title: 'Estado',
            dataIndex: 'isActive',
            width: 90,
            render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
          },
          {
            title: 'Creado',
            dataIndex: 'createdAt',
            width: 100,
            render: (v: string) => <span style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</span>,
          },
          {
            title: '',
            width: 80,
            render: (_: any, r: any) => (
              <Button size="small" onClick={() => { setSelectedUserId(r.id); setSelectedPortalType(r._portalType); setDetailDrawerOpen(true) }}>
                Detalle
              </Button>
            ),
          },
        ]}
      />

      <Drawer
        open={detailDrawerOpen}
        onClose={() => { setDetailDrawerOpen(false); setSelectedUserId(null) }}
        title={
          <Space>
            {selectedPortalType === 'EXPOSITOR' ? <Tag color="purple">Expositores</Tag> : <Tag color="blue">Proveedores</Tag>}
            Detalle de Usuario
          </Space>
        }
        width={520}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Nombre">{detail.firstName} {detail.lastName}</Descriptions.Item>
              <Descriptions.Item label="Email">{detail.email}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{detail.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Estado"><Tag color={detail.isActive ? 'green' : 'red'}>{detail.isActive ? 'Activo' : 'Inactivo'}</Tag></Descriptions.Item>
              <Descriptions.Item label="Creado">{dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            </Descriptions>
            <Space style={{ marginTop: 16, marginBottom: 24 }}>
              <Button icon={detail.isActive ? <StopOutlined /> : <CheckCircleOutlined />} danger={detail.isActive} onClick={() => updateMut.mutate({ id: detail.id, data: { isActive: !detail.isActive } })} loading={updateMut.isPending}>
                {detail.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button icon={<LockOutlined />} onClick={() => setResetPwdOpen(true)}>Restablecer Contraseña</Button>
            </Space>

            {selectedPortalType === 'EXPOSITOR' ? (
              <>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Clientes que Representa</Text>
                {(detail.clients ?? []).length === 0
                  ? <Empty description="Sin clientes vinculados" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginBottom: 16 }} />
                  : (
                    <List size="small" style={{ marginBottom: 16 }} dataSource={detail.clients} renderItem={(link: any) => {
                      const c = link.client
                      const name = c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim()
                      return (
                        <List.Item actions={[
                          <Popconfirm key="rm" title="¿Desvincular cliente?" onConfirm={() => removeClientMut.mutate({ portalUserId: detail.id, clientId: c.id })}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>,
                        ]}>
                          <List.Item.Meta avatar={<Avatar icon={<UserOutlined />} size="small" />} title={name} description={<Tag>{c.personType === 'MORAL' ? 'Moral' : 'Física'}</Tag>} />
                        </List.Item>
                      )
                    }} />
                  )}
                <Button icon={<PlusOutlined />} onClick={() => { addClientForm.resetFields(); setAddClientOpen(true) }}>Vincular Cliente</Button>
                <Text strong style={{ display: 'block', margin: '16px 0 8px' }}>Eventos con Acceso</Text>
                {(detail.events ?? []).length === 0
                  ? <Empty description="Sin eventos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  : (
                    <List size="small" dataSource={detail.events} renderItem={(ue: any) => (
                      <List.Item>
                        <List.Item.Meta avatar={<Avatar icon={<CalendarOutlined />} size="small" style={{ backgroundColor: '#1677ff' }} />} title={ue.event?.name} description={<Space><Tag>{ue.event?.status}</Tag><Text type="secondary" style={{ fontSize: 11 }}>{ue.event?.code}</Text></Space>} />
                      </List.Item>
                    )} />
                  )}
              </>
            ) : (
              <>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Proveedores Vinculados</Text>
                {(detail.suppliers ?? []).length === 0
                  ? <Empty description="Sin proveedores vinculados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  : (
                    <List size="small" dataSource={detail.suppliers} renderItem={(link: any) => {
                      const s = link.supplier
                      return (
                        <List.Item>
                          <List.Item.Meta avatar={<Avatar icon={<ShopOutlined />} size="small" style={{ backgroundColor: '#0369a1' }} />} title={s?.name} description={<Space><Tag>{s?.code}</Tag><Tag color="blue">{s?.type}</Tag></Space>} />
                        </List.Item>
                      )
                    }} />
                  )}
              </>
            )}
          </>
        )}
      </Drawer>

      <Modal open={resetPwdOpen} title="Restablecer Contraseña" onCancel={() => { setResetPwdOpen(false); resetPwdForm.resetFields() }} onOk={() => resetPwdForm.submit()} confirmLoading={resetPwdMut.isPending} forceRender>
        <Form form={resetPwdForm} layout="vertical" onFinish={(v: any) => resetPwdMut.mutate({ id: selectedUserId!, password: v.password })}>
          <Form.Item name="password" label="Nueva Contraseña" rules={[{ required: true }, { min: 6 }]}><Input.Password /></Form.Item>
          <Form.Item name="confirmPassword" label="Confirmar Contraseña" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('No coinciden')) } })]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={addClientOpen} title="Vincular Cliente" onCancel={() => { setAddClientOpen(false); addClientForm.resetFields() }} onOk={() => addClientForm.submit()} confirmLoading={addClientMut.isPending} forceRender>
        <Form form={addClientForm} layout="vertical" onFinish={(v: any) => addClientMut.mutate({ portalUserId: selectedUserId!, clientId: v.clientId })}>
          <Form.Item name="clientId" label="Cliente" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" placeholder="Buscar cliente..." options={(allClientsData?.data ?? []).map((c: any) => ({ value: c.id, label: c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Tab: Perfiles y permisos ─────────────────────────────────────────────────
function ProfilesTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => apiClient.get('/profiles').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { name: values.name, description: values.description, privileges: values.privileges ?? [] }
      return editingId
        ? apiClient.put(`/profiles/${editingId}`, payload).then(r => r.data)
        : apiClient.post('/profiles', payload).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setModalOpen(false)
      form.resetFields()
      setEditingId(null)
      message.success('Perfil guardado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/profiles/${id}`).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles'] }); message.success('Perfil eliminado') },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  function openEdit(record: any) {
    setEditingId(record.id)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      privileges: record.privileges?.map((p: any) => p.privilegeKey) ?? [],
    })
    setModalOpen(true)
  }

  const profiles = data?.data ?? []

  return (
    <div style={{ background: '#fafafa' }}>
      <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
          Crear perfil
        </Button>
      </div>

      {isLoading ? (
        <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
      ) : profiles.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay perfiles" style={{ padding: 64 }} />
      ) : (
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {profiles.map((profile: any, idx: number) => {
            const color = PROFILE_COLORS[idx % PROFILE_COLORS.length]
            const privKeys: string[] = profile.privileges?.map((p: any) => p.privilegeKey) ?? []
            const samplePrivs = privKeys.slice(0, 6)
            return (
              <Card
                key={profile.id}
                size="small"
                styles={{ body: { padding: 0 } }}
                style={{ borderLeft: `4px solid ${color}`, borderRadius: 8 }}
              >
                {/* Card header */}
                <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <Text strong style={{ fontSize: 14 }}>{profile.name}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Tag color="blue" style={{ fontSize: 11 }}>{profile._count?.users ?? 0} usuarios</Tag>
                      <Tag style={{ fontSize: 11 }}>{privKeys.length} permisos</Tag>
                    </div>
                  </div>
                  <Space size={2}>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(profile)} />
                    <Popconfirm title="¿Eliminar este perfil?" onConfirm={() => deleteMutation.mutate(profile.id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>

                {profile.description && (
                  <div style={{ padding: '0 16px 8px' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{profile.description}</Text>
                  </div>
                )}

                {/* Privilege pills */}
                {samplePrivs.length > 0 && (
                  <div style={{ padding: '8px 16px 14px', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {samplePrivs.map(key => {
                        const label = PRIVILEGE_GROUPS.flatMap(g => g.privileges).find(p => p.key === key)?.label ?? key
                        return (
                          <span key={key} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: `${color}18`, color, fontWeight: 500 }}>
                            ✓ {label}
                          </span>
                        )
                      })}
                      {privKeys.length > 6 && (
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', padding: '1px 4px' }}>
                          +{privKeys.length - 6} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal title={editingId ? 'Editar Perfil' : 'Nuevo Perfil'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditingId(null) }} onOk={() => form.submit()} width={800} confirmLoading={saveMutation.isPending} forceRender>
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="Nombre del Perfil" rules={[{ required: true }]}><Input placeholder="Ej. Coordinador, Ventas, Almacén" /></Form.Item></Col>
            <Col span={12}><Form.Item name="description" label="Descripción"><Input placeholder="Descripción breve del perfil" /></Form.Item></Col>
          </Row>
          <Form.Item name="privileges" label="Privilegios"><PrivilegesSelector /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function UsersAndProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'internos'

  function handleTabChange(key: string) {
    const next = new URLSearchParams(searchParams)
    next.set('tab', key)
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Usuarios y Perfiles"
        meta="Cuentas de equipo interno, portal cliente y matriz de permisos"
        tabs={
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { key: 'internos', label: 'Usuarios internos' },
              { key: 'portal',   label: 'Usuarios portal' },
              { key: 'perfiles', label: 'Perfiles y permisos' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #6B46C1' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: activeTab === tab.key ? '#6B46C1' : 'rgba(0,0,0,0.65)',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {activeTab === 'internos' && <InternalUsersTab />}
      {activeTab === 'portal' && <PortalUsersTab />}
      {activeTab === 'perfiles' && <ProfilesTab />}
    </div>
  )
}
