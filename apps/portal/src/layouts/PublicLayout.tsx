import { Layout, Typography } from 'antd'
import { Outlet } from 'react-router-dom'

const { Content, Footer } = Layout
const { Text } = Typography

export default function PublicLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <Typography.Title level={2} style={{ color: '#531dab', margin: 0 }}>IventIA</Typography.Title>
          <Text type="secondary">Portal de Expositores</Text>
        </div>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        <Text type="secondary">© {new Date().getFullYear()} IventIA — Portal de Expositores</Text>
      </Footer>
    </Layout>
  )
}
