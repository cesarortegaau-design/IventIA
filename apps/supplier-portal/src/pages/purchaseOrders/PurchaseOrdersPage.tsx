import { useQuery } from '@tanstack/react-query'
import { Typography, Tag, Spin, Empty, Row, Col } from 'antd'
import {
  ShoppingOutlined, CalendarOutlined, RightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { purchaseOrdersApi } from '../../api/purchaseOrders'

const { Text, Title } = Typography

const PRIMARY  = '#0369a1'
const DARK     = '#0c4a6e'
const DARK_MID = '#0369a1'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default', CONFIRMED: 'blue', PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green', INVOICED: 'purple', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmada', PARTIALLY_RECEIVED: 'Recibida Parcialmente',
  RECEIVED: 'Recibida', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['supplier-orders'],
    queryFn:  purchaseOrdersApi.list,
  })

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_MID} 100%)`,
        padding: '28px 24px 36px',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 180, height: 180,
          background: 'radial-gradient(circle, rgba(2,132,199,0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)', borderRadius: 20,
            padding: '3px 12px', marginBottom: 10,
          }}>
            <ShoppingOutlined style={{ color: '#bae6fd', fontSize: 12 }} />
            <Text style={{ color: '#bae6fd', fontSize: 12, fontWeight: 500 }}>Compras</Text>
          </div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>Órdenes de Compra</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Órdenes generadas por IventIA para tu empresa
          </Text>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : (orders as any[]).length === 0 ? (
        <Empty description="Aún no tienes órdenes de compra asignadas" style={{ padding: 48 }} />
      ) : (
        <Row gutter={[12, 12]}>
          {(orders as any[]).map((order: any) => {
            const poNumber = order.orderNumber ?? order.poNumber ?? `OC-${order.id.slice(-6).toUpperCase()}`
            const total    = Number(order.total ?? order.totalAmount ?? 0)
            const reqDate  = order.requiredDate ?? order.deliveryDate ?? null
            const suppName = order.supplier?.name ?? order.supplierName ?? null

            return (
              <Col xs={24} sm={12} lg={8} key={order.id}>
                <div
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{
                    background: '#fff', borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    padding: 18, cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(3,105,161,0.15)'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 15, color: PRIMARY }}>{poNumber}</Text>
                    <Tag color={STATUS_COLORS[order.status]} style={{ marginRight: 0 }}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Tag>
                  </div>

                  {suppName && (
                    <Text style={{ color: '#6B7280', fontSize: 13, display: 'block', marginBottom: 8 }}>
                      {suppName}
                    </Text>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
                      ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Text>
                    {reqDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarOutlined style={{ color: '#6B7280', fontSize: 12 }} />
                        <Text style={{ color: '#6B7280', fontSize: 12 }}>
                          {dayjs(reqDate).format('DD/MM/YYYY')}
                        </Text>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <span style={{ color: PRIMARY, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Ver detalle <RightOutlined style={{ fontSize: 10 }} />
                    </span>
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}
