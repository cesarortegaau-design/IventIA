import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Typography, Button, Space, Input, Avatar, Drawer,
  Descriptions, List, Modal, Form, App, Empty,
} from 'antd'
import {
  SearchOutlined, UserOutlined, LockOutlined,
  CheckCircleOutlined, StopOutlined, ShoppingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { clientsApi } from '../../../api/clients'

const { Text, Title } = Typography

const STATUS_COLOR: Record<string, string> = {
  PAID: 'green', PENDING: 'orange', CANCELLED: 'red', REFUNDED: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado', PENDING: 'Pendiente', CANCELLED: 'Cancelado', REFUNDED: 'Reembolsado',
}

export default function TicketBuyerUsersTab() {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetPwdForm] = Form.useForm()

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['ticket-buyer-users'],
    queryFn: () => clientsApi.listTicketBuyerUsers(),
  })

  const { data: detailData } = useQuery({
    queryKey: ['ticket-buyer-user-detail', selectedId],
    queryFn: () => clientsApi.getTicketBuyerUser(selectedId!),
    enabled: !!selectedId,
  })
  const detail = detailData?.data

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.updateTicketBuyerUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-buyer-users'] })
      qc.invalidateQueries({ queryKey: ['ticket-buyer-user-detail', selectedId] })
      message.success('Usuario actualizado')
    },
  })

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      clientsApi.resetTicketBuyerUserPassword(id, password),
    onSuccess: () => {
      setResetPwdOpen(false)
      resetPwdForm.resetFields()
      message.success('Contraseña restablecida')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error'),
  })

  const users = usersData ?? []
  const filtered = users.filter((u: any) => {
    if (!search) return true
    return `${u.email} ${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  })

  const columns = [
    {
      title: 'Usuario',
      key: 'name',
      render: (_: any, r: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small"
            style={{ backgroundColor: r.isActive ? '#d97706' : '#d9d9d9' }} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{r.firstName} {r.lastName}</Text>
            <div><Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      width: 140,
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Órdenes',
      key: 'orders',
      width: 90,
      render: (_: any, r: any) => r._count?.orders ?? 0,
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
      width: 100,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => { setSelectedId(r.id); setDrawerOpen(true) }}>Detalle</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por nombre o email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 320 }}
        />
      </div>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 20, showTotal: t => `${t} compradores` }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedId(null) }}
        title={
          <Space>
            <Tag color="orange">Compradores de Boletos</Tag>
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
              <Descriptions.Item label="Estado">
                <Tag color={detail.isActive ? 'green' : 'red'}>{detail.isActive ? 'Activo' : 'Inactivo'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total órdenes">{detail._count?.orders ?? 0}</Descriptions.Item>
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
              <Button icon={<LockOutlined />} onClick={() => setResetPwdOpen(true)}>
                Restablecer Contraseña
              </Button>
            </Space>

            <Title level={5}>Órdenes Recientes</Title>
            {(detail.orders ?? []).length === 0 ? (
              <Empty description="Sin órdenes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={detail.orders}
                renderItem={(order: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<ShoppingOutlined />} size="small"
                        style={{ backgroundColor: order.status === 'PAID' ? '#16a34a' : '#d97706' }} />}
                      title={
                        <Space>
                          <Text style={{ fontSize: 12 }}>{order.ticketEvent?.event?.name ?? 'Evento'}</Text>
                          <Tag color={STATUS_COLOR[order.status]} style={{ fontSize: 10 }}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space split="·" style={{ fontSize: 11 }}>
                          <Text type="secondary">{dayjs(order.createdAt).format('DD/MM/YYYY')}</Text>
                          <Text type="secondary">${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </Drawer>

      <Modal
        open={resetPwdOpen}
        title="Restablecer Contraseña"
        onCancel={() => { setResetPwdOpen(false); resetPwdForm.resetFields() }}
        onOk={() => resetPwdForm.submit()}
        confirmLoading={resetPwdMutation.isPending}
        forceRender
      >
        <Form
          form={resetPwdForm}
          layout="vertical"
          onFinish={(v: any) => resetPwdMutation.mutate({ id: selectedId!, password: v.password })}
        >
          <Form.Item name="password" label="Nueva Contraseña"
            rules={[{ required: true }, { min: 6, message: 'Mínimo 6 caracteres' }]}>
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
    </div>
  )
}
