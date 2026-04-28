import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Badge, Drawer, Button, Grid } from 'antd'
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
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { chatApi } from '../api/chat'
import { PRIVILEGES } from '@iventia/shared'

const { Sider, Header, Content } = Layout
const { Text } = Typography
const { useBreakpoint } = Grid

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth, hasPrivilege } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.lg
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hp = hasPrivilege

  const { data: unreadData } = useQuery({
    queryKey: ['chat', 'admin', 'unread'],
    queryFn:  chatApi.unreadCount,
    refetchInterval: 15000,
  })
  const unread = unreadData?.unread ?? 0

  // Build menu with privilege checks
  const allItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Inicio', show: true },
    { key: '/eventos', icon: <CalendarOutlined />, label: 'Eventos', show: hp(PRIVILEGES.EVENT_VIEW) },
    { key: '/booking-calendar', icon: <ScheduleOutlined />, label: 'Calendario de Reservas', show: hp(PRIVILEGES.BOOKING_CALENDAR_VIEW) },
    { key: '/contratos', icon: <FileProtectOutlined />, label: 'Contratos', show: hp(PRIVILEGES.CONTRACT_VIEW) },
    { key: '/plantillas', icon: <FileWordOutlined />, label: 'Plantillas', show: hp(PRIVILEGES.TEMPLATE_VIEW) },
    {
      key: 'catalogos', icon: <AppstoreOutlined />, label: 'Catálogos',
      children: [
        { key: '/catalogos/recursos', icon: <TagsOutlined />, label: 'Recursos', show: hp(PRIVILEGES.RESOURCE_VIEW) },
        { key: '/catalogos/listas-precio', icon: <DollarOutlined />, label: 'Listas de Precio', show: hp(PRIVILEGES.PRICE_LIST_VIEW) },
        { key: '/catalogos/clientes', icon: <TeamOutlined />, label: 'Clientes', show: hp(PRIVILEGES.CLIENT_VIEW) },
        { key: '/catalogos/proveedores', icon: <ContactsOutlined />, label: 'Proveedores', show: hp(PRIVILEGES.SUPPLIER_VIEW) },
        { key: '/catalogos/listas-precios-proveedores', icon: <DollarOutlined />, label: 'Listas de Precios Prov.', show: hp(PRIVILEGES.SUPPLIER_PRICE_LIST_VIEW) },
        { key: '/catalogos/organizaciones', icon: <ApartmentOutlined />, label: 'Organizaciones', show: hp(PRIVILEGES.ORGANIZATION_VIEW) },
        { key: '/catalogos/departamentos', icon: <ApartmentOutlined />, label: 'Departamentos', show: hp(PRIVILEGES.DEPARTMENT_VIEW) },
        { key: '/catalogos/perfiles', icon: <SafetyCertificateOutlined />, label: 'Perfiles', show: hp(PRIVILEGES.PROFILE_VIEW) },
        { key: '/catalogos/usuarios', icon: <UserOutlined />, label: 'Usuarios', show: hp(PRIVILEGES.USER_VIEW) },
        { key: '/catalogos/usuarios-portal', icon: <TeamOutlined />, label: 'Usuarios Portal', show: hp(PRIVILEGES.PORTAL_USER_VIEW) },
      ],
    },
    { key: '/reportes/ordenes', icon: <DollarOutlined />, label: 'Órdenes de Servicio', show: hp(PRIVILEGES.REPORT_ORDERS) },
    { key: '/catalogos/ordenes-compra', icon: <FileTextOutlined />, label: 'Órdenes de Compra', show: hp(PRIVILEGES.PURCHASE_ORDER_VIEW) },
    {
      key: 'almacen', icon: <ToolOutlined />, label: 'Almacén',
      children: [
        { key: '/almacen/almacenes', icon: <AppstoreOutlined />, label: 'Almacenes', show: hp(PRIVILEGES.WAREHOUSE_VIEW) },
        { key: '/almacen/inventario', icon: <TagsOutlined />, label: 'Inventario', show: hp(PRIVILEGES.WAREHOUSE_VIEW) },
        { key: '/almacen/recepcion', icon: <FileTextOutlined />, label: 'Recepción OC', show: hp(PRIVILEGES.WAREHOUSE_RECEIVE) },
      ],
    },
    { key: '/produccion', icon: <BarChartOutlined />, label: 'Producción y Costos', show: hp(PRIVILEGES.PRODUCTION_VIEW) },
    { key: '/analisis', icon: <RobotOutlined />, label: 'Análisis IA', show: true },
    { key: '/crm', icon: <ContactsOutlined />, label: 'CRM', show: hp(PRIVILEGES.CRM_VIEW) },
    { key: '/chat', icon: <MessageOutlined />, label: 'Colabora', show: hp(PRIVILEGES.CHAT_VIEW) },
    {
      key: 'dashboards', icon: <BarChartOutlined />, label: 'Dashboards',
      children: [
        { key: '/dashboard/contabilidad', icon: <DollarOutlined />, label: 'Contabilidad', show: hp(PRIVILEGES.DASHBOARD_ACCOUNTING) },
        { key: '/dashboard/operaciones', icon: <ToolOutlined />, label: 'Operaciones', show: hp(PRIVILEGES.DASHBOARD_OPERATIONS) },
      ],
    },
  ]

  // Filter menu items by privilege
  function filterItems(items: any[]): any[] {
    return items
      .map(item => {
        if (item.children) {
          const filtered = item.children.filter((c: any) => c.show !== false)
          if (filtered.length === 0) return null
          return { ...item, children: filtered }
        }
        return item.show !== false ? item : null
      })
      .filter(Boolean)
  }

  const menuItems = filterItems(allItems)

  const enrichedMenuItems = menuItems.map((item: any) =>
    item.key === '/chat'
      ? { ...item, label: <Badge count={unread} size="small" offset={[8, 0]}><span style={{ color: 'rgba(255,255,255,0.85)' }}>{item.label}</span></Badge> }
      : item
  )

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      onClick: () => { clearAuth(); navigate('/login') },
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  const siderMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      defaultOpenKeys={['catalogos', 'dashboards', 'almacen']}
      items={enrichedMenuItems}
      onClick={handleMenuClick}
      style={{ background: 'transparent', border: 'none', marginTop: 8 }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop fixed sider */}
      {!isMobile && (
        <Sider
          width={240}
          style={{ background: '#1a0533', position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100, overflow: 'auto' }}
          collapsible
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>IventIA</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 12 }}>Core</Text>
          </div>
          {siderMenu}
        </Sider>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={260}
          styles={{ body: { padding: 0, background: '#1a0533' }, header: { display: 'none' } }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>IventIA</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 12 }}>Core</Text>
          </div>
          {siderMenu}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : 240 }}>
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setDrawerOpen(true)}
              />
            )}
            {isMobile && (
              <Text style={{ fontWeight: 700, fontSize: 16, color: '#1a0533' }}>IventIA</Text>
            )}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#6B46C1' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              {!isMobile && <Text>{user?.firstName} {user?.lastName}</Text>}
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: isMobile ? 8 : 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
