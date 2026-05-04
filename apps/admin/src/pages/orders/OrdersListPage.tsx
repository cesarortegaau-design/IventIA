import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Row, Col, Select, DatePicker,
  Button, Space, Tabs, Empty, Skeleton, Avatar, Tooltip,
  Popconfirm, message, Typography,
} from 'antd'
import {
  PlusOutlined, DownloadOutlined, DeleteOutlined, EyeOutlined,
} from '@ant-design/icons'
import { apiClient } from '../../api/client'
import dayjs from 'dayjs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ordersApi } from '../../api/orders'
import { eventsApi } from '../../api/events'
import { exportToCsv } from '../../utils/exportCsv'
import { PageHeader, FilterBar, StatCard, StatusTag } from '../../components/ui'
import { formatMoney, getInitials, getAvatarColors } from '../../utils/format'

const { Text } = Typography
const { RangePicker } = DatePicker

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  QUOTED:      { label: 'Cotizada',        color: 'blue' },
  CONFIRMED:   { label: 'Confirmada',      color: 'green' },
  EXECUTED:    { label: 'Ejecutada',       color: 'geekblue' },
  INVOICED:    { label: 'Facturada',       color: 'cyan' },
  CANCELLED:   { label: 'Cancelada',       color: 'red' },
  CREDIT_NOTE: { label: 'Nota de Crédito', color: 'gold' },
}

