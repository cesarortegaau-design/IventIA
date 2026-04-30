import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card, Table, Tag, Typography, Row, Col, Select, DatePicker,
  Input, Button, Space, Statistic, Tabs, Empty, Spin, Avatar, Tooltip,
} from 'antd'
import {
  PlusOutlined, DownloadOutlined, SearchOutlined,
  FileTextOutlined, DollarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ClearOutlined, EyeOutlined,
  PercentageOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { ordersApi } from '../../api/orders'
import { eventsApi } from '../../api/events'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const PURPLE = '#6B46C1'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  QUOTED:      { label: 'Cotizada',       color: 'blue' },
  CONFIRMED:   { label: 'Confirmada',     color: 'green' },
  EXECUTED:    { label: 'Ejecutada',      color: 'geekblue' },
  INVOICED:    { label: 'Facturada',      color: 'cyan' },
  CANCELLED:   { label: 'Cancelada',      color: 'red' },
  CREDIT_NOTE: { label: 'Nota de Crédito', color: 'gold' },
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrdersListPage() {
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [eventId, setEventId] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [search, setSearch] = useState('')

  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => eventsApi.list({ pageSize: 200 }),
  })
  const events = eventsData?.data ?? []

  const params = useMemo(() => {
    const p: Record<string, any> = {}
    if (eventId)       p.eventId = eventId
    if (statusFilter)  p.status = statusFilter
    if (search)        p.clientSearch = search
    if (dateRange) {
      p.dateFrom = dateRange[0].startOf('day').toISOString()
      p.dateTo   = dateRange[1].endOf('day').toISOString()
    }
    return p
  }, [eventId, statusFilter, search, dateRange])

  const { data, isLoading } = useQuery({
    queryKey: ['orders-report', params],
    queryFn: () => ordersApi.report(params),
  })

  const orders: any[] = data?.data ?? []
  const totals = data?.totals ?? {}

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    orders.forEach((o: any) => {
      counts[o.status] = (counts[o.status] || 0) + 1
    })
    return counts
  }, [orders])

  const clearFilters = () => {
    setEventId(undefined)
    setStatusFilter(undefined)
    setDateRange(null)
    setClientSearch('')
    setSearch('')
  }
  const hasFilters = !!(eventId || statusFilter || dateRange || search)

  const handleExport = () => {
    exportToCsv(
      `ordenes-servicio-${dayjs().format('YYYY-MM-DD')}`,
      orders.map((o: any) => ({
        numero: o.orderNumber,
        evento: o.event?.name ?? '',
        cliente: o.client?.companyName ?? `${o.client?.firstName ?? ''} ${o.client?.lastName ?? ''}`.trim(),
        estatus: STATUS_MAP[o.status]?.label ?? o.status,
        total: Number(o.total).toFixed(2),
        pagado: Number(o.paidAmount).toFixed(2),
        saldo: (Number(o.total) - Number(o.paidAmount)).toFixed(2),
        fecha: dayjs(o.createdAt).format('DD/MM/YYYY'),
      })),
      [
        { header: 'Número', key: 'numero' },
        { header: 'Evento', key: 'evento' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Estatus', key: 'estatus' },
        { header: 'Total', key: 'total' },
        { header: 'Pagado', key: 'pagado' },
        { header: 'Saldo', key: 'saldo' },
        { header: 'Fecha', key: 'fecha' },
      ]
    )
  }

  const filteredOrders = statusFilter
    ? orders.filter((o: any) => o.status === statusFilter)
    : orders

  const columns = [
    {
      title: 'Código',
      dataIndex: 'orderNumber',
      width: 130,
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600, color: PURPLE, fontVariantNumeric: 'tabular-nums' }} onClick={() => navigate(`/ordenes/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Evento',
      key: 'event',
      render: (_: any, r: any) => (
        <div>
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{r.event?.name ?? '—'}</Text>
          {r.event?.code && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.event.code}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Cliente',
      key: 'client',
      render: (_: any, r: any) => {
        const name = r.client?.companyName ?? `${r.client?.firstName ?? ''} ${r.client?.lastName ?? ''}`.trim()
        const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size={28} style={{ background: '#e9d5ff', color: PURPLE, fontSize: 11, fontWeight: 600 }}>
              {initials}
            </Avatar>
            <span style={{ fontSize: 13 }}>{name || '—'}</span>
          </div>
        )
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      width: 100,
      render: (v: string) => <Text style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{dayjs(v).format('DD/MM/YY')}</Text>,
    },
    {
      title: 'Items',
      key: 'items',
      width: 65,
      align: 'center' as const,
      render: (_: any, r: any) => r._count?.lineItems ?? 0,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(Number(v))}</Text>,
    },
    {
      title: 'Pagado',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmt(Number(v))}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 120,
      render: (v: string) => {
        const s = STATUS_MAP[v]
        return <Tag color={s?.color}>{s?.label ?? v}</Tag>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, r: any) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/ordenes/${r.id}`)}
        />
      ),
    },
  ]

  const tabItems = [
    { key: 'all', label: `Todas (${orders.length})` },
    ...Object.entries(STATUS_MAP).map(([key, { label }]) => ({
      key,
      label: `${label} (${statusCounts[key] || 0})`,
    })),
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Órdenes de Servicio</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Cotizaciones y órdenes asociadas a eventos · <Tag>{orders.length} totales</Tag>
          </Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={orders.length === 0}>
            Exportar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/eventos')}>
            Nueva OS
          </Button>
        </Space>
      </div>

      {/* Stats cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { title: 'Pipeline activo', value: totals.total ?? 0, icon: <DollarOutlined />, color: '#16a34a', prefix: '$', formatter: (v: any) => Number(v).toLocaleString('es-MX', { maximumFractionDigits: 0 }) },
          { title: 'Por cobrar', value: totals.balance ?? 0, icon: <ClockCircleOutlined />, color: '#f59e0b', prefix: '$', formatter: (v: any) => Number(v).toLocaleString('es-MX', { maximumFractionDigits: 0 }) },
          { title: 'Total cobrado', value: totals.paidAmount ?? 0, icon: <CheckCircleOutlined />, color: PURPLE, prefix: '$', formatter: (v: any) => Number(v).toLocaleString('es-MX', { maximumFractionDigits: 0 }) },
          { title: 'Órdenes', value: orders.length, icon: <FileTextOutlined />, color: '#0ea5e9' },
        ].map(card => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.title}</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: card.color }}>
                {card.prefix}{card.formatter ? card.formatter(card.value) : card.value}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Status tabs */}
      <Tabs
        activeKey={statusFilter || 'all'}
        onChange={k => setStatusFilter(k === 'all' ? undefined : k)}
        items={tabItems}
        style={{ marginBottom: 4 }}
      />

      {/* Filters */}
      <Card bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: 16, borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Buscar OS, evento, cliente…"
            style={{ width: 260 }}
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            onPressEnter={() => setSearch(clientSearch)}
            allowClear
            onClear={() => { setClientSearch(''); setSearch('') }}
          />
          <Select
            placeholder="Evento"
            allowClear
            value={eventId}
            onChange={v => setEventId(v)}
            showSearch
            filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={events.map((e: any) => ({ value: e.id, label: e.name }))}
            style={{ minWidth: 200 }}
          />
          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={v => setDateRange(v as any)}
            placeholder={['Desde', 'Hasta']}
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
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : filteredOrders.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No se encontraron órdenes"
            style={{ padding: 48 }}
          />
        ) : (
          <Table
            dataSource={filteredOrders}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: t => `${t} órdenes`,
            }}
          />
        )}
      </Card>
    </div>
  )
}
