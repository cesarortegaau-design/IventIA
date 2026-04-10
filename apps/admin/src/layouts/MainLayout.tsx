import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Badge, Drawer, Button, Grid } from 'antd'
import {
  CalendarOutlined,
  AppstoreOutlined,
  TeamOutlined,
  TagsOutlined,
  ApartmentOutlined,
  UserOutlined,
  BarChartOutlined,
  LogoutOutlined,
  DollarOutlined,
  ToolOutlined,
  ContactsOutlined,
  HomeOutlined,
  MessageOutlined,
  FileTextOutlined,
  MenuOutlined,
  ScheduleOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { chatApi } from '../api/chat'

const { Sider, Header, Content } = Layout
const { Text } = Typography
const { useBreakpoint } = Grid

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: 'Inicio',
  },
  {
    key: '/eventos',
    icon: <CalendarOutlined />,
    label: 'Eventos',
  },
  {
    key: '/booking-calendar',
    icon: <ScheduleOutlined />,
    label: 'Calendario de Reservas',
  },
  {
    key: 'catalogos',
    icon: <AppstoreOutlined />,
    label: 'Catálogos',
    children: [
      { key: '/catalogos/recursos', icon: <TagsOutlined />, label: 'Recursos' },
      { key: '/catalogos/listas-precio', icon: <DollarOutlined />, label: 'Listas de Precio' },
      { key: '/catalogos/clientes', icon: <TeamOutlined />, label: 'Clientes' },
      { key: '/catalogos/proveedores', icon: <ContactsOutlined />, label: 'Proveedores' },
      { key: '/catalogos/listas-precios-proveedores', icon: <DollarOutlined />, label: 'Listas de Precios Prov.' },
      { key: '/catalogos/ordenes-compra', icon: <FileTextOutlined />, label: 'Órdenes de Compra' },
      { key: '/catalogos/departamentos', icon: <ApartmentOutlined />, label: 'Departamentos' },
      { key: '/catalogos/usuarios', icon: <UserOutlined />, label: 'Usuarios' },
    ],
  },
  {
    key: 'almacen',
    icon: <ToolOutlined />,
    label: 'Almacén',
    children: [
      { key: '/warehouse/inventario', icon: <TagsOutlined />, label: 'Inventario' },
      { key: '/warehouse/recepcion', icon: <FileTextOutlined />, label: 'Recepción OC' },
    ],
  },
  {
    key: '/crm',
    icon: <ContactsOutlined />,
    label: 'CRM',
  },
  {
    key: '/chat',
    icon: <MessageOutlined />,
    label: 'Colabora',
  },
  {
    key: 'reportes',
    icon: <FileTextOutlined />,
    label: 'Reportes',
    children: [
      { key: '/reportes/ordenes', icon: <DollarOutlined />, label: 'Órdenes de Servicio' },
    ],
  },
  {
    key: 'dashboards',
    icon: <BarChartOutlined />,
    label: 'Dashboards',
    children: [
      { key: '/dashboard/contabilidad', icon: <DollarOutlined />, label: 'Contabilidad' },
      { key: '/dashboard/operaciones', icon: <ToolOutlined />, label: 'Operaciones' },
    ],
  },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: unreadData } = useQuery({
    queryKey: ['chat', 'admin', 'unread'],
    queryFn:  chatApi.unreadCount,
    refetchInterval: 15000,
  })
  const unread = unreadData?.unread ?? 0

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      onClick: () => { clearAuth(); navigate('/login') },
    },
  ]

  const enrichedMenuItems = menuItems.map(item =>
    item.key === '/chat'
      ? { ...item, label: <Badge count={unread} size="small" offset={[8, 0]}>{item.label}</Badge> }
      : item
  )

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  const siderMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      defaultOpenKeys={['catalogos', 'reportes', 'dashboards', 'almacen']}
      items={enrichedMenuItems}
      onClick={handleMenuClick}
      style={{ background: 'transparent', border: 'none', marginTop: 8 }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop fixed sider */}
      {!isMobile && (
        <Sider
          width={240}
          style={{ background: '#1a0533', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}
          collapsible
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>IventIA</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 12 }}>Core</Text>
          </div>
          {siderMenu}
        </Sider>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={260}
          styles={{ body: { padding: 0, background: '#1a0533' }, header: { display: 'none' } }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>IventIA</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 12 }}>Core</Text>
          </div>
          {siderMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : 240 }}>
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            {isMobile && (
              <Text style={{ fontWeight: 700, fontSize: 16, color: '#1a0533' }}>IventIA</Text>
            )}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#6B46C1' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              {!isMobile && <Text>{user?.firstName} {user?.lastName}</Text>}
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: isMobile ? 8 : 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
