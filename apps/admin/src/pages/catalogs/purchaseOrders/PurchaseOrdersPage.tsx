import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table, Button, Tag, Row, Col, Select, Tabs, Empty, Skeleton, Progress, Typography,
} from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { purchaseOrdersApi } from '../../../api/purchaseOrders'
import { suppliersApi } from '../../../api/suppliers'
import { PageHeader, FilterBar, StatCard } from '../../../components/ui'
import { formatMoney } from '../../../utils/format'

const { Text } = Typography

const PO_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:              { label: 'Borrador',         color: 'default' },
  CONFIRMED:          { label: 'Confirmada',       color: 'blue' },
  PARTIALLY_RECEIVED: { label: 'Recibida parcial', color: 'orange' },
  RECEIVED:           { label: 'Recibida total',   color: 'green' },
  INVOICED:           { label: 'Facturada',        color: 'purple' },
  CANCELLED:          { label: 'Anulada',          color: 'red' },
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(searchParams.get('status') ?? undefined)
  const [supplierId, setSupplierId] = useState<string | undefined>()
  const [search, setSearch] = useState('')

  function syncParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
    setSearchParams(next, { replace: true })
  }

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allPOs.forEach((po: any) => { counts[po.status] = (counts[po.status] || 0) + 1 })
    return counts
  }, [allPOs])

  const hasFilters = !!(statusFilter || supplierId || search)
  function clearFilters() { setStatusFilter(undefined); setSupplierId(undefined); setSearch(''); setPage(1); setSearchParams(new URLSearchParams(), { replace: true }) }

  const supplierOptions = (suppliersData?.data ?? []).map((s: any) => ({ value: s.id, label: s.name }))

  const tabItems = [
    { key: 'all', label: `Todas (${meta?.total ?? allPOs.length})` },
    ...Object.entries(PO_STATUS).map(([key, { label }]) => ({
      key,
      label: `${label} (${statusCounts[key] || 0})`,
    })),
  ]

  const columns = [
    {
      title: 'Código',
      dataIndex: 'orderNumber',
      width: 130,
      render: (v: string, r: any) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600, color: '#6B46C1', fontVariantNumeric: 'tabular-nums' }}
          onClick={() => navigate(`/catalogos/ordenes-compra/${r.id}`)}
        >
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
        <Button
          type="link"
          size="small"
          style={{ padding: 0, color: '#6B46C1' }}
          onClick={() => navigate(`/ordenes/${r.originOrder.id}`)}
        >
          {r.originOrder.orderNumber}
        </Button>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Emisión',
      dataIndex: 'createdAt',
      width: 100,
      render: (v: string) => (
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{dayjs(v).format('DD/MM/YY')}</span>
      ),
    },
    {
      title: 'Entrega',
      dataIndex: 'requiredDeliveryDate',
      width: 100,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{dayjs(v).format('DD/MM/YY')}</span>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Recepción',
      key: 'reception',
      width: 160,
      render: (_: any, r: any) => {
        const items = r.lineItems?.length || r._count?.lineItems || 0
        const received = r.lineItems?.filter((li: any) => parseFloat(li.receivedQty) >= parseFloat(li.quantity)).length || 0
        const pct = items > 0 ? Math.round((received / items) * 100) : 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor={pct === 100 ? '#16a34a' : '#f59e0b'}
              style={{ flex: 1 }}
            />
            <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
              {received}/{items}
            </Text>
          </div>
        )
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 120,
      align: 'right' as const,
      render: (v: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(parseFloat(v), 'MXN')}
        </Text>
      ),
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
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/catalogos/ordenes-compra/${r.id}`)}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Órdenes de Compra"
        meta={`Compras a proveedores derivadas de OS · ${meta?.total ?? allPOs.length} totales`}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/catalogos/ordenes-compra/nueva')}>
            Nueva OC
          </Button>
        }
        tabs={
          <Tabs
            activeKey={statusFilter || 'all'}
            onChange={(k) => {
              const next = k === 'all' ? undefined : k
              setStatusFilter(next)
              setPage(1)
              syncParams({ status: next })
            }}
            items={tabItems}
            style={{ marginBottom: -1 }}
          />
        }
      />

      {/* KPI cards */}
      <div style={{ padding: '20px 24px 4px', background: '#fafafa' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Comprometido" value={formatMoney(stats.totalAmount, 'MXN')} tone="default" hint="Total en OC" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Pendiente de recibir" value={formatMoney(stats.pendingDelivery, 'MXN')} tone="warning" hint="Confirmadas + parciales" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="OC activas" value={stats.activeCount} tone="primary" hint="Confirmadas y en recepción" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Total OC" value={meta?.total ?? allPOs.length} tone="info" />
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        placeholder="Buscar OC, proveedor…"
        right={
          hasFilters ? (
            <Button type="link" style={{ color: '#6B46C1', paddingLeft: 0 }} onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : undefined
        }
      >
        <Select
          placeholder="Proveedor"
          allowClear
          value={supplierId}
          onChange={(v) => { setSupplierId(v); setPage(1) }}
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={supplierOptions}
          style={{ minWidth: 200 }}
        />
      </FilterBar>

      {/* Table */}
      <div style={{ background: '#fff' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : allPOs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay órdenes de compra aún'}
            style={{ padding: 64 }}
          >
            {hasFilters && <Button onClick={clearFilters}>Limpiar filtros</Button>}
          </Empty>
        ) : (
          <Table
            dataSource={allPOs}
            columns={columns}
            rowKey="id"
            size="middle"
            scroll={{ x: 1000 }}
            pagination={{
              current: page,
              pageSize,
              total: meta?.total,
              showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
              showTotal: t => `${t} órdenes`,
            }}
          />
        )}
      </div>
    </div>
  )
}
