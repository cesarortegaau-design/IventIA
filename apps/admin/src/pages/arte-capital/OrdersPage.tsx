import { useQuery } from '@tanstack/react-query'
import { Table, Tag } from 'antd'
import { arteCapitalApi } from '../../api/arte-capital'

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['arte-capital-orders'],
    queryFn: () => arteCapitalApi.orders.list(),
  })

  const columns = [
    { title: 'Orden #', dataIndex: 'orderNumber' },
    { title: 'Cliente', dataIndex: ['user', 'firstName'], render: (_, r) => `${r.user?.firstName} ${r.user?.lastName}` },
    { title: 'Total', dataIndex: 'total', render: (v) => `$${Number(v).toFixed(2)}` },
    { title: 'Pagado', dataIndex: 'paidAmount', render: (v) => `$${Number(v).toFixed(2)}` },
    { title: 'Estado', dataIndex: 'status', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Fecha', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleDateString() },
  ]

  return (
    <div>
      <h2>Órdenes</h2>
      <Table columns={columns} dataSource={data?.orders ?? []} loading={isLoading} rowKey="id" pagination={false} />
    </div>
  )
}
