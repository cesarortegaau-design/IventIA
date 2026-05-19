import { useQuery } from '@tanstack/react-query'
import {
  Row, Col, Card, Typography, Tag, Button, Empty, Statistic, Space, Avatar,
} from 'antd'
import {
  CalendarOutlined, UserOutlined, PlusOutlined, RocketOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { eventsApi } from '../../api/events'

const { Title, Text } = Typography

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  QUOTED:       { color: '#F97316', label: 'Cotizado',     icon: <ClockCircleOutlined /> },
  CONFIRMED:    { color: '#7C3AED', label: 'Confirmado',   icon: <CheckCircleOutlined /> },
  IN_EXECUTION: { color: '#0D9488', label: 'En ejecución', icon: <ThunderboltOutlined /> },
  CLOSED:       { color: '#6B7280', label: 'Cerrado',      icon: <CheckCircleOutlined /> },
  CANCELLED:    { color: '#DC2626', label: 'Cancelado',    icon: <ClockCircleOutlined /> },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['planner-events'],
    queryFn: () => eventsApi.list({ pageSize: 50 }),
  })

  const events: any[] = data?.data || []

  const stats = {
    total: events.length,
    confirmed: events.filter((e) => e.status === 'CONFIRMED').length,
    inExecution: events.filter((e) => e.status === 'IN_EXECUTION').length,
    quoted: events.filter((e) => e.status === 'QUOTED').length,
  }

  const upcoming = events
    .filter((e) => ['QUOTED', 'CONFIRMED', 'IN_EXECUTION'].includes(e.status))
    .sort((a, b) => dayjs(a.eventStart).diff(dayjs(b.eventStart)))
    .slice(0, 12)

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <Title
            level={3}
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
            }}
          >
            Panel de control
          </Title>
          <Text style={{ color: 'var(--pl-text-secondary)' }}>
            {dayjs().format('dddd, D [de] MMMM YYYY')}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/eventos/nuevo')}
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            border: 'none',
            height: 40,
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          Nuevo evento
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Total eventos',  value: stats.total,       color: '#7C3AED', icon: <CalendarOutlined /> },
          { label: 'Cotizados',      value: stats.quoted,      color: '#F97316', icon: <ClockCircleOutlined /> },
          { label: 'Confirmados',    value: stats.confirmed,   color: '#0D9488', icon: <CheckCircleOutlined /> },
          { label: 'En ejecución',   value: stats.inExecution, color: '#EC4899', icon: <RocketOutlined /> },
        ].map((stat) => (
          <Col xs={12} sm={6} key={stat.label}>
            <Card
              style={{
                borderRadius: 16,
                border: '1px solid var(--pl-border)',
                boxShadow: 'var(--pl-shadow)',
                background: `linear-gradient(135deg, ${stat.color}08, ${stat.color}18)`,
                borderLeft: `4px solid ${stat.color}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Statistic
                  value={stat.value}
                  title={
                    <Text
                      style={{
                        fontSize: 12,
                        color: 'var(--pl-text-secondary)',
                      }}
                    >
                      {stat.label}
                    </Text>
                  }
                  valueStyle={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1.2,
                  }}
                />
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: stat.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Event Cards */}
      <Title level={5} style={{ marginBottom: 16, fontWeight: 700 }}>
        Próximos eventos
      </Title>
      {upcoming.length === 0 && !isLoading ? (
        <Card
          style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}
        >
          <Empty description="No hay eventos próximos" />
          <Button
            type="primary"
            onClick={() => navigate('/eventos/nuevo')}
            style={{ marginTop: 16 }}
          >
            Crear primer evento
          </Button>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {upcoming.map((event) => {
            const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.QUOTED
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={event.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/eventos/${event.id}`)}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${cfg.color}30`,
                    boxShadow: 'var(--pl-shadow)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <Tag
                      icon={cfg.icon}
                      color={cfg.color}
                      style={{
                        borderRadius: 20,
                        fontWeight: 600,
                        fontSize: 11,
                        border: 'none',
                      }}
                    >
                      {cfg.label}
                    </Tag>
                    <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)' }}>
                      #{event.code}
                    </Text>
                  </div>

                  <Text
                    strong
                    style={{
                      fontSize: 15,
                      display: 'block',
                      marginBottom: 8,
                      lineHeight: 1.3,
                    }}
                  >
                    {event.name}
                  </Text>

                  {event.primaryClient && (
                    <Space size={6} style={{ marginBottom: 8 }}>
                      <Avatar
                        size={18}
                        icon={<UserOutlined />}
                        style={{ background: '#7C3AED20', color: '#7C3AED' }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: 'var(--pl-text-secondary)',
                        }}
                      >
                        {event.primaryClient.companyName ||
                          `${event.primaryClient.firstName} ${event.primaryClient.lastName}`}
                      </Text>
                    </Space>
                  )}

                  {event.eventStart && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      <CalendarOutlined
                        style={{ fontSize: 12, color: cfg.color }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: 'var(--pl-text-secondary)',
                        }}
                      >
                        {dayjs(event.eventStart).format('D MMM YYYY')}
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}
