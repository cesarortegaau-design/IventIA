import { Layout, Typography, Space } from 'antd'
import { ShopOutlined } from '@ant-design/icons'
import { Outlet } from 'react-router-dom'

const { Content, Footer, Header } = Layout
const { Text, Title } = Typography

const PRIMARY = '#0369a1'

export default function PublicLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <Header style={{
        background: PRIMARY,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Space>
          <ShopOutlined style={{ color: '#fff', fontSize: 22 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>Portal de Proveedores</Title>
        </Space>
      </Header>

      <Content style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        flex: 1,
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <Title level={2} style={{ color: PRIMARY, margin: 0 }}>IventIA</Title>
          <Text type="secondary">Portal de Proveedores</Text>
        </div>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        <Text type="secondary">© {new Date().getFullYear()} IventIA — Portal de Proveedores</Text>
      </Footer>
    </Layout>
  )
}
