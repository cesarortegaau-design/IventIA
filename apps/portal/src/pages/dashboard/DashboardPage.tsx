import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Typography, Tag, Button, Empty, Spin, Space } from 'antd'
import { CalendarOutlined, ShoppingCartOutlined, RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'
import { useAuthStore } from '../../stores/authStore'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_EXECUTION: 'orange', CLOSED: 'default', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado', CONFIRMED: 'Confirmado', IN_EXECUTION: 'En Ejecución', CLOSED: 'Cerrado', CANCELLED: 'Cancelado',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['portal-events'],
    queryFn: () => eventsApi.list(),
  })

  const events = data?.data?.data ?? []

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Bienvenido, {user?.firstName}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Aquí encontrarás los eventos a los que tienes acceso.
      </Text>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : events.length === 0 ? (
        <Empty description="No tienes eventos asignados aún" />
      ) : (
        <Row gutter={[16, 16]}>
          {events.map((event: any) => (
            <Col xs={24} sm={12} lg={8} key={event.id}>
              <Card
                hoverable
                onClick={() => navigate(`/events/${event.id}`)}
                styles={{ body: { padding: 20 } }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Tag color="purple">{event.code}</Tag>
                    <Tag color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Tag>
                  </div>
                  <Title level={5} style={{ margin: 0 }}>{event.name}</Title>
                  {event.eventStart && (
                    <Space>
                      <CalendarOutlined style={{ color: '#531dab' }} />
                      <Text type="secondary">
                        {dayjs(event.eventStart).format('DD MMM YYYY')}
                        {event.eventEnd ? ` → ${dayjs(event.eventEnd).format('DD MMM YYYY')}` : ''}
                      </Text>
                    </Space>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    {['CONFIRMED', 'IN_EXECUTION'].includes(event.status) ? (
                      <Button
                        type="primary"
                        size="small"
                        icon={<ShoppingCartOutlined />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}/new-order`) }}
                      >
                        Nueva Solicitud
                      </Button>
                    ) : (
                      <Tag color={event.status === 'CLOSED' ? 'default' : 'red'}>
                        {event.status === 'CLOSED' ? 'Cerrado' : event.status === 'CANCELLED' ? 'Cancelado' : event.status}
                      </Tag>
                    )}
                    <Button type="link" size="small" icon={<RightOutlined />}>Ver evento</Button>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
