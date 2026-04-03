import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd'
import {
  CalendarOutlined, ShoppingCartOutlined, UserOutlined, LogoutOutlined,
  HomeOutlined, UnorderedListOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ChatWidget from '../components/ChatWidget'

const { Header, Content, Sider, Footer } = Layout
const { Text } = Typography

export default function PortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const selectedKey = location.pathname.startsWith('/events')
    ? '/events'
    : location.pathname.startsWith('/orders')
    ? '/orders'
    : location.pathname.startsWith('/profile')
    ? '/profile'
    : '/'

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Mis Eventos', onClick: () => navigate('/') },
    { key: '/orders', icon: <UnorderedListOutlined />, label: 'Mis Solicitudes', onClick: () => navigate('/orders') },
    { key: '/profile', icon: <UserOutlined />, label: 'Mis Datos', onClick: () => navigate('/profile') },
  ]

  const userMenu = [
    { key: 'profile', icon: <UserOutlined />, label: 'Mis Datos', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', onClick: () => { clearAuth(); navigate('/login') } },
  ]

  return (
    <>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#531dab' }}>
          <Space>
            <CalendarOutlined style={{ color: '#fff', fontSize: 20 }} />
            <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Portal de Expositores</Text>
          </Space>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#391085' }} icon={<UserOutlined />} />
              <Text style={{ color: '#fff' }}>{user?.firstName} {user?.lastName}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Layout>
          <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              style={{ height: '100%', borderRight: 0, paddingTop: 16 }}
            />
          </Sider>

          <Layout style={{ padding: '24px' }}>
            <Content style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: 400 }}>
              <Outlet />
            </Content>
            <Footer style={{ textAlign: 'center', background: 'transparent', paddingTop: 16 }}>
              <Text type="secondary">© {new Date().getFullYear()} IventIA — Portal de Expositores</Text>
            </Footer>
          </Layout>
        </Layout>
      </Layout>
      <ChatWidget />
    </>
  )
}
