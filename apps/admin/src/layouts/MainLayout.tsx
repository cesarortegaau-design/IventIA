import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Badge } from 'antd'
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
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { chatApi } from '../api/chat'

const { Sider, Header, Content } = Layout
const { Text } = Typography

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
    key: 'catalogos',
    icon: <AppstoreOutlined />,
    label: 'Catálogos',
    children: [
      { key: '/catalogos/recursos', icon: <TagsOutlined />, label: 'Recursos' },
      { key: '/catalogos/listas-precio', icon: <DollarOutlined />, label: 'Listas de Precio' },
      { key: '/catalogos/clientes', icon: <TeamOutlined />, label: 'Clientes' },
      { key: '/catalogos/departamentos', icon: <ApartmentOutlined />, label: 'Departamentos' },
      { key: '/catalogos/usuarios', icon: <UserOutlined />, label: 'Usuarios' },
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
      { key: '/reportes/ordenes',    icon: <DollarOutlined />,   label: 'Órdenes de Servicio' },
      { key: '/booking-calendar',    icon: <CalendarOutlined />, label: 'Calendario de Espacios' },
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        style={{ background: '#1a0533', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}
        collapsible
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>IventIA</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 12 }}>Core</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['catalogos', 'reportes', 'dashboards']}
          items={menuItems.map(item =>
            item.key === '/chat'
              ? { ...item, label: <Badge count={unread} size="small" offset={[8, 0]}>{item.label}</Badge> }
              : item
          )}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: 240 }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#6B46C1' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Text>{user?.firstName} {user?.lastName}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
