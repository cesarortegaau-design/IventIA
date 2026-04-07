import { Layout, Menu, Avatar, Dropdown, Space, Badge } from 'antd'
import { ShoppingCartOutlined, UserOutlined, LogoutOutlined, HomeOutlined, UnorderedListOutlined, FileTextOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const { Header, Content, Sider, Footer } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const selectedKey = location.pathname === '/catalog' ? '/catalog'
    : location.pathname === '/memberships' ? '/memberships'
    : location.pathname === '/orders' ? '/orders'
    : location.pathname.startsWith('/artist') ? '/artist-dashboard'
    : '/dashboard'

  const navItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'Inicio', onClick: () => navigate('/dashboard') },
    { key: '/catalog', icon: <FileTextOutlined />, label: 'Catálogo', onClick: () => navigate('/catalog') },
    { key: '/memberships', icon: <FileTextOutlined />, label: 'Membresías', onClick: () => navigate('/memberships') },
    { key: '/orders', icon: <UnorderedListOutlined />, label: 'Mis Órdenes', onClick: () => navigate('/orders') },
    ...(user?.userRole === 'ARTIST'
      ? [{ key: '/artist-dashboard', icon: <FileTextOutlined />, label: 'Mi Dashboard', onClick: () => navigate('/artist-dashboard') }]
      : []),
  ]

  const userMenu = [
    { key: 'profile', icon: <UserOutlined />, label: 'Mi Perfil', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar Sesión', onClick: () => { clearAuth(); navigate('/') } },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: '#1a1a1a', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          🎨 Arte Capital
        </div>
        <Space>
          <Badge count={0} style={{ backgroundColor: '#1a1a1a' }}>
            <ShoppingCartOutlined style={{ color: '#fff', fontSize: 20, cursor: 'pointer' }} onClick={() => navigate('/cart')} />
          </Badge>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer', color: '#fff' }}>
              <Avatar style={{ backgroundColor: '#a8a39d' }} icon={<UserOutlined />} />
              {user?.firstName}
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
          <Menu mode="inline" selectedKeys={[selectedKey]} items={navItems} style={{ height: '100%', borderRight: 0, paddingTop: 16 }} />
        </Sider>

        <Layout style={{ padding: '24px' }}>
          <Content style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: 400 }}>
            <Outlet />
          </Content>
          <Footer style={{ textAlign: 'center', background: 'transparent', paddingTop: 16 }}>
            © {new Date().getFullYear()} Arte Capital
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}
