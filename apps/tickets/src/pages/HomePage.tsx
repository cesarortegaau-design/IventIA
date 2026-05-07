import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Col, Row, Button, Typography, Space, Empty, Spin, Tag,
  Dropdown, Avatar, Drawer, Form, Input, Divider, message,
} from 'antd'
import {
  CalendarOutlined, EnvironmentOutlined, TagOutlined,
  UserOutlined, LogoutOutlined, TicketOutlined, EditOutlined,
  LockOutlined, DownOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ticketsApi } from '../api/client'
import { myTicketsApi } from '../api/myTickets'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

interface EventSummary {
  id: string
  slug: string
  name: string
  imageUrl?: string
  startDate: string
  venue?: string
  minPrice?: number
}

const PLACEHOLDER = 'https://via.placeholder.com/400x200/6B46C1/ffffff?text=Evento'

export default function HomePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, accessToken, setAuth, clearAuth } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['public-events'],
    queryFn: ticketsApi.listEvents,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (values: { firstName: string; lastName: string; phone?: string }) =>
      myTicketsApi.updateProfile(values),
    onSuccess: (res) => {
      const updated = res.data?.data
      if (updated && user) {
        const { refreshToken } = useAuthStore.getState()
        setAuth({ ...user, ...updated }, accessToken!, refreshToken!)
      }
      message.success('Datos actualizados')
    },
    onError: () => message.error('Error al actualizar los datos'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      myTicketsApi.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      message.success('Contraseña cambiada')
      passwordForm.resetFields()
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.error?.message ?? 'Error al cambiar la contraseña'),
  })

  const events: EventSummary[] = (apiResponse?.data || []).map((te: any) => {
    const minPrice = te.sections && te.sections.length > 0
      ? Math.min(...te.sections.map((s: any) => Number(s.price) || 0))
      : undefined
    return {
      id: te.id,
      slug: te.slug,
      name: te.event?.name || 'Evento',
      imageUrl: te.imageUrl || te.event?.imageUrl,
      startDate: te.event?.eventStart || '',
      venue: te.event?.venueLocation,
      minPrice: minPrice > 0 ? minPrice : undefined,
    }
  })

  function openProfileDrawer() {
    profileForm.setFieldsValue({
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone ?? '',
    })
    setDrawerOpen(true)
  }

  const userMenuItems = [
    {
      key: 'mis-boletos',
      icon: <TicketOutlined />,
      label: 'Mis boletos',
      onClick: () => navigate('/mis-boletos'),
    },
    {
      key: 'mis-datos',
      icon: <EditOutlined />,
      label: 'Mis datos',
      onClick: openProfileDrawer,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      danger: true,
      onClick: () => { clearAuth(); navigate('/') },
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6B46C1 0%, #9b79e3 100%)',
        padding: '0 28px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(107,70,193,0.25)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 800,
          }}>I</div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>IventIA</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 400 }}>Boletos</span>
        </div>

        {/* Auth area */}
        {accessToken && user ? (
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 8,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <Avatar
                size={28}
                style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', fontSize: 13, fontWeight: 700 }}
              >
                {user.firstName[0]}{user.lastName[0]}
              </Avatar>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
                {user.firstName}
              </span>
              <DownOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
            </div>
          </Dropdown>
        ) : (
          <Space size={8}>
            <Button
              size="small"
              onClick={() => navigate('/login')}
              style={{
                borderRadius: 6, borderColor: 'rgba(255,255,255,0.5)',
                background: 'transparent', color: '#fff', fontWeight: 500,
              }}
            >
              Iniciar sesión
            </Button>
            <Button
              size="small"
              onClick={() => navigate('/registro')}
              style={{
                borderRadius: 6, background: '#fff', borderColor: '#fff',
                color: '#6B46C1', fontWeight: 600,
              }}
            >
              Registrarse
            </Button>
          </Space>
        )}
      </div>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #f4eeff 0%, #faf8ff 100%)',
        padding: '32px 28px 24px',
        borderBottom: '1px solid #ede9fe',
      }}>
        <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>
          <span style={{ fontSize: 22 }}>🎫</span> Compra tus boletos
        </Title>
        <Text style={{ color: '#666', fontSize: 14 }}>
          Selecciona un evento para ver disponibilidad y precios
        </Text>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Title level={4} style={{ marginBottom: 24, color: '#333' }}>Eventos disponibles</Title>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <Spin size="large" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <Empty description="No hay eventos disponibles en este momento" style={{ padding: 64 }} />
        )}

        {!isLoading && events.length > 0 && (
          <Row gutter={[24, 24]}>
            {events.map(event => (
              <Col xs={24} sm={12} lg={8} key={event.id}>
                <Card
                  hoverable
                  cover={
                    <img
                      alt={event.name}
                      src={event.imageUrl || PLACEHOLDER}
                      style={{ height: 180, objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                    />
                  }
                  style={{
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    border: 'none',
                  }}
                  bodyStyle={{ padding: 20 }}
                >
                  <Title level={5} style={{ marginBottom: 12, color: '#1a1a1a' }}>{event.name}</Title>

                  <Space direction="vertical" size={6} style={{ width: '100%', marginBottom: 16 }}>
                    {event.startDate && (
                      <Space size={6}>
                        <CalendarOutlined style={{ color: '#6B46C1' }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {dayjs(event.startDate).format('DD MMM YYYY, HH:mm')}
                        </Text>
                      </Space>
                    )}
                    {event.venue && (
                      <Space size={6}>
                        <EnvironmentOutlined style={{ color: '#6B46C1' }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>{event.venue}</Text>
                      </Space>
                    )}
                    {event.minPrice !== undefined && (
                      <Space size={6}>
                        <TagOutlined style={{ color: '#6B46C1' }} />
                        <Tag color="purple" style={{ margin: 0 }}>
                          Desde ${event.minPrice.toLocaleString('es-MX')}
                        </Tag>
                      </Space>
                    )}
                  </Space>

                  <Button
                    type="primary"
                    block
                    style={{ borderRadius: 8 }}
                    onClick={() => navigate(`/evento/${event.slug}`)}
                  >
                    Ver boletos
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Profile Drawer */}
      <Drawer
        title="Mis datos"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={380}
        extra={
          <Button
            type="primary"
            loading={updateProfileMutation.isPending}
            style={{ background: '#6B46C1', borderColor: '#6B46C1', borderRadius: 8 }}
            onClick={() => profileForm.submit()}
          >
            Guardar
          </Button>
        }
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={(values) => updateProfileMutation.mutate(values)}
        >
          <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="lastName" label="Apellido" rules={[{ required: true, message: 'Requerido' }]}>
            <Input style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono">
            <Input placeholder="+52 55 1234 5678" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
        </Form>

        <Divider>Cambiar contraseña</Divider>

        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={(values) => changePasswordMutation.mutate(values)}
        >
          <Form.Item name="currentPassword" label="Contraseña actual" rules={[{ required: true, message: 'Requerido' }]}>
            <Input.Password prefix={<LockOutlined />} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="newPassword" label="Nueva contraseña" rules={[{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}>
            <Input.Password prefix={<LockOutlined />} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirmar nueva contraseña"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Requerido' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('Las contraseñas no coinciden'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Button
            block
            loading={changePasswordMutation.isPending}
            htmlType="submit"
            style={{ borderRadius: 8, borderColor: '#d3adf7', color: '#6B46C1' }}
          >
            Cambiar contraseña
          </Button>
        </Form>
      </Drawer>
    </div>
  )
}
