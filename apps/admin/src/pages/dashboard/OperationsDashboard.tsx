import { useQuery } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import dayjs from 'dayjs'
import { exportToCsv } from '../../utils/exportCsv'

const { Title } = Typography

export default function OperationsDashboard() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-operations'],
    queryFn: () => apiClient.get('/dashboards/operations').then(r => r.data),
    refetchInterval: 30_000,
  })

  const orders = data?.data ?? []

  const columns = [
    { title: 'Orden', dataIndex: 'orderNumber', render: (v: string, r: any) => (
      <a onClick={() => navigate(`/ordenes/${r.id}`)} style={{ color: '#6B46C1' }}>{v}</a>
    )},
    { title: 'Evento', render: (_: any, r: any) => r.event?.name },
    { title: 'Cliente', render: (_: any, r: any) => r.client?.companyName || `${r.client?.firstName} ${r.client?.lastName}` },
    { title: 'Stand', render: (_: any, r: any) => r.stand?.code || '—' },
    { title: 'Artículos', render: (_: any, r: any) => r.lineItems?.length ?? 0 },
    { title: 'Total', dataIndex: 'total', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Facturada', dataIndex: 'updatedAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Dashboard — Operaciones</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="Órdenes Facturadas Pendientes Entrega" value={orders.length} valueStyle={{ color: '#08979c' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Total a Entregar" prefix="$" value={orders.reduce((s: number, o: any) => s + Number(o.total), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Card></Col>
      </Row>
      <Card
        title="Órdenes Facturadas — Pendientes de Entrega"
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('operaciones-pendientes', orders.map((o: any) => ({
              orden: o.orderNumber,
              evento: o.event?.name ?? '',
              cliente: o.client?.companyName || `${o.client?.firstName} ${o.client?.lastName}`,
              stand: o.stand?.code ?? '',
              total: Number(o.total).toFixed(2),
            })), [
              { header: 'Orden', key: 'orden' },
              { header: 'Evento', key: 'evento' },
              { header: 'Cliente', key: 'cliente' },
              { header: 'Stand', key: 'stand' },
              { header: 'Total', key: 'total' },
            ])}
          >
            Exportar CSV
          </Button>
        }
      >
        <Table dataSource={orders} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>
    </div>
  )
}
