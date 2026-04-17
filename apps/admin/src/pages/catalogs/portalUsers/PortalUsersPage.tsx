import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Table, Tag, Typography, Button, Space, Input, Modal, Form,
  Select, App, Popconfirm, Descriptions, List, Avatar, Empty, Drawer,
} from 'antd'
import {
  UserOutlined, SearchOutlined, LockOutlined, TeamOutlined,
  PlusOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { clientsApi } from '../../../api/clients'

const { Title, Text } = Typography

export default function PortalUsersPage() {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const [search, setSearch] = useState('')
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdForm] = Form.useForm()
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addClientForm] = Form.useForm()

  const { data: portalUsersData, isLoading } = useQuery({
    queryKey: ['portal-users'],
    queryFn: () => clientsApi.listPortalUsers(),
  })
  const portalUsers = portalUsersData ?? []

  const { data: portalUserDetail } = useQuery({
    queryKey: ['portal-user-detail', selectedUserId],
    queryFn: () => clientsApi.getPortalUser(selectedUserId!),
    enabled: !!selectedUserId,
  })
  const detail = portalUserDetail?.data

  const { data: allClientsData } = useQuery({
    queryKey: ['clients-for-portal'],
    queryFn: () => clientsApi.list({ pageSize: 500 }),
    enabled: addClientOpen,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.updatePortalUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-users'] })
      qc.invalidateQueries({ queryKey: ['portal-user-detail', selectedUserId] })
      message.success('Usuario actualizado')
    },
  })

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => clientsApi.resetPortalUserPassword(id, password),
    onSuccess: () => { setResetPwdOpen(false); resetPwdForm.resetFields(); message.success('Contraseña restablecida') },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const addClientMutation = useMutation({
    mutationFn: ({ portalUserId, clientId }: { portalUserId: string; clientId: string }) => clientsApi.addPortalUserClient(portalUserId, clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-user-detail', selectedUserId] })
      setAddClientOpen(false)
      addClientForm.resetFields()
      message.success('Cliente vinculado')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const removeClientMutation = useMutation({
    mutationFn: ({ portalUserId, clientId }: { portalUserId: string; clientId: string }) => clientsApi.removePortalUserClient(portalUserId, clientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-user-detail', selectedUserId] })
      message.success('Cliente desvinculado')
    },
  })

  const filtered = search
    ? portalUsers.filter((u: any) =>
        `${u.email} ${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()),
      )
    : portalUsers

  const columns = [
    {
      title: 'Usuario',
      key: 'name',
      render: (_: any, r: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: r.isActive ? '#6B46C1' : '#d9d9d9' }} size="small" />
          <div>
            <Text strong style={{ fontSize: 13 }}>{r.firstName} {r.lastName}</Text>
            <div><Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Cliente Vinculado',
      key: 'client',
      render: (_: any, r: any) => {
        if (!r.client) return <Text type="secondary">—</Text>
        const name = r.client.companyName || `${r.client.firstName ?? ''} ${r.client.lastName ?? ''}`.trim()
        return <Text>{name}</Text>
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Acciones',
      width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button
            size="small"
            onClick={() => { setSelectedUserId(r.id); setDetailDrawerOpen(true) }}
          >
            Detalle
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <div style={{ background: '#6B46C1', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
            <TeamOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>Usuarios de Portal</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Gestiona usuarios del portal de expositores</Text>
          </div>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Input
          placeholder="Buscar por nombre o email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 400 }}
        />
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, showTotal: t => `${t} usuarios` }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => { setDetailDrawerOpen(false); setSelectedUserId(null) }}
        title="Detalle de Usuario de Portal"
        width={520}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Nombre">{detail.firstName} {detail.lastName}</Descriptions.Item>
              <Descriptions.Item label="Email">{detail.email}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{detail.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={detail.isActive ? 'green' : 'red'}>{detail.isActive ? 'Activo' : 'Inactivo'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Creado">{dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            </Descriptions>

            <Space style={{ marginTop: 16, marginBottom: 24 }}>
              <Button
                icon={detail.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                danger={detail.isActive}
                onClick={() => updateMutation.mutate({ id: detail.id, data: { isActive: !detail.isActive } })}
                loading={updateMutation.isPending}
              >
                {detail.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => setResetPwdOpen(true)}
              >
                Restablecer Contraseña
              </Button>
            </Space>

            <Title level={5}>Clientes que Representa</Title>
            {(detail.clients ?? []).length === 0 ? (
              <Empty description="Sin clientes vinculados" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginBottom: 16 }} />
            ) : (
              <List
                size="small"
                dataSource={detail.clients}
                style={{ marginBottom: 16 }}
                renderItem={(link: any) => {
                  const c = link.client
                  const name = c?.companyName || `${c?.firstName ?? ''} ${c?.lastName ?? ''}`.trim()
                  return (
                    <List.Item
                      actions={[
                        <Popconfirm key="rm" title="¿Desvincular cliente?" onConfirm={() => removeClientMutation.mutate({ portalUserId: detail.id, clientId: c.id })}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} size="small" />}
                        title={name}
                        description={<Tag>{c.personType === 'MORAL' ? 'Moral' : 'Física'}</Tag>}
                      />
                    </List.Item>
                  )
                }}
              />
            )}
            <Button icon={<PlusOutlined />} onClick={() => { addClientForm.resetFields(); setAddClientOpen(true) }}>
              Vincular Cliente
            </Button>

            <Title level={5} style={{ marginTop: 24 }}>Eventos con Acceso</Title>
            {(detail.events ?? []).length === 0 ? (
              <Empty description="Sin eventos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={detail.events}
                renderItem={(ue: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<CalendarOutlined />} size="small" style={{ backgroundColor: '#1677ff' }} />}
                      title={ue.event?.name}
                      description={<Space><Tag>{ue.event?.status}</Tag><Text type="secondary" style={{ fontSize: 11 }}>{ue.event?.code}</Text></Space>}
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </Drawer>

      {/* Reset Password Modal */}
      <Modal
        open={resetPwdOpen}
        title="Restablecer Contraseña"
        onCancel={() => { setResetPwdOpen(false); resetPwdForm.resetFields() }}
        onOk={() => resetPwdForm.submit()}
        confirmLoading={resetPwdMutation.isPending}
      >
        <Form
          form={resetPwdForm}
          layout="vertical"
          onFinish={(v: any) => resetPwdMutation.mutate({ id: selectedUserId!, password: v.password })}
        >
          <Form.Item name="password" label="Nueva Contraseña" rules={[{ required: true }, { min: 6, message: 'Mínimo 6 caracteres' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirmar Contraseña" dependencies={['password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('Las contraseñas no coinciden'))
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Client Modal */}
      <Modal
        open={addClientOpen}
        title="Vincular Cliente"
        onCancel={() => { setAddClientOpen(false); addClientForm.resetFields() }}
        onOk={() => addClientForm.submit()}
        confirmLoading={addClientMutation.isPending}
      >
        <Form
          form={addClientForm}
          layout="vertical"
          onFinish={(v: any) => addClientMutation.mutate({ portalUserId: selectedUserId!, clientId: v.clientId })}
        >
          <Form.Item name="clientId" label="Cliente" rules={[{ required: true, message: 'Selecciona un cliente' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar cliente..."
              options={(allClientsData?.data ?? []).map((c: any) => ({
                value: c.id,
                label: c.companyName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
