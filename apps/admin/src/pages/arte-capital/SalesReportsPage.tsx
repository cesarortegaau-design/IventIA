import { useQuery } from '@tanstack/react-query'
import { Tabs, Card, Row, Col, Statistic, Table, Spin } from 'antd'
import { arteCapitalApi } from '../../api/arte-capital'

export default function SalesReportsPage() {
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['arte-capital-sales-report'],
    queryFn: () => arteCapitalApi.reports.sales(),
  })

  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ['arte-capital-commissions-report'],
    queryFn: () => arteCapitalApi.reports.commissions(),
  })

  const salesColumns = [
    { title: 'Artista', dataIndex: ['artist', 'user', 'firstName'] },
    { title: 'Total Vendido', dataIndex: 'totalSales', render: (v) => `$${Number(v).toFixed(2)}` },
    { title: 'Comisión', dataIndex: 'totalCommission', render: (v) => `$${Number(v).toFixed(2)}` },
  ]

  return (
    <div>
      <h2>Reportes de Ventas</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Ingresos Totales" value={salesData?.totalRevenue ?? 0} prefix="$" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Comisiones Pendientes" value={commissionsData?.pendingCommissions ?? 0} prefix="$" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Órdenes" value={salesData?.totalOrders ?? 0} />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'sales',
            label: 'Ventas por Artista',
            children: (
              <Spin spinning={salesLoading}>
                <Table columns={salesColumns} dataSource={salesData?.byArtist ?? []} rowKey="artistId" pagination={false} />
              </Spin>
            ),
          },
          {
            key: 'commissions',
            label: 'Comisiones',
            children: (
              <Spin spinning={commissionsLoading}>
                <Table columns={salesColumns} dataSource={commissionsData?.commissions ?? []} rowKey="artistId" pagination={false} />
              </Spin>
            ),
          },
        ]}
      />
    </div>
  )
}
