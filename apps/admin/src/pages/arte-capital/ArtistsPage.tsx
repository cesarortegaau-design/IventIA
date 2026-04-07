import { useQuery } from '@tanstack/react-query'
import { Table, Tag } from 'antd'
import { arteCapitalApi } from '../../api/arte-capital'

export default function ArtistsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['arte-capital-artists'],
    queryFn: () => arteCapitalApi.artists.list(),
  })

  const columns = [
    { title: 'Nombre', dataIndex: ['user', 'firstName'], render: (_, r) => `${r.user?.firstName} ${r.user?.lastName}` },
    { title: 'Galería', dataIndex: 'galleryName' },
    { title: 'Comisión', dataIndex: 'commissionRate', render: (v) => `${v}%` },
    { title: 'Banco', dataIndex: 'bankName' },
    { title: 'Estado', dataIndex: 'isActive', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Activo' : 'Inactivo'}</Tag> },
  ]

  return (
    <div>
      <h2>Artistas</h2>
      <Table columns={columns} dataSource={data?.artists ?? []} loading={isLoading} rowKey="id" pagination={false} />
    </div>
  )
}
