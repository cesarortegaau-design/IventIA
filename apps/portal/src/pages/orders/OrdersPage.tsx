import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Typography, Button, Empty, Spin, Space } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'
import { exportToCsv } from '../../utils/exportCsv'

const { Title } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', EXECUTED: 'geekblue', INVOICED: 'cyan', CANCELLED: 'red', CREDIT_NOTE: 'gold',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada', INVOICED: 'Facturada', CANCELLED: 'Cancelada', CREDIT_NOTE: 'Nota de Crédito',
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['portal-orders'],
    queryFn: () => ordersApi.list(),
  })

  const orders = data?.data?.data ?? []

  const columns = [
    {
      title: 'Número', dataIndex: 'orderNumber', render: (v: string, r: any) => (
        <Button type="link" onClick={() => navigate(`/orders/${r.id}`)}>{v}</Button>
      ),
    },
    {
      title: 'Evento', key: 'event',
      render: (_: any, r: any) => r.event?.name ?? '—',
    },
    {
      title: 'Estado', dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag>,
    },
    {
      title: 'Total', dataIndex: 'total',
      render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Fecha', dataIndex: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Ítems', key: 'items',
      render: (_: any, r: any) => r.lineItems?.length ?? 0,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Mis Solicitudes</Title>
        {orders.length > 0 && (
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('mis-solicitudes', orders.map((o: any) => ({
              numero: o.orderNumber,
              evento: o.event?.name ?? '',
              estado: STATUS_LABELS[o.status] ?? o.status,
              total: Number(o.total).toFixed(2),
              fecha: dayjs(o.createdAt).format('DD/MM/YYYY'),
            })), [
              { header: 'Número', key: 'numero' },
              { header: 'Evento', key: 'evento' },
              { header: 'Estado', key: 'estado' },
              { header: 'Total', key: 'total' },
              { header: 'Fecha', key: 'fecha' },
            ])}
          >
            Exportar CSV
          </Button>
        )}
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : orders.length === 0 ? (
        <Empty description="Aún no tienes solicitudes" />
      ) : (
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </div>
  )
}
