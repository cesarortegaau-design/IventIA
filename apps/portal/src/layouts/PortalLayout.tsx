import { Layout, Menu, Typography, Avatar, Dropdown, Space, Grid } from 'antd'
import {
  CalendarOutlined, ShoppingCartOutlined, UserOutlined, LogoutOutlined,
  HomeOutlined, UnorderedListOutlined, ScheduleOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ChatWidget from '../components/ChatWidget'

const { Header, Content, Sider, Footer } = Layout
const { Text } = Typography
const { useBreakpoint } = Grid

export default function PortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const selectedKey = location.pathname.startsWith('/events')
    ? '/events'
    : location.pathname.startsWith('/orders')
    ? '/orders'
    : location.pathname.startsWith('/calendar')
    ? '/calendar'
    : location.pathname.startsWith('/profile')
    ? '/profile'
    : '/'

  const navItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Mis Eventos' },
    { key: '/orders', icon: <UnorderedListOutlined />, label: 'Solicitudes' },
    { key: '/calendar', icon: <ScheduleOutlined />, label: 'Calendario' },
    { key: '/profile', icon: <UserOutlined />, label: 'Mis Datos' },
  ]

  const menuItems = navItems.map(i => ({ ...i, onClick: () => navigate(i.key) }))

  const userMenu = [
    { key: 'profile', icon: <UserOutlined />, label: 'Mis Datos', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', onClick: () => { clearAuth(); navigate('/login') } },
  ]

  return (
    <>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: '#531dab',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <Space>
            <CalendarOutlined style={{ color: '#fff', fontSize: 20 }} />
            {!isMobile && (
              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Portal de Expositores</Text>
            )}
            {isMobile && (
              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Portal</Text>
            )}
          </Space>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#391085' }} icon={<UserOutlined />} />
              {!isMobile && (
                <Text style={{ color: '#fff' }}>{user?.firstName} {user?.lastName}</Text>
              )}
            </Space>
          </Dropdown>
        </Header>

        <Layout>
          {/* Desktop sidebar */}
          {!isMobile && (
            <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={menuItems}
                style={{ height: '100%', borderRight: 0, paddingTop: 16 }}
              />
            </Sider>
          )}

          <Layout style={{ padding: isMobile ? '12px 12px 80px' : '24px' }}>
            <Content style={{
              background: '#fff',
              padding: isMobile ? 16 : 24,
              borderRadius: 8,
              minHeight: 400,
            }}>
              <Outlet />
            </Content>
            {!isMobile && (
              <Footer style={{ textAlign: 'center', background: 'transparent', paddingTop: 16 }}>
                <Text type="secondary">© {new Date().getFullYear()} IventIA — Portal de Expositores</Text>
              </Footer>
            )}
          </Layout>
        </Layout>
      </Layout>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #f0f0f0',
          display: 'flex', zIndex: 200,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px 0', cursor: 'pointer',
                background: 'none', border: 'none',
                color: selectedKey === item.key ? '#531dab' : '#8c8c8c',
                fontSize: 10, gap: 3,
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <ChatWidget isMobile={isMobile} />
    </>
  )
}
