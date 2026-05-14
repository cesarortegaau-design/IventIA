import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Typography, Tag, Space, Button } from 'antd'
import {
  CalendarOutlined, TeamOutlined, FileTextOutlined, DollarOutlined,
  AppstoreOutlined, TagsOutlined, ApartmentOutlined, UserOutlined,
  BarChartOutlined, ToolOutlined, ContactsOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { eventsApi } from '../../api/events'
import { clientsApi } from '../../api/clients'

const { Title, Text } = Typography

// ── Brand colours (Expo Santa Fe palette) ────────────────────────────────────
const NAVY   = '#1a3a5c'
const NAVY2  = '#1e4d7b'
const BLUE   = '#2e7fc1'
const LIGHT  = '#f0f6ff'
const WHITE  = '#ffffff'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', CONFIRMED: 'blue', IN_PROGRESS: 'green',
  COMPLETED: 'purple', CANCELLED: 'red',
}

function today() {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode; value: number | string; label: string; color: string
}) {
  return (
    <Card
      styles={{ body: { padding: '24px 28px' } }}
      style={{
        borderRadius: 12, border: 'none',
        boxShadow: '0 2px 12px rgba(26,58,92,0.08)',
        height: '100%',
      }}
    >
      <Space direction="vertical" size={4}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${color}18`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color,
        }}>
          {icon}
        </div>
        <Title level={2} style={{ margin: 0, color: NAVY, fontWeight: 700 }}>
          {value}
        </Title>
        <Text style={{ color: '#64748b', fontSize: 13 }}>{label}</Text>
      </Space>
    </Card>
  )
}

function QuickCard({ icon, label, path, description }: {
  icon: React.ReactNode; label: string; path: string; description: string
}) {
  const navigate = useNavigate()
  return (
    <Card
      hoverable
      onClick={() => navigate(path)}
      styles={{ body: { padding: '20px 22px' } }}
      style={{
        borderRadius: 12, border: '1.5px solid #e8f0fe', cursor: 'pointer',
        transition: 'all .2s', height: '100%',
      }}
    >
      <Space direction="vertical" size={8}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: LIGHT, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: BLUE,
        }}>
          {icon}
        </div>
        <div>
          <Text strong style={{ color: NAVY, display: 'block', fontSize: 14 }}>{label}</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{description}</Text>
        </div>
      </Space>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'home'],
    queryFn: () => eventsApi.list({ limit: 100 }),
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'home'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  })

  const events   = eventsData?.data ?? []
  const clients  = clientsData?.data ?? []

  const activeEvents    = events.filter((e: any) => ['CONFIRMED', 'IN_PROGRESS'].includes(e.status)).length
  const totalClients    = clients.filter((c: any) => c.isActive).length
  const upcomingEvents  = events
    .filter((e: any) => ['DRAFT', 'CONFIRMED'].includes(e.status))
    .sort((a: any, b: any) => new Date(a.eventStart ?? a.setupStart ?? 0).getTime() - new Date(b.eventStart ?? b.setupStart ?? 0).getTime())
    .slice(0, 5)

  const totalOrders = events.reduce((sum: number, e: any) => sum + (e._count?.orders ?? 0), 0)

  return (
    <div style={{ minHeight: '100%' }}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 60%, #1a5c8c 100%)`,
        borderRadius: 16, padding: '48px 48px 56px',
        marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        {/* Geometric decoration */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 320, height: 320, borderRadius: '50%',
          border: '60px solid rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -80,
          width: 220, height: 220, borderRadius: '50%',
          border: '40px solid rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', left: '45%', top: 0, bottom: 0,
          width: 2, background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }} />

        <Row align="middle" gutter={[32, 24]}>
          <Col xs={24} md={16}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 }}>
              {today()}
            </Text>
            <Title level={1} style={{ color: WHITE, margin: '8px 0 4px', fontWeight: 700, fontSize: 36 }}>
              Bienvenido, {user?.firstName} 👋
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Gestiona tus eventos, clientes y servicios desde un solo lugar.
            </Text>
            <div style={{ marginTop: 28 }}>
              <Button
                type="primary"
                size="large"
                icon={<CalendarOutlined />}
                onClick={() => navigate('/eventos')}
                style={{
                  background: WHITE, color: NAVY, border: 'none',
                  borderRadius: 8, fontWeight: 600, marginRight: 12,
                  height: 44,
                }}
              >
                Ver Eventos
              </Button>
              <Button
                size="large"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/catalogos/clientes')}
                style={{
                  background: 'rgba(255,255,255,0.1)', color: WHITE,
                  border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 8,
                  fontWeight: 600, height: 44,
                }}
              >
                Ver Clientes
              </Button>
            </div>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '20px 28px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 4 }}>
                EVENTOS ACTIVOS
              </Text>
              <Title level={1} style={{ color: WHITE, margin: 0, fontSize: 56, fontWeight: 800, lineHeight: 1 }}>
                {activeEvents}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>en progreso o confirmados</Text>
            </div>
          </Col>
        </Row>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={12} md={6}>
          <StatCard icon={<CalendarOutlined />} value={events.length}  label="Total Eventos"   color={BLUE} />
        </Col>
        <Col xs={12} md={6}>
          <StatCard icon={<TeamOutlined />}     value={totalClients}   label="Clientes Activos" color="#10b981" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard icon={<FileTextOutlined />} value={totalOrders}    label="Órdenes Totales"  color="#f59e0b" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard icon={<DollarOutlined />}   value={activeEvents}   label="Eventos Activos"  color="#8b5cf6" />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* ── Upcoming events ──────────────────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <CalendarOutlined style={{ color: BLUE }} />
                <span style={{ color: NAVY, fontWeight: 600 }}>Próximos Eventos</span>
              </Space>
            }
            extra={
              <Button type="link" icon={<ArrowRightOutlined />} onClick={() => navigate('/eventos')}
                style={{ color: BLUE, fontWeight: 500, padding: 0 }}>
                Ver todos
              </Button>
            }
            styles={{ header: { borderBottom: '1px solid #f0f6ff' }, body: { padding: 0 } }}
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(26,58,92,0.08)' }}
          >
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                No hay eventos próximos
              </div>
            ) : (
              upcomingEvents.map((event: any, idx: number) => (
                <div
                  key={event.id}
                  onClick={() => navigate(`/eventos/${event.id}`)}
                  style={{
                    padding: '16px 24px',
                    borderBottom: idx < upcomingEvents.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = LIGHT)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Space direction="vertical" size={2}>
                    <Text strong style={{ color: NAVY, fontSize: 14 }}>{event.name}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                      {event.eventStart
                        ? new Date(event.eventStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : event.setupStart
                          ? new Date(event.setupStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      {(event.eventEnd ?? event.teardownEnd)
                        ? ` → ${new Date(event.eventEnd ?? event.teardownEnd).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : ''}
                    </Text>
                    {event.primaryClient && (
                      <Text style={{ color: '#64748b', fontSize: 11 }}>
                        {event.primaryClient.companyName || `${event.primaryClient.firstName ?? ''} ${event.primaryClient.lastName ?? ''}`.trim()}
                      </Text>
                    )}
                  </Space>
                  <Space>
                    <Tag color={STATUS_COLOR[event.status] ?? 'default'}>
                      {STATUS_LABEL[event.status] ?? event.status}
                    </Tag>
                    <ArrowRightOutlined style={{ color: '#cbd5e1', fontSize: 12 }} />
                  </Space>
                </div>
              ))
            )}
          </Card>
        </Col>

        {/* ── Quick access ─────────────────────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <AppstoreOutlined style={{ color: BLUE }} />
                <span style={{ color: NAVY, fontWeight: 600 }}>Acceso Rápido</span>
              </Space>
            }
            styles={{ header: { borderBottom: '1px solid #f0f6ff' }, body: { padding: 16 } }}
            style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(26,58,92,0.08)' }}
          >
            <Row gutter={[10, 10]}>
              <Col span={12}>
                <QuickCard icon={<TagsOutlined />}      label="Recursos"         path="/catalogos/recursos"       description="Catálogo de productos" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<TeamOutlined />}      label="Clientes"         path="/catalogos/clientes"       description="Gestión de expositores" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<DollarOutlined />}    label="Listas de Precio" path="/catalogos/listas-precio"  description="Precios y tarifas" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<ApartmentOutlined />} label="Departamentos"    path="/catalogos/departamentos"  description="Áreas operativas" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<BarChartOutlined />}  label="Contabilidad"     path="/dashboard/contabilidad"   description="Pagos y facturas" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<ToolOutlined />}      label="Operaciones"      path="/dashboard/operaciones"    description="Entregas pendientes" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<ContactsOutlined />}  label="CRM"              path="/crm"                      description="Seguimiento comercial" />
              </Col>
              <Col span={12}>
                <QuickCard icon={<UserOutlined />}      label="Usuarios"         path="/catalogos/usuarios"       description="Accesos y privilegios" />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