export default function OrdersListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(searchParams.get('status') ?? undefined)
  const [eventId, setEventId] = useState<string | undefined>(searchParams.get('eventId') ?? undefined)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [responsableId, setResponsableId] = useState<string | undefined>(undefined)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  function syncParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v)
      else next.delete(k)
    })
    setSearchParams(next, { replace: true })
  }

  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => eventsApi.list({ pageSize: 200 }),
  })
  const events = eventsData?.data ?? []

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then(r => r.data),
  })
  const users: any[] = usersData?.data ?? []

  const params = useMemo(() => {
    const p: Record<string, any> = {}
    if (eventId) p.eventId = eventId
    if (statusFilter) p.status = statusFilter
    if (search) p.clientSearch = search
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    orders.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1 })
    return counts
  }, [orders])

  const filteredOrders = useMemo(() => {
    let list = statusFilter ? orders.filter((o: any) => o.status === statusFilter) : orders
    if (responsableId) list = list.filter((o: any) => o.assignedTo?.id === responsableId)
    return list
  }, [orders, statusFilter, responsableId])

  const hasFilters = !!(eventId || statusFilter || dateRange || search || responsableId)

  function clearFilters() {
    setEventId(undefined)
    setStatusFilter(undefined)
    setDateRange(null)
    setSearch('')
    setResponsableId(undefined)
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const deleteOrderMut = useMutation({
    mutationFn: (orderId: string) => ordersApi.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-report'] })
      message.success('Orden eliminada')
    },
    onError: () => message.error('Error al eliminar la orden'),
  })

  const handleExport = () => {
    exportToCsv(
      `ordenes-servicio-${dayjs().format('YYYY-MM-DD')}`,
      filteredOrders.map((o: any) => ({
        numero: o.orderNumber,
        evento: o.event?.name ?? '',
        cliente: o.client?.companyName ?? `${o.client?.firstName ?? ''} ${o.client?.lastName ?? ''}`.trim(),
        estatus: STATUS_MAP[o.status]?.label ?? o.status,
        fechaInicial: o.startDate ? dayjs(o.startDate).format('DD/MM/YYYY') : '—',
        fechaFinal: o.endDate ? dayjs(o.endDate).format('DD/MM/YYYY') : '—',
        total: Number(o.total).toFixed(2),
        pagado: Number(o.paidAmount).toFixed(2),
        saldo: (Number(o.total) - Number(o.paidAmount)).toFixed(2),
      })),
      [
        { header: 'Número',       key: 'numero' },
        { header: 'Evento',       key: 'evento' },
        { header: 'Cliente',      key: 'cliente' },
        { header: 'Estatus',      key: 'estatus' },
        { header: 'Fecha Inicial',key: 'fechaInicial' },
        { header: 'Fecha Final',  key: 'fechaFinal' },
        { header: 'Total',        key: 'total' },
        { header: 'Pagado',       key: 'pagado' },
        { header: 'Saldo',        key: 'saldo' },
      ]
    )
  }

  const tabItems = [
    { key: 'all', label: `Todas (${orders.length})` },
    ...Object.entries(STATUS_MAP).map(([key, { label }]) => ({
      key,
      label: `${label} (${statusCounts[key] || 0})`,
    })),
  ]

  const columns = [
    {
      title: 'Número',
      dataIndex: 'orderNumber',
      width: 130,
      render: (v: string, r: any) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600, color: '#6B46C1', fontVariantNumeric: 'tabular-nums' }}
          onClick={() => navigate(`/ordenes/${r.id}`)}
        >
          {v}
        </Button>
      ),
    },
    {
      title: 'Evento',
      key: 'event',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.event?.name ?? '—'}</div>
          {r.event?.code && (
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontVariantNumeric: 'tabular-nums' }}>
              {r.event.code}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cliente',
      key: 'client',
      render: (_: any, r: any) => {
        const name = r.client?.companyName ?? `${r.client?.firstName ?? ''} ${r.client?.lastName ?? ''}`.trim()
        const initials = getInitials(name || '?')
        const { bg, fg } = getAvatarColors(name || '?')
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size={28} style={{ background: bg, color: fg, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              {initials}
            </Avatar>
            <span style={{ fontSize: 13 }}>{name || '—'}</span>
          </div>
        )
      },
    },
    {
      title: 'Responsable',
      key: 'assignedTo',
      width: 140,
      render: (_: any, r: any) => {
        if (!r.assignedTo) return <span style={{ color: '#d9d9d9', fontSize: 12 }}>—</span>
        const name = `${r.assignedTo.firstName} ${r.assignedTo.lastName}`
        const { bg, fg } = getAvatarColors(name)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar size={22} style={{ background: bg, color: fg, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {getInitials(name)}
            </Avatar>
            <span style={{ fontSize: 12 }}>{name}</span>
          </div>
        )
      },
    },
    {
      title: 'Items',
      key: 'items',
      width: 64,
      align: 'right' as const,
      render: (_: any, r: any) => (
        <span style={{ fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {r._count?.lineItems ?? 0}
        </span>
      ),
    },
    {
      title: 'Entrega',
      dataIndex: 'endDate',
      width: 100,
      render: (v: string) => (
        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {v ? dayjs(v).format('DD/MM/YY') : '—'}
        </span>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 120,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(Number(v), 'MXN')}
        </Text>
      ),
    },
    {
      title: 'Pagado',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: '#16a34a', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(Number(v), 'MXN')}
        </Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 130,
      render: (v: string) => {
        const s = STATUS_MAP[v]
        return <Tag color={s?.color}>{s?.label ?? v}</Tag>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 64,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/ordenes/${r.id}`)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="Eliminar orden"
              description="¿Estás seguro de que deseas eliminar esta orden?"
              okText="Sí"
              cancelText="No"
              onConfirm={() => deleteOrderMut.mutate(r.id)}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
                disabled={['CONFIRMED', 'EXECUTED', 'INVOICED'].includes(r.status)}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Órdenes de Servicio"
        meta={
          <span>
            Cotizaciones y órdenes asociadas a eventos · <Tag>{orders.length} totales</Tag>
          </span>
        }
        actions={
          <>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={filteredOrders.length === 0}>
              Exportar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/eventos')}>
              Nueva OS
            </Button>
          </>
        }
        tabs={
          <Tabs
            activeKey={statusFilter || 'all'}
            onChange={(k) => {
              const next = k === 'all' ? undefined : k
              setStatusFilter(next)
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
            <StatCard
              label="Pipeline activo"
              value={formatMoney(Number(totals.total ?? 0), 'MXN')}
              tone="success"
              hint="Total cotizado / confirmado"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              label="Por cobrar"
              value={formatMoney(Number(totals.balance ?? 0), 'MXN')}
              tone="warning"
              hint="Saldo pendiente"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              label="Total cobrado"
              value={formatMoney(Number(totals.paidAmount ?? 0), 'MXN')}
              tone="primary"
              hint="Pagos recibidos"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              label="Órdenes"
              value={orders.length}
              tone="info"
              hint={`${statusCounts['CONFIRMED'] ?? 0} confirmadas · ${statusCounts['QUOTED'] ?? 0} cotizadas`}
            />
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); syncParams({ q: v }) }}
        placeholder="Buscar OS, evento, cliente…"
        right={
          hasFilters ? (
            <Button type="link" style={{ color: '#6B46C1', paddingLeft: 0 }} onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : undefined
        }
      >
        <Select
          placeholder="Evento"
          allowClear
          value={eventId}
          onChange={(v) => { setEventId(v); syncParams({ eventId: v }) }}
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={events.map((e: any) => ({ value: e.id, label: e.name }))}
          style={{ minWidth: 200 }}
        />
        <Select
          placeholder="Responsable"
          allowClear
          value={responsableId}
          onChange={(v) => setResponsableId(v)}
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={users.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
          style={{ minWidth: 160 }}
        />
        <RangePicker
          format="DD/MM/YYYY"
          value={dateRange}
          onChange={(v) => setDateRange(v as any)}
          placeholder={['Desde', 'Hasta']}
        />
      </FilterBar>

      {/* Table */}
      <div style={{ padding: '0 0', background: '#fff' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay órdenes de servicio aún'}
            style={{ padding: 64 }}
          >
            {!hasFilters && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/eventos')}>
                Crear primera OS
              </Button>
            )}
            {hasFilters && (
              <Button onClick={clearFilters}>Limpiar filtros</Button>
            )}
          </Empty>
        ) : (
          <Table
            dataSource={filteredOrders}
            columns={columns}
            rowKey="id"
            size="middle"
            scroll={{ x: 1200 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              showTotal: (t) => `${t} órdenes`,
            }}
          />
        )}
      </div>
    </div>
  )
}
