import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table, Button, Card, Tag, Row, Col, Typography, Select, Input,
  Space, Tabs, Empty, Spin, Progress,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, SearchOutlined,
  DollarOutlined, ClockCircleOutlined, ClearOutlined,
  FileTextOutlined, TruckOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'
import { suppliersApi } from '../../../api/suppliers'

const { Title, Text } = Typography

const PURPLE = '#6B46C1'

const PO_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:              { label: 'Borrador',         color: 'default' },
  CONFIRMED:          { label: 'Confirmada',       color: 'blue' },
  PARTIALLY_RECEIVED: { label: 'Recibida parcial', color: 'orange' },
  RECEIVED:           { label: 'Recibida total',   color: 'green' },
  INVOICED:           { label: 'Facturada',        color: 'purple' },
  CANCELLED:          { label: 'Anulada',          color: 'red' },
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [search, setSearch] = useState('')

  const { data: posData, isLoading } = useQuery({
    queryKey: ['purchaseOrders', page, pageSize, statusFilter, supplierId],
    queryFn: () => purchaseOrdersApi.list({
      page, pageSize,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(supplierId ? { supplierId } : {}),
    }).then(r => r.data),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list({ pageSize: 1000 }).then(r => r.data),
  })

  const allPOs: any[] = posData?.data ?? []
  const meta = posData?.meta

  // Stats from current data
  const stats = useMemo(() => {
    let totalAmount = 0
    let pendingDelivery = 0
    let activeCount = 0
    allPOs.forEach((po: any) => {
      totalAmount += parseFloat(po.total || 0)
      if (['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        pendingDelivery += parseFloat(po.total || 0)
        activeCount++
      }
    })
    return { totalAmount, pendingDelivery, activeCount }
  }, [allPOs])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allPOs.forEach((po: any) => { counts[po.status] = (counts[po.status] || 0) + 1 })
    return counts
  }, [allPOs])

  const clearFilters = () => { setStatusFilter(undefined); setSupplierId(undefined); setSearch('') }
  const hasFilters = !!(statusFilter || supplierId || search)

  const supplierOptions = (suppliersData?.data ?? []).map((s: any) => ({
    value: s.id,
    label: s.name,
  }))

  const columns = [
    {
      title: 'Código',
      dataIndex: 'orderNumber',
      width: 130,
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600, color: PURPLE, fontVariantNumeric: 'tabular-nums' }} onClick={() => navigate(`/catalogos/ordenes-compra/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Proveedor',
      render: (_: any, r: any) => (
        <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.supplier?.name ?? '—'}</Text>
      ),
    },
    {
      title: 'Origen OS',
      render: (_: any, r: any) => r.originOrder ? (
        <Button type="link" size="small" style={{ padding: 0, color: PURPLE }} onClick={() => navigate(`/ordenes/${r.originOrder.id}`)}>
          {r.originOrder.orderNumber}
        </Button>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Emisión',
      dataIndex: 'createdAt',
      width: 100,
      render: (v: string) => <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{dayjs(v).format('DD/MM/YY')}</Text>,
    },
    {
      title: 'Entrega',
      dataIndex: 'requiredDeliveryDate',
      width: 100,
      render: (v: string) => v ? <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{dayjs(v).format('DD/MM/YY')}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Recepción',
      key: 'reception',
      width: 140,
      render: (_: any, r: any) => {
        const items = r.lineItems?.length || r._count?.lineItems || 0
        const received = r.lineItems?.filter((li: any) => parseFloat(li.receivedQty) >= parseFloat(li.quantity)).length || 0
        const pct = items > 0 ? (received / items) * 100 : 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress percent={pct} size="small" showInfo={false} strokeColor={pct === 100 ? '#16a34a' : '#f59e0b'} style={{ flex: 1 }} />
            <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>{received}/{items}</Text>
          </div>
        )
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 120,
      align: 'right' as const,
      render: (v: string) => <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(parseFloat(v))}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 140,
      render: (v: string) => {
        const s = PO_STATUS[v]
        return <Tag color={s?.color}>{s?.label ?? v}</Tag>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, r: any) => (
        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/catalogos/ordenes-compra/${r.id}`)} />
      ),
    },
  ]

  const tabItems = [
    { key: 'all', label: `Todas (${meta?.total ?? allPOs.length})` },
    ...Object.entries(PO_STATUS).map(([key, { label }]) => ({
      key,
      label: `${label} (${statusCounts[key] || 0})`,
    })),
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Órdenes de Compra</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Compras a proveedores derivadas de OS · <Tag>{meta?.total ?? allPOs.length} totales</Tag>
          </Text>
        </div>
        <Space>
          <Button icon={<FileTextOutlined />}>Importar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/catalogos/ordenes-compra/nueva')}>
            Nueva OC
          </Button>
        </Space>
      </div>

      {/* Stats cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Comprometido', value: fmt(stats.totalAmount), color: '#1a3a5c' },
          { title: 'Pendiente de recibir', value: fmt(stats.pendingDelivery), color: '#f59e0b' },
          { title: 'OC activas', value: stats.activeCount, color: PURPLE },
          { title: 'Total OC', value: meta?.total ?? allPOs.length, color: '#0ea5e9' },
        ].map(card => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.title}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: card.color }}>{card.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Status tabs */}
      <Tabs
        activeKey={statusFilter || 'all'}
        onChange={k => { setStatusFilter(k === 'all' ? undefined : k); setPage(1) }}
        items={tabItems}
        style={{ marginBottom: 4 }}
      />

      {/* Filters */}
      <Card bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: 16, borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Buscar OC, proveedor, OS…"
            style={{ width: 260 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Proveedor"
            allowClear
            value={supplierId}
            onChange={v => { setSupplierId(v); setPage(1) }}
            showSearch
            filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={supplierOptions}
            style={{ minWidth: 200 }}
          />
          {hasFilters && (
            <Button icon={<ClearOutlined />} type="text" style={{ color: PURPLE }} onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 10 }}>
        <Table
          dataSource={allPOs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total: meta?.total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            showTotal: t => `${t} órdenes`,
          }}
        />
      </Card>
    </div>
  )
}
