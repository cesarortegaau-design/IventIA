import { useQuery } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Row, Col, Statistic } from 'antd'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import dayjs from 'dayjs'

const { Title } = Typography

export default function AccountingDashboard() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-accounting'],
    queryFn: () => apiClient.get('/dashboards/accounting').then(r => r.data),
    refetchInterval: 30_000,
  })

  const orders = data?.data ?? []
  const paid = orders.filter((o: any) => o.status === 'PAID')
  const inPayment = orders.filter((o: any) => o.status === 'IN_PAYMENT')
  const totalPaid = paid.reduce((s: number, o: any) => s + Number(o.total), 0)

  const columns = [
    { title: 'Orden', dataIndex: 'orderNumber', render: (v: string, r: any) => (
      <a onClick={() => navigate(`/ordenes/${r.id}`)} style={{ color: '#6B46C1' }}>{v}</a>
    )},
    { title: 'Evento', render: (_: any, r: any) => r.event?.name },
    { title: 'Cliente', render: (_: any, r: any) => r.billingClient?.companyName || r.client?.companyName || `${r.client?.firstName} ${r.client?.lastName}` },
    { title: 'RFC', render: (_: any, r: any) => r.billingClient?.rfc || r.client?.rfc },
    { title: 'Total', dataIndex: 'total', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Pagado', dataIndex: 'paidAmount', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Estado', dataIndex: 'status', render: (v: string) => (
      <Tag color={v === 'PAID' ? 'purple' : 'orange'}>{v === 'PAID' ? 'Pagada' : 'En Pago'}</Tag>
    )},
    { title: 'Últ. actualización', dataIndex: 'updatedAt', render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Dashboard — Contabilidad</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Órdenes Pagadas" value={paid.length} valueStyle={{ color: '#6B46C1' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="En Pago" value={inPayment.length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total Pagado" prefix="$" value={totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Card></Col>
        <Col span={6}><Card><Statistic title="Pendiente de Facturar" value={paid.length} /></Card></Col>
      </Row>
      <Card title="Órdenes Pagadas y En Pago">
        <Table dataSource={orders} columns={columns} rowKey="id" loading={isLoading} size="small" />
      </Card>
    </div>
  )
}
