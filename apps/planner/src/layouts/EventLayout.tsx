import { useState } from 'react'
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Badge, Button, Dropdown, Spin, Tooltip, Typography } from 'antd'
import {
  ArrowLeftOutlined, AppstoreOutlined, CalendarOutlined, CheckSquareOutlined,
  DollarOutlined, TeamOutlined, ApartmentOutlined, GlobalOutlined,
  BgColorsOutlined, MessageOutlined, LogoutOutlined, SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { eventsApi } from '../api/events'

const { Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: '#F97316',
  CONFIRMED: '#7C3AED',
  IN_EXECUTION: '#0D9488',
  CLOSED: '#6B7280',
  CANCELLED: '#DC2626',
}

const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizado',
  CONFIRMED: 'Confirmado',
  IN_EXECUTION: 'En ejecución',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

export default function EventLayout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['planner-event-header', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  })
  const event = data?.data

  const NAV = [
    {
      group: 'PRINCIPAL',
      items: [
        { key: 'lienzo', label: 'Lienzo del evento', icon: <AppstoreOutlined /> },
        { key: 'timeline', label: 'Timeline', icon: <CalendarOutlined /> },
        { key: 'tareas', label: 'Tareas', icon: <CheckSquareOutlined /> },
        { key: 'presupuesto', label: 'Presupuesto', icon: <DollarOutlined /> },
        { key: 'contratos', label: 'Contratos y pagos', icon: <FileTextOutlined /> },
      ],
    },
    {
      group: 'RELACIONES',
      items: [
        { key: 'crm', label: 'CRM · Clientes y proveedores', icon: <TeamOutlined /> },
        { key: 'mapa', label: 'Mapa del evento', icon: <ApartmentOutlined /> },
        { key: 'portal', label: 'Portal del cliente', icon: <GlobalOutlined />, badge: 'NEW' },
      ],
    },
    {
      group: 'EXTRAS',
      items: [
        { key: 'estudio', label: 'Estudio · Arte e IA', icon: <BgColorsOutlined />, badge: 'NEW' },
        { key: 'mensajes', label: 'Mensajes', icon: <MessageOutlined /> },
      ],
    },
  ]

  const activeKey = location.pathname.split('/').pop() || 'lienzo'

  const userMenu = {
    items: [
      {
        key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true,
        onClick: () => { clearAuth(); navigate('/login') },
      },
    ],
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: '#1E1040',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
      }}>
        {/* App logo + back */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Tooltip title="Volver a eventos">
            <Button type="text" icon={<ArrowLeftOutlined />} size="small"
              onClick={() => navigate('/eventos')}
              style={{ color: '#C4B5FD', padding: '0 4px', height: 28 }} />
          </Tooltip>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>P</div>
          <div>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>IventIA</div>
            <div style={{ color: '#C4B5FD', fontSize: 10, fontWeight: 500 }}>PLANNER · GT</div>
          </div>
        </div>

        {/* Event name */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          cursor: 'pointer',
        }}>
          {isLoading ? (
            <Spin size="small" />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={32} style={{
                  background: `linear-gradient(135deg, ${STATUS_COLORS[event?.status] || '#7C3AED'}, #EC4899)`,
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {event?.name?.[0]}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, display: 'block' }}
                    ellipsis={{ tooltip: event?.name }}>
                    {event?.name || '—'}
                  </Text>
                  <Text style={{ color: '#C4B5FD', fontSize: 10 }}>
                    {event?.daysUntil != null
                      ? `${event.daysUntil} días · ${event?.venueLocation || ''}`
                      : event?.venueLocation || STATUS_LABELS[event?.status] || ''}
                  </Text>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
          {NAV.map((group) => (
            <div key={group.group} style={{ marginBottom: 8 }}>
              <div style={{ color: 'rgba(196,181,253,0.5)', fontSize: 10, fontWeight: 600,
                padding: '6px 8px 4px', letterSpacing: '0.08em' }}>
                {group.group}
              </div>
              {group.items.map((item) => {
                const isActive = activeKey === item.key
                return (
                  <div key={item.key}
                    onClick={() => navigate(`/eventos/${id}/${item.key}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                      cursor: 'pointer',
                      background: isActive ? '#7C3AED' : 'transparent',
                      color: isActive ? '#fff' : '#C4B5FD',
                      fontWeight: isActive ? 600 : 400, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#2D1B69' }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        background: typeof item.badge === 'number' ? '#EC4899' : '#0D9488',
                        color: '#fff', borderRadius: 20, padding: '1px 6px',
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>{item.badge}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px' }}>
          <Dropdown menu={userMenu} placement="topLeft">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size={30} style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ color: '#C4B5FD', fontSize: 10 }}>Event Designer</div>
              </div>
              <SettingOutlined style={{ color: '#C4B5FD', fontSize: 12, flexShrink: 0 }} />
            </div>
          </Dropdown>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet context={{ event }} />
      </div>
    </div>
  )
}
