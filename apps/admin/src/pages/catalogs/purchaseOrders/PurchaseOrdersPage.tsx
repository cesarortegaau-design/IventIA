import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Card, Space, Tag, Row, Col, App, Typography, Select } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'
import { suppliersApi } from '../../../api/suppliers'

const { Title } = Typography

const PO_STATUSES = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'PARTIALLY_RECEIVED', label: 'Recibido Parcial' },
  { value: 'RECEIVED', label: 'Recibido' },
  { value: 'INVOICED', label: 'Facturado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'default',
    CONFIRMED: 'blue',
    PARTIALLY_RECEIVED: 'orange',
    RECEIVED: 'green',
    INVOICED: 'purple',
    CANCELLED: 'red',
  }
  return colors[status] || 'default'
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<{ supplierId?: string; status?: string }>({})

  const { data: posData, isLoading } = useQuery({
    queryKey: ['purchaseOrders', page, pageSize, filters],
    queryFn: () => purchaseOrdersApi.list({ page, pageSize, ...filters }).then(r => r.data),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

  const columns = [
    { title: 'No. OC', dataIndex: 'orderNumber', width: 120 },
    { title: 'Proveedor', render: (_: any, r: any) => r.supplier?.name },
    { title: 'Fecha', render: (_: any, r: any) => new Date(r.createdAt).toLocaleDateString('es-MX') },
    { title: 'Estado', render: (_: any, r: any) => {
      const status = PO_STATUSES.find(s => s.value === r.status)
      return <Tag color={getStatusColor(r.status)}>{status?.label}</Tag>
    } },
    { title: 'Total', render: (_: any, r: any) => `$${parseFloat(r.total).toFixed(2)}` },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, r: any) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/catalogs/ordenes-compra/${r.id}`)}
            title="Ver detalle"
          />
        </Space>
      ),
    },
  ]

  const supplierOptions = (suppliersData?.data ?? []).map((s: any) => ({
    value: s.id,
    label: `${s.code} - ${s.name}`,
  }))

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Órdenes de Compra</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/catalogs/ordenes-compra/nueva')}>
          Nueva OC
        </Button>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Select
              placeholder="Filtrar por proveedor"
              allowClear
              options={supplierOptions}
              onChange={(v) => { setFilters({ ...filters, supplierId: v }); setPage(1) }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filtrar por estado"
              allowClear
              options={PO_STATUSES}
              onChange={(v) => { setFilters({ ...filters, status: v }); setPage(1) }}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={posData?.data ?? []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total: posData?.meta?.total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>
    </div>
  )
}
