import { useQuery } from '@tanstack/react-query'
import { Row, Col, Typography, Spin, Tag } from 'antd'
import {
  ShoppingOutlined, FileTextOutlined, ShopOutlined, RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { authApi } from '../../api/auth'
import { purchaseOrdersApi } from '../../api/purchaseOrders'
import { documentsApi } from '../../api/documents'
import { chatApi } from '../../api/chat'
import { useAuthStore } from '../../stores/authStore'

const { Title, Text } = Typography

const PRIMARY   = '#0369a1'
const DARK      = '#0c4a6e'
const DARK_MID  = '#0369a1'

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default', CONFIRMED: 'blue', PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green', INVOICED: 'purple', CANCELLED: 'red',
}
const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmada', PARTIALLY_RECEIVED: 'Recibida Parcialmente',
  RECEIVED: 'Recibida', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}

export default function DashboardPage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const { data: meData }    = useQuery({ queryKey: ['supplier-me'], queryFn: authApi.me })
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['supplier-orders'],
    queryFn:  purchaseOrdersApi.list,
  })
  const { data: docs = [] }     = useQuery({ queryKey: ['supplier-docs'], queryFn: documentsApi.list })
  const { data: unreadData }    = useQuery({ queryKey: ['supplier-chat', 'unread'], queryFn: chatApi.unreadCount })

  const me         = meData?.data?.data ?? meData?.data
  const supplierName = me?.suppliers?.[0]?.name ?? me?.supplier?.name ?? null
  const unread     = unreadData?.unread ?? 0
  const recentOrders = (orders as any[]).slice(0, 3)

  return (
    <div style={{ padding: 0 }}>
      {/* Hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_MID} 100%)`,
        padding: '32px 24px 40px',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        {/* Dot pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }} />
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(2,132,199,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)', borderRadius: 20,
            padding: '3px 12px', marginBottom: 12,
          }}>
            <ShopOutlined style={{ color: '#bae6fd', fontSize: 12 }} />
            <Text style={{ color: '#bae6fd', fontSize: 12, fontWeight: 500 }}>Portal de Proveedores</Text>
          </div>
          <Title level={3} style={{ color: '#fff', margin: 0, marginBottom: 4 }}>
            Bienvenido, {user?.firstName}
          </Title>
          {supplierName && (
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{supplierName}</Text>
          )}
        </div>
      </div>

      {/* Stats row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <div
            onClick={() => navigate('/orders')}
            style={{
              background: '#fff', borderRadius: 12, padding: '18px 20px',
              border: '1px solid #E5E7EB', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: `linear-gradient(135deg, ${PRIMARY}, #0284c7)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#111', display: 'block', lineHeight: 1.2 }}>
                {loadingOrders ? '…' : (orders as any[]).length}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Órdenes de Compra</Text>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={8}>
          <div
            onClick={() => navigate('/documents')}
            style={{
              background: '#fff', borderRadius: 12, padding: '18px 20px',
              border: '1px solid #E5E7EB', cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#111', display: 'block', lineHeight: 1.2 }}>
                {(docs as any[]).length}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Documentos</Text>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={8}>
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: '18px 20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <UnorderedListOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <Text style={{ fontSize: 24, fontWeight: 700, color: '#111', display: 'block', lineHeight: 1.2 }}>
                {unread}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Mensajes sin leer</Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* Recent orders */}
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #E5E7EB',
          background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${PRIMARY}, #0284c7)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <Text strong style={{ fontSize: 15 }}>Órdenes Recientes</Text>
          </div>
          <span
            onClick={() => navigate('/orders')}
            style={{ color: PRIMARY, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Ver todas <RightOutlined style={{ fontSize: 11 }} />
          </span>
        </div>
        <div style={{ padding: 16 }}>
          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : recentOrders.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>
              Aún no tienes órdenes de compra
            </Text>
          ) : (
            recentOrders.map((order: any) => (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  marginBottom: 6, border: '1px solid #F3F4F6',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <div>
                  <Text strong style={{ fontSize: 14 }}>{order.orderNumber ?? order.poNumber ?? `OC-${order.id.slice(-6).toUpperCase()}`}</Text>
                  <div style={{ marginTop: 2 }}>
                    <Tag color={PO_STATUS_COLORS[order.status]} style={{ fontSize: 11, marginRight: 0 }}>
                      {PO_STATUS_LABELS[order.status] ?? order.status}
                    </Tag>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: PRIMARY }}>
                    ${Number(order.total ?? order.totalAmount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {order.requiredDate ? dayjs(order.requiredDate).format('DD/MM/YYYY') : dayjs(order.createdAt).format('DD/MM/YYYY')}
                  </Text>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
