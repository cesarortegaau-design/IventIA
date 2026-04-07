import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Button, Table, Empty } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { artistApi } from '../api/artist'

export default function ArtistDashboardPage() {
  const { data: earnings } = useQuery({
    queryKey: ['artist-earnings'],
    queryFn: artistApi.getEarnings,
  })

  return (
    <div>
      <h2>Mi Dashboard de Artista</h2>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Obras Publicadas" value={0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Vendido" value={earnings?.totalEarnings ?? 0} prefix="$" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Comisión Pendiente" value={earnings?.pendingAmount ?? 0} prefix="$" />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <h3>Mis Obras</h3>
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
          Subir Nueva Obra
        </Button>
        <Empty description="No has publicado obras aún" />
      </Card>

      <Card>
        <h3>Historial de Transacciones</h3>
        <Table
          columns={[
            { title: 'Fecha', dataIndex: 'createdAt' },
            { title: 'Monto', dataIndex: 'amount' },
            { title: 'Comisión', dataIndex: 'commissionAmount' },
            { title: 'Estado', dataIndex: 'status' },
          ]}
          dataSource={earnings?.transactions ?? []}
          pagination={false}
        />
      </Card>
    </div>
  )
}
