import { Card, Button, Typography } from 'antd'

const { Title, Paragraph } = Typography

export default function HomePage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title={<Title level={2}>IventIA Community Platform</Title>}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        <Paragraph>
          Welcome to the IventIA Community Platform. This is a space for exhibitors to connect and collaborate.
        </Paragraph>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <Button type="primary" size="large">
            Browse Community
          </Button>
          <Button size="large">
            Create Post
          </Button>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
          <Paragraph style={{ color: '#666' }}>
            Community features coming soon
          </Paragraph>
        </div>
      </Card>
    </div>
  )
}
