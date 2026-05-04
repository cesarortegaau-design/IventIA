import { useState, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Avatar, Dropdown, Typography, Space, Badge, Drawer, Button, Grid, Input, Modal } from 'antd'
import {
  CalendarOutlined,
  AppstoreOutlined,
  TeamOutlined,
  TagsOutlined,
  ApartmentOutlined,
  UserOutlined,
  BarChartOutlined,
  LogoutOutlined,
  DollarOutlined,
  ToolOutlined,
  ContactsOutlined,
  HomeOutlined,
  MessageOutlined,
  FileTextOutlined,
  MenuOutlined,
  ScheduleOutlined,
  FileProtectOutlined,
  FileWordOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  SearchOutlined,
  BellOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { chatApi } from '../api/chat'
import { PRIVILEGES } from '@iventia/shared'
import { T } from '../styles/tokens'

const { Text } = Typography
const { useBreakpoint } = Grid

// Top-level area definitions
const TOP_AREAS = [
  { key: 'inicio',       icon: <HomeOutlined />,     label: 'Inicio' },
  { key: 'eventos',      icon: <CalendarOutlined />, label: 'Eventos' },
  { key: 'operaciones',  icon: <ToolOutlined />,     label: 'Operaciones' },
  { key: 'catalogos',    icon: <AppstoreOutlined />, label: 'Catálogos' },
  { key: 'analitica',    icon: <BarChartOutlined />, label: 'Analítica' },
  { key: 'crm',          icon: <ContactsOutlined />, label: 'CRM' },
]

interface SidebarItem {
  type?: 'section'
  key?: string
  label: string
  icon?: React.ReactNode
  route?: string
  count?: number
  dot?: string
  badge?: string
  privilege?: string
}

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth, hasPrivilege } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const hp = hasPrivilege

  const { data: unreadData } = useQuery({
    queryKey: ['chat', 'admin', 'unread'],
    queryFn:  chatApi.unreadCount,
    refetchInterval: 15000,
  })
  const unread = unreadData?.unread ?? 0

  // Determine active area from current route
  const activeArea = useMemo(() => {
    const p = location.pathname
    if (p.startsWith('/eventos') || p.startsWith('/booking-calendar') || p.startsWith('/contratos') || p.startsWith('/plantillas')) return 'eventos'
    if (p.startsWith('/reportes') || p.startsWith('/catalogos/ordenes-compra') || p.startsWith('/produccion') || p.startsWith('/almacen') || p.startsWith('/ordenes')) return 'operaciones'
    if (p.startsWith('/catalogos')) return 'catalogos'
    if (p.startsWith('/analisis') || p.startsWith('/dashboard')) return 'analitica'
    if (p.startsWith('/crm') || p.startsWith('/chat')) return 'crm'
    return 'inicio'
  }, [location.pathname])

  // Contextual sidebar items per area
  const sidebarConfig: Record<string, SidebarItem[]> = {
    inicio: [
      { type: 'section', label: 'Vista' },
      { key: '/', label: 'Resumen', icon: <HomeOutlined />, route: '/' },
      { type: 'section', label: 'Dashboards' },
      { key: '/dashboard/contabilidad', label: 'Contabilidad', icon: <DollarOutlined />, route: '/dashboard/contabilidad', privilege: PRIVILEGES.DASHBOARD_ACCOUNTING },
      { key: '/dashboard/operaciones', label: 'Operaciones', icon: <ToolOutlined />, route: '/dashboard/operaciones', privilege: PRIVILEGES.DASHBOARD_OPERATIONS },
    ],
    eventos: [
      { type: 'section', label: 'Vistas' },
      { key: '/eventos', label: 'Todos los eventos', icon: <CalendarOutlined />, route: '/eventos', privilege: PRIVILEGES.EVENT_VIEW },
      { key: '/booking-calendar', label: 'Calendario', icon: <ScheduleOutlined />, route: '/booking-calendar', privilege: PRIVILEGES.BOOKING_CALENDAR_VIEW },
      { type: 'section', label: 'Documentación' },
      { key: '/contratos', label: 'Contratos', icon: <FileProtectOutlined />, route: '/contratos', privilege: PRIVILEGES.CONTRACT_VIEW },
      { key: '/plantillas', label: 'Plantillas', icon: <FileWordOutlined />, route: '/plantillas', privilege: PRIVILEGES.TEMPLATE_VIEW },
    ],
    operaciones: [
      { type: 'section', label: 'Comercial' },
      { key: '/reportes/ordenes', label: 'Órdenes de Servicio', icon: <DollarOutlined />, route: '/reportes/ordenes', privilege: PRIVILEGES.REPORT_ORDERS },
      { key: '/catalogos/ordenes-compra', label: 'Órdenes de Compra', icon: <FileTextOutlined />, route: '/catalogos/ordenes-compra', privilege: PRIVILEGES.PURCHASE_ORDER_VIEW },
      { key: '/produccion', label: 'Producción y Costos', icon: <BarChartOutlined />, route: '/produccion', privilege: PRIVILEGES.PRODUCTION_VIEW },
      { type: 'section', label: 'Almacén' },
      { key: '/almacen/almacenes', label: 'Almacenes', icon: <ApartmentOutlined />, route: '/almacen/almacenes', privilege: PRIVILEGES.WAREHOUSE_VIEW },
      { key: '/almacen/inventario', label: 'Inventario', icon: <TagsOutlined />, route: '/almacen/inventario', privilege: PRIVILEGES.WAREHOUSE_VIEW },
      { key: '/almacen/recepcion', label: 'Recepción OC', icon: <FileTextOutlined />, route: '/almacen/recepcion', privilege: PRIVILEGES.WAREHOUSE_RECEIVE },
    ],
    catalogos: [
      { type: 'section', label: 'Productos y precios' },
      { key: '/catalogos/recursos', label: 'Recursos', icon: <TagsOutlined />, route: '/catalogos/recursos', privilege: PRIVILEGES.RESOURCE_VIEW },
      { key: '/catalogos/listas-precio', label: 'Listas de Precio', icon: <DollarOutlined />, route: '/catalogos/listas-precio', privilege: PRIVILEGES.PRICE_LIST_VIEW },
      { key: '/catalogos/listas-precios-proveedores', label: 'Listas Proveedores', icon: <DollarOutlined />, route: '/catalogos/listas-precios-proveedores', privilege: PRIVILEGES.SUPPLIER_PRICE_LIST_VIEW },
      { type: 'section', label: 'Personas' },
      { key: '/catalogos/clientes', label: 'Clientes', icon: <TeamOutlined />, route: '/catalogos/clientes', privilege: PRIVILEGES.CLIENT_VIEW },
      { key: '/catalogos/proveedores', label: 'Proveedores', icon: <ContactsOutlined />, route: '/catalogos/proveedores', privilege: PRIVILEGES.SUPPLIER_VIEW },
      { type: 'section', label: 'Estructura' },
      { key: '/catalogos/organizaciones', label: 'Organizaciones y Depts.', icon: <ApartmentOutlined />, route: '/catalogos/organizaciones', privilege: PRIVILEGES.ORGANIZATION_VIEW },
      { type: 'section', label: 'Accesos' },
      { key: '/catalogos/usuarios-perfiles', label: 'Usuarios y Perfiles', icon: <UserOutlined />, route: '/catalogos/usuarios-perfiles', privilege: PRIVILEGES.USER_VIEW },
    ],
    analitica: [
      { type: 'section', label: 'Inteligencia' },
      { key: '/analisis', label: 'Análisis IA', icon: <RobotOutlined />, route: '/analisis', badge: 'NEW' },
      { type: 'section', label: 'Dashboards' },
      { key: '/dashboard/contabilidad', label: 'Contabilidad', icon: <DollarOutlined />, route: '/dashboard/contabilidad', privilege: PRIVILEGES.DASHBOARD_ACCOUNTING },
      { key: '/dashboard/operaciones', label: 'Operaciones', icon: <ToolOutlined />, route: '/dashboard/operaciones', privilege: PRIVILEGES.DASHBOARD_OPERATIONS },
      { type: 'section', label: 'Reportes' },
      { key: '/reportes/ordenes', label: 'Reporte de Órdenes', icon: <FileTextOutlined />, route: '/reportes/ordenes', privilege: PRIVILEGES.REPORT_ORDERS },
    ],
    crm: [
      { type: 'section', label: 'Comercial' },
      { key: '/crm', label: 'CRM', icon: <ContactsOutlined />, route: '/crm', privilege: PRIVILEGES.CRM_VIEW },
      { type: 'section', label: 'Comunicación' },
      { key: '/chat', label: 'Colabora', icon: <MessageOutlined />, route: '/chat', privilege: PRIVILEGES.CHAT_VIEW },
    ],
  }

  // Filter sidebar items by privilege
  const sidebarItems = (sidebarConfig[activeArea] || []).filter(item => {
    if (item.type === 'section') return true
    if (!item.privilege) return true
    return hp(item.privilege)
  })

  // Check if a route is active (exact or prefix match for nested routes)
  const isRouteActive = (route?: string) => {
    if (!route) return false
    if (route === '/') return location.pathname === '/'
    return location.pathname === route || location.pathname.startsWith(route + '/')
  }

  const handleNavigate = (route: string) => {
    navigate(route)
    if (isMobile) setDrawerOpen(false)
  }

  // Navigate to the default route for each area
  const handleAreaClick = (areaKey: string) => {
    const defaults: Record<string, string> = {
      inicio: '/',
      eventos: '/eventos',
      operaciones: '/reportes/ordenes',
      catalogos: '/catalogos/recursos',
      analitica: '/analisis',
      crm: '/crm',
    }
    const target = defaults[areaKey]
    if (target && activeArea !== areaKey) {
      navigate(target)
    }
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      onClick: () => { clearAuth(); navigate('/login') },
    },
  ]

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`

  // ── Sidebar renderer (shared between desktop and mobile drawer) ──
  const renderSidebar = () => (
    <div style={{ padding: '14px 8px', overflowY: 'auto', flex: 1 }}>
      {sidebarItems.map((item, i) => {
        if (item.type === 'section') {
          return (
            <div key={`s-${i}`} style={{
              fontSize: 10, fontWeight: 600, color: T.textDim,
              letterSpacing: 1, textTransform: 'uppercase',
              padding: '12px 10px 6px',
            }}>
              {item.label}
            </div>
          )
        }
        const active = isRouteActive(item.route)
        return (
          <button
            key={item.key}
            onClick={() => item.route && handleNavigate(item.route)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '7px 10px',
              background: active ? T.light : 'transparent',
              border: 'none',
              borderLeft: active ? `3px solid ${T.blue}` : '3px solid transparent',
              borderRadius: 4,
              color: active ? T.navy : T.text,
              fontSize: 13, cursor: 'pointer', marginBottom: 1,
              fontWeight: active ? 600 : 400, textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ color: active ? T.blue : T.textMuted, display: 'flex', alignItems: 'center', fontSize: 14 }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 8,
                background: T.warning, color: 'white', fontWeight: 700,
              }}>
                {item.badge}
              </span>
            )}
            {item.key === '/chat' && unread > 0 && (
              <Badge count={unread} size="small" />
            )}
            {item.count !== undefined && (
              <span style={{ fontSize: 11, color: T.textDim, fontWeight: 500 }}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )

  // ── Top navigation bar ──
  const renderTopNav = () => (
    <header style={{
      height: 56, background: T.navy, color: 'white',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', flexShrink: 0, gap: 12,
      zIndex: 100,
    }}>
      {/* Mobile hamburger */}
      {isMobile && (
        <Button
          type="text"
          icon={<MenuOutlined style={{ color: 'white', fontSize: 18 }} />}
          onClick={() => setDrawerOpen(true)}
          style={{ padding: 4 }}
        />
      )}

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        paddingRight: 16, borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6, background: T.blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, color: 'white',
        }}>
          I
        </div>
        {!isMobile && <div style={{ fontWeight: 700, fontSize: 16 }}>IventIA</div>}
      </div>

      {/* Nav areas (desktop only) */}
      {!isMobile && (
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TOP_AREAS.map(a => {
            const isActive = activeArea === a.key
            return (
              <button
                key={a.key}
                onClick={() => handleAreaClick(a.key)}
                style={{
                  padding: '8px 14px',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: 'none', borderRadius: 6,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: 8, fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget.style.background = 'transparent')
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>{a.icon}</span>
                {a.label}
              </button>
            )
          })}
        </nav>
      )}

      {/* Spacer for mobile */}
      {isMobile && <div style={{ flex: 1 }} />}

      {/* Search */}
      {!isMobile && (
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, fontSize: 12,
            color: 'rgba(255,255,255,0.6)', width: 220,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <SearchOutlined style={{ fontSize: 12 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>Buscar…</span>
          <kbd style={{
            fontSize: 10, padding: '1px 5px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3, fontFamily: 'inherit',
            border: 'none', color: 'rgba(255,255,255,0.5)',
          }}>⌘K</kbd>
        </button>
      )}

      {/* Notifications bell */}
      <button style={{
        width: 32, height: 32, border: 'none',
        background: 'transparent', color: 'white',
        borderRadius: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Badge count={unread} size="small" offset={[0, 0]}>
          <BellOutlined style={{ fontSize: 16, color: 'white' }} />
        </Badge>
      </button>

      {/* User avatar */}
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: T.blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'white',
        }}>
          {initials}
        </div>
      </Dropdown>
    </header>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Top navigation */}
      {renderTopNav()}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={260}
          styles={{ body: { padding: 0, background: 'white' }, header: { display: 'none' } }}
        >
          {/* Area selector in drawer */}
          <div style={{ padding: '12px 8px', borderBottom: `1px solid ${T.border}` }}>
            {TOP_AREAS.map(a => {
              const isActive = activeArea === a.key
              return (
                <button
                  key={a.key}
                  onClick={() => handleAreaClick(a.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 12px',
                    background: isActive ? T.light : 'transparent',
                    border: 'none', borderRadius: 6,
                    color: isActive ? T.navy : T.text,
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ color: isActive ? T.blue : T.textMuted, display: 'flex', alignItems: 'center' }}>{a.icon}</span>
                  {a.label}
                </button>
              )
            })}
          </div>
          {renderSidebar()}
        </Drawer>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Desktop contextual sidebar */}
        {!isMobile && (
          <aside style={{
            width: 224, background: 'white',
            borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column',
            flexShrink: 0, overflowY: 'auto',
          }}>
            {renderSidebar()}
          </aside>
        )}

        {/* Main content */}
        <main style={{
          flex: 1, background: T.bg,
          padding: isMobile ? 8 : 24,
          overflowY: 'auto',
          minHeight: 'calc(100vh - 56px)',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Search modal (⌘K) */}
      <Modal
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        closable={false}
        width={600}
        styles={{ body: { padding: 0 } }}
      >
        <Input
          placeholder="Buscar eventos, clientes, recursos…"
          prefix={<SearchOutlined style={{ color: T.textMuted }} />}
          size="large"
          autoFocus
          style={{ borderRadius: 0, border: 'none', borderBottom: `1px solid ${T.border}` }}
          onPressEnter={() => setSearchOpen(false)}
        />
        <div style={{ padding: '16px 20px', color: T.textMuted, fontSize: 13 }}>
          <p style={{ margin: '0 0 8px' }}>Sugerencias rápidas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => { navigate('/eventos'); setSearchOpen(false) }}
              style={{ textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: T.text, fontSize: 13, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = T.light}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <CalendarOutlined style={{ marginRight: 8, color: T.blue }} /> Ir a Eventos
            </button>
            <button
              onClick={() => { navigate('/catalogos/clientes'); setSearchOpen(false) }}
              style={{ textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: T.text, fontSize: 13, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = T.light}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <TeamOutlined style={{ marginRight: 8, color: T.blue }} /> Ir a Clientes
            </button>
            <button
              onClick={() => { navigate('/reportes/ordenes'); setSearchOpen(false) }}
              style={{ textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: T.text, fontSize: 13, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = T.light}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <DollarOutlined style={{ marginRight: 8, color: T.blue }} /> Ir a Órdenes de Servicio
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
