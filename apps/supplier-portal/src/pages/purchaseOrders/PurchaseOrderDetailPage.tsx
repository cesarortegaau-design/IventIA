import { useQuery } from '@tanstack/react-query'
import { Typography, Tag, Spin, Table, Timeline, Button } from 'antd'
import {
  ShoppingOutlined, FileTextOutlined, HistoryOutlined,
  DownloadOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
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

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      marginBottom: 16, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #E5E7EB', background: '#F3F4F6',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${PRIMARY}, #0284c7)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 16 }}>{icon}</span>
        </div>
        <Text strong style={{ fontSize: 15 }}>{title}</Text>
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

export default function PurchaseOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate    = useNavigate()

  const { data: order, isLoading } = useQuery({
    queryKey: ['supplier-order', orderId],
    queryFn:  () => purchaseOrdersApi.get(orderId!),
    enabled:  !!orderId,
  })

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  if (!order)    return <div style={{ textAlign: 'center', padding: 60 }}><Text type="secondary">Orden no encontrada</Text></div>

  const poNumber = order.orderNumber ?? order.poNumber ?? `OC-${order.id?.slice(-6).toUpperCase()}`
  const lineItems: any[] = order.lineItems ?? order.items ?? []
  const documents: any[] = order.documents ?? []
  const history: any[]   = order.statusHistory ?? order.history ?? []

  const lineItemColumns = [
    {
      title: 'Producto / Servicio',
      key: 'resource',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.resource?.name ?? r.productName ?? r.name ?? '—'}</Text>
          {(r.resource?.sku ?? r.sku) && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              SKU: {r.resource?.sku ?? r.sku}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      render: (v: number) => Number(v).toLocaleString('es-MX'),
      align: 'right' as const,
    },
    {
      title: 'Precio Unitario',
      key: 'unitPrice',
      render: (_: any, r: any) => {
        const price = r.unitPrice ?? r.price ?? 0
        return `$${Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      },
      align: 'right' as const,
    },
    {
      title: 'Total',
      key: 'total',
      render: (_: any, r: any) => {
        const total = r.total ?? r.subtotal ?? (Number(r.quantity ?? 0) * Number(r.unitPrice ?? r.price ?? 0))
        return (
          <Text strong style={{ color: PRIMARY }}>
            ${Number(total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Text>
        )
      },
      align: 'right' as const,
    },
  ]

  return (
    <div>
      {/* Back button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 12, color: PRIMARY }}
      >
        Volver a Órdenes
      </Button>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>{poNumber}</Title>
            <Tag color={STATUS_COLORS[order.status]} style={{ fontSize: 13, padding: '2px 10px' }}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Tag>
          </div>
          {order.requiredDate && (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, display: 'block' }}>
              Entrega requerida: {dayjs(order.requiredDate).format('DD/MM/YYYY')}
            </Text>
          )}
          {order.supplier?.name && (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'block' }}>
              Proveedor: {order.supplier.name}
            </Text>
          )}
        </div>
      </div>

      {/* Line Items */}
      <SectionCard icon={<ShoppingOutlined />} title="Partidas de la Orden">
        {lineItems.length === 0 ? (
          <Text type="secondary">Sin partidas registradas</Text>
        ) : (
          <>
            <Table
              dataSource={lineItems}
              columns={lineItemColumns}
              rowKey={(r) => r.id ?? r.resourceId ?? Math.random().toString()}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <div style={{
                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                padding: '8px 20px', display: 'flex', gap: 16, alignItems: 'center',
              }}>
                <Text style={{ color: '#6B7280' }}>Total de la Orden:</Text>
                <Text strong style={{ fontSize: 18, color: PRIMARY }}>
                  ${Number(order.total ?? order.totalAmount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Text>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Documents */}
      {documents.length > 0 && (
        <SectionCard icon={<FileTextOutlined />} title="Documentos Adjuntos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map((doc: any) => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#f8fafc', borderRadius: 8,
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileTextOutlined style={{ color: PRIMARY, fontSize: 18 }} />
                  <div>
                    <Text strong style={{ fontSize: 14 }}>{doc.name ?? doc.fileName ?? 'Documento'}</Text>
                    {doc.createdAt && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {dayjs(doc.createdAt).format('DD/MM/YYYY')}
                      </Text>
                    )}
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(doc.blobKey ?? doc.fileUrl ?? doc.url, '_blank')}
                  style={{ color: PRIMARY }}
                >
                  Descargar
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Status History */}
      {history.length > 0 && (
        <SectionCard icon={<HistoryOutlined />} title="Historial de Estatus">
          <Timeline
            items={history.map((h: any) => ({
              color: 'blue',
              children: (
                <div>
                  <Tag color={STATUS_COLORS[h.status ?? h.toStatus] ?? 'blue'}>
                    {STATUS_LABELS[h.status ?? h.toStatus] ?? h.status ?? h.toStatus}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    {dayjs(h.createdAt ?? h.changedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                  {h.note && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                      {h.note}
                    </Text>
                  )}
                </div>
              ),
            }))}
          />
        </SectionCard>
      )}
    </div>
  )
}
