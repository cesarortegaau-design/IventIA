import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Badge } from 'antd'
import {
  DashboardOutlined,
  CalendarOutlined,
  TeamOutlined,
  ShopOutlined,
  BulbOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'

const { Sider, Content, Header } = Layout
const { Text } = Typography

const NAV_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/eventos', icon: <CalendarOutlined />, label: 'Eventos' },
  { key: '/clientes', icon: <TeamOutlined />, label: 'Clientes' },
  { key: '/proveedores', icon: <ShopOutlined />, label: 'Proveedores' },
  { key: '/estudio', icon: <BulbOutlined />, label: 'Estudio' },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const activeKey =
    NAV_ITEMS.find((i) => location.pathname.startsWith(i.key))?.key || '/dashboard'

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Cerrar sesión',
        danger: true,
        onClick: () => {
          clearAuth()
          navigate('/login')
        },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={64}
        style={{
          background: 'var(--pl-sidebar)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? '20px 16px' : '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            P
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  color: '#fff',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: 1.2,
                }}
              >
                IventIA
              </div>
              <div style={{ color: '#A78BFA', fontSize: 11, fontWeight: 500 }}>
                Planner
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 8,
            padding: '0 8px',
          }}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            style: {
              borderRadius: 10,
              marginBottom: 4,
              color:
                activeKey === item.key ? '#fff' : 'var(--pl-sidebar-text)',
              fontWeight: activeKey === item.key ? 600 : 400,
            },
          }))}
          theme="dark"
        />

        {/* Collapse toggle */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: 'var(--pl-sidebar-text)', width: 40, height: 40 }}
          />
        </div>
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 64 : 240,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--pl-border)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 56,
          }}
        >
          <div />
          <Space size={12}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => navigate('/eventos/nuevo')}
              style={{
                background:
                  'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                border: 'none',
                borderRadius: 8,
              }}
            >
              Nuevo evento
            </Button>
            <Badge count={0}>
              <Button type="text" icon={<BellOutlined />} shape="circle" />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Avatar
                  size={32}
                  style={{
                    background:
                      'linear-gradient(135deg, #7C3AED, #EC4899)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </Avatar>
                {user && (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--pl-text)',
                    }}
                  >
                    {user.firstName}
                  </Text>
                )}
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 56px)',
            background: 'var(--pl-bg)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
