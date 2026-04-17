import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Table, Tag, Typography, Row, Col, Statistic, Button, Space, App, Tooltip } from 'antd'
import { DownloadOutlined, CheckOutlined, FileOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'
import { ordersApi } from '../../api/orders'
import dayjs from 'dayjs'
import { exportToCsv } from '../../utils/exportCsv'

const { Title } = Typography

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', IN_PAYMENT: 'En Pago', PAID: 'Pagada', IN_REVIEW: 'En Revisión',
}
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'default', IN_PAYMENT: 'orange', PAID: 'purple', IN_REVIEW: 'gold',
}

export default function AccountingDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-accounting'],
    queryFn: () => apiClient.get('/dashboards/accounting').then(r => r.data),
    refetchInterval: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: (orderId: string) =>
      ordersApi.approvePayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-accounting'] })
      message.success('Pago aprobado')
    },
    onError: () => message.error('Error al aprobar el pago'),
  })

  const orders = data?.data ?? []
  const paid = orders.filter((o: any) => o.paymentStatus === 'PAID')
  const inPayment = orders.filter((o: any) => o.paymentStatus === 'IN_PAYMENT')
  const inReview = orders.filter((o: any) => o.paymentStatus === 'IN_REVIEW')
  const totalPaid = paid.reduce((s: number, o: any) => s + Number(o.total), 0)

  const columns = [
    {
      title: 'Orden', dataIndex: 'orderNumber', render: (v: string, r: any) => (
        <a onClick={() => navigate(`/ordenes/${r.id}`)} style={{ color: '#6B46C1' }}>{v}</a>
      ),
    },
    { title: 'Evento', render: (_: any, r: any) => r.event?.name },
    {
      title: 'Cliente', render: (_: any, r: any) =>
        r.billingClient?.companyName || r.client?.companyName || `${r.client?.firstName} ${r.client?.lastName}`,
    },
    { title: 'RFC', render: (_: any, r: any) => r.billingClient?.rfc || r.client?.rfc },
    { title: 'Total', dataIndex: 'total', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { title: 'Pagado', dataIndex: 'paidAmount', render: (v: number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    {
      title: 'Estado de Pago', dataIndex: 'paymentStatus', render: (v: string) => (
        <Tag color={PAYMENT_STATUS_COLORS[v] ?? 'default'}>{PAYMENT_STATUS_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: 'Comprobante',
      render: (_: any, r: any) => {
        const doc = r.documents?.[0]
        if (!doc) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
        return (
          <Tooltip title={`${doc.fileName} · ${dayjs(doc.createdAt).format('DD/MM/YY HH:mm')}`}>
            <Button
              size="small"
              icon={<FileOutlined />}
              href={doc.blobKey}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver archivo
            </Button>
          </Tooltip>
        )
      },
    },
    {
      title: 'Acción',
      render: (_: any, r: any) => {
        if (r.paymentStatus !== 'IN_REVIEW' && r.paymentStatus !== 'IN_PAYMENT') return null
        return (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate(r.id)}
          >
            Aprobar pago
          </Button>
        )
      },
    },
    {
      title: 'Actualización', dataIndex: 'updatedAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Dashboard — Contabilidad</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Pagadas" value={paid.length} valueStyle={{ color: '#6B46C1' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="En Pago" value={inPayment.length} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="En Revisión" value={inReview.length} valueStyle={{ color: '#d4b106' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total Pagado" prefix="$" value={totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} /></Card></Col>
      </Row>
      <Card
        title="Órdenes por Estado de Pago"
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv('contabilidad-ordenes', orders.map((o: any) => ({
              orden: o.orderNumber,
              evento: o.event?.name ?? '',
              cliente: o.billingClient?.companyName || o.client?.companyName || `${o.client?.firstName} ${o.client?.lastName}`,
              rfc: o.billingClient?.rfc || o.client?.rfc || '',
              total: Number(o.total).toFixed(2),
              estado: PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus,
            })), [
              { header: 'Orden', key: 'orden' },
              { header: 'Evento', key: 'evento' },
              { header: 'Cliente', key: 'cliente' },
              { header: 'RFC', key: 'rfc' },
              { header: 'Total', key: 'total' },
              { header: 'Estado', key: 'estado' },
            ])}
          >
            Exportar CSV
          </Button>
        }
      >
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  )
}
