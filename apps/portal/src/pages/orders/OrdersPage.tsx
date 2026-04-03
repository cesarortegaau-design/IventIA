import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Typography, Button, Empty, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { ordersApi } from '../../api/orders'

const { Title } = Typography

const STATUS_COLORS: Record<string, string> = {
  QUOTED: 'blue', CONFIRMED: 'green', IN_PAYMENT: 'orange', PAID: 'purple', INVOICED: 'cyan', CANCELLED: 'red',
}
const STATUS_LABELS: Record<string, string> = {
  QUOTED: 'Cotizada', CONFIRMED: 'Confirmada', IN_PAYMENT: 'En Pago', PAID: 'Pagada', INVOICED: 'Facturada', CANCELLED: 'Cancelada',
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
      <Title level={4} style={{ marginBottom: 24 }}>Mis Solicitudes</Title>
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
        />
      )}
    </div>
  )
}
