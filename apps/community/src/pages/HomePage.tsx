import { Card, Empty } from 'antd'

export default function HomePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Card title="IventIA Community Platform">
        <Empty
          description="Community features coming soon"
          style={{ marginTop: '2rem' }}
        />
      </Card>
    </div>
  )
}
