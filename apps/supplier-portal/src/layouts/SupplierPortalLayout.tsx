import { Layout, Menu, Typography, Avatar, Dropdown, Space, Grid } from 'antd'
import {
  ShopOutlined, UserOutlined, LogoutOutlined,
  HomeOutlined, UnorderedListOutlined, FileTextOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ChatWidget from '../components/ChatWidget'

const { Header, Content, Sider, Footer } = Layout
const { Text } = Typography
const { useBreakpoint } = Grid

const PRIMARY = '#0369a1'
const PRIMARY_DARK = '#075985'

export default function SupplierPortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const selectedKey = location.pathname.startsWith('/orders')
    ? '/orders'
    : location.pathname.startsWith('/documents')
    ? '/documents'
    : location.pathname.startsWith('/profile')
    ? '/profile'
    : '/dashboard'

  const navItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'Inicio' },
    { key: '/orders', icon: <UnorderedListOutlined />, label: 'Órdenes de Compra' },
    { key: '/documents', icon: <FileTextOutlined />, label: 'Documentos' },
    { key: '/profile', icon: <UserOutlined />, label: 'Mi Perfil' },
  ]

  const menuItems = navItems.map(i => ({ ...i, onClick: () => navigate(i.key) }))

  const userMenu = [
    { key: 'profile', icon: <UserOutlined />, label: 'Mi Perfil', onClick: () => navigate('/profile') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', onClick: () => { clearAuth(); navigate('/login') } },
  ]

  return (
    <>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: PRIMARY,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <Space>
            <ShopOutlined style={{ color: '#fff', fontSize: 20 }} />
            {!isMobile && (
              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Portal de Proveedores</Text>
            )}
            {isMobile && (
              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Proveedores</Text>
            )}
          </Space>
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: PRIMARY_DARK }} icon={<UserOutlined />} />
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

          <Layout style={{ padding: isMobile ? '8px 8px 80px' : '24px' }}>
            <Content style={{
              background: '#fff',
              padding: isMobile ? 10 : 24,
              borderRadius: 8,
              minHeight: 400,
            }}>
              <Outlet />
            </Content>
            {!isMobile && (
              <Footer style={{ textAlign: 'center', background: 'transparent', paddingTop: 16 }}>
                <Text type="secondary">© {new Date().getFullYear()} IventIA — Portal de Proveedores</Text>
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
                color: selectedKey === item.key ? PRIMARY : '#8c8c8c',
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
