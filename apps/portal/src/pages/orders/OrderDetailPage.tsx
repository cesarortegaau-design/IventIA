import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Table, Typography, Button, Space, Divider, Timeline, Skeleton
} from 'antd'
import { ArrowLeftOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_PAYMENT: 'orange', PAID: 'purple', INVOICED: 'cyan', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_PAYMENT: 'En Pago', PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['portal-order', orderId],
    queryFn: () => ordersApi.get(orderId!),
  })

  const order = data?.data?.data

  if (isLoading) return <Skeleton active />
  if (!order) return null

  const lineColumns = [
    { title: 'Recurso', dataIndex: 'description' },
    { title: 'Tipo', render: (_: any, r: any) => r.resource?.type ?? '—' },
    { title: 'Precio unit.', dataIndex: 'unitPrice', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Cant.', dataIndex: 'quantity', render: (v: number) => Number(v) },
    { title: 'Total', dataIndex: 'lineTotal', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
  ]

  const timelineItems = (order.statusHistory ?? []).map((h: any) => ({
    color: STATUS_COLORS[h.toStatus] ?? 'gray',
    children: (
      <div>
        <Tag color={STATUS_COLORS[h.toStatus]}>{STATUS_LABELS[h.toStatus]}</Tag>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
        {h.notes && <div><Text type="secondary" style={{ fontSize: 12 }}>{h.notes}</Text></div>}
      </div>
    ),
  }))

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>Mis Solicitudes</Button>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{order.orderNumber}</Title>
          <Tag color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Tag>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Evento">{order.event?.name}</Descriptions.Item>
          <Descriptions.Item label="Fecha">{dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Subtotal">${Number(order.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Descriptions.Item>
          <Descriptions.Item label="IVA (16%)">${Number(order.taxAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Descriptions.Item>
          <Descriptions.Item label="Total" span={2}>
            <Text strong style={{ fontSize: 16 }}>${Number(order.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </Descriptions.Item>
          {order.notes && <Descriptions.Item label="Notas" span={2}>{order.notes}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Card
        title="Productos y servicios solicitados"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => exportToCsv(`solicitud-${order.orderNumber}`, (order.lineItems ?? []).map((li: any) => ({
              recurso: li.description,
              tipo: li.resource?.type ?? '',
              precioUnit: Number(li.unitPrice).toFixed(2),
              cantidad: Number(li.quantity),
              total: Number(li.lineTotal).toFixed(2),
            })), [
              { header: 'Recurso', key: 'recurso' },
              { header: 'Tipo', key: 'tipo' },
              { header: 'Precio Unit.', key: 'precioUnit' },
              { header: 'Cantidad', key: 'cantidad' },
              { header: 'Total', key: 'total' },
            ])}
          >
            Exportar CSV
          </Button>
        }
      >
        <Table
          dataSource={order.lineItems ?? []}
          columns={lineColumns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {(order.documents ?? []).length > 0 && (
        <Card title="Documentos" style={{ marginBottom: 16 }}>
          {order.documents.map((doc: any) => (
            <Space key={doc.id} style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <FileOutlined />
                <Text>{doc.fileName}</Text>
                <Tag>{doc.documentType}</Tag>
              </Space>
              {doc.blobKey && (
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  href={doc.blobKey}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Descargar
                </Button>
              )}
            </Space>
          ))}
        </Card>
      )}

      {timelineItems.length > 0 && (
        <Card title="Historial de estados">
          <Timeline items={timelineItems} />
        </Card>
      )}
    </div>
  )
}
