import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Empty, Spin } from 'antd'
import { ordersApi } from '../api/orders'

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: ordersApi.list,
  })

  const columns = [
    { title: 'Orden #', dataIndex: 'orderNumber' },
    { title: 'Total', dataIndex: 'total', render: (v) => `$${Number(v).toFixed(2)}` },
    { title: 'Pagado', dataIndex: 'paidAmount', render: (v) => `$${Number(v).toFixed(2)}` },
    {
      title: 'Estado',
      dataIndex: 'status',
      render: (v) => <Tag color={v === 'PAID' ? 'green' : 'orange'}>{v}</Tag>,
    },
    { title: 'Fecha', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleDateString() },
  ]

  return (
    <div>
      <h2>Mis Órdenes</h2>

      <Spin spinning={isLoading}>
        {data?.orders?.length === 0 ? (
          <Empty description="No tienes órdenes aún" />
        ) : (
          <Table columns={columns} dataSource={data?.orders ?? []} rowKey="id" pagination={false} />
        )}
      </Spin>
    </div>
  )
}
