import { Layout, Button, Space } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'

const { Header, Content, Footer } = Layout

export default function PublicLayout() {
  const navigate = useNavigate()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#1a1a1a', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', cursor: 'pointer' }} onClick={() => navigate('/')}>
          🎨 Arte Capital
        </div>
        <Space>
          <Button onClick={() => navigate('/login')}>Iniciar Sesión</Button>
          <Button type="primary" onClick={() => navigate('/register')}>
            Registrarse
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '48px 24px' }}>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center', background: '#f9f7f5', borderTop: '1px solid #e8e6e3' }}>
        © {new Date().getFullYear()} Arte Capital — Marketplace de Arte
      </Footer>
    </Layout>
  )
}
