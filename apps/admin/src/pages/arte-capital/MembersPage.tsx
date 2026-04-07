import { useQuery } from '@tanstack/react-query'
import { Table, Tag } from 'antd'
import { arteCapitalApi } from '../../api/arte-capital'

export default function MembersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['arte-capital-members'],
    queryFn: () => arteCapitalApi.members.list(),
  })

  const columns = [
    { title: 'Nombre', dataIndex: ['user', 'firstName'], render: (_, r) => `${r.user?.firstName} ${r.user?.lastName}` },
    { title: 'Tier', dataIndex: ['tier', 'name'] },
    { title: 'Fecha Fin', dataIndex: 'endDate', render: (v) => new Date(v).toLocaleDateString() },
    { title: 'Estado', dataIndex: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag> },
  ]

  return (
    <div>
      <h2>Miembros</h2>
      <Table columns={columns} dataSource={data?.members ?? []} loading={isLoading} rowKey="id" pagination={false} />
    </div>
  )
}
