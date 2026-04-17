import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card, Table, Tag, Typography, Row, Col, Select, DatePicker,
  Input, Button, Space, Statistic, Tooltip, Divider, Empty, Spin,
} from 'antd'
import {
  DownloadOutlined, SearchOutlined, FileTextOutlined,
  DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FilterOutlined, ClearOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { ordersApi } from '../../api/orders'
import { eventsApi } from '../../api/events'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const NAVY  = '#1a3a5c'
const BLUE  = '#2e7fc1'

const STATUS_COLOR: Record<string, string> = {
  QUOTED:      'blue',
  CONFIRMED:   'green',
  EXECUTED:    'geekblue',
  INVOICED:    'cyan',
  CANCELLED:   'red',
  CREDIT_NOTE: 'gold',
}
const STATUS_LABEL: Record<string, string> = {
  QUOTED:      'Cotizada',
  CONFIRMED:   'Confirmada',
  EXECUTED:    'Ejecutada',
  INVOICED:    'Facturada',
  CANCELLED:   'Cancelada',
  CREDIT_NOTE: 'Nota de Crédito',
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrdersReportPage() {
  const navigate = useNavigate()

  const [eventId,      setEventId]      = useState<string | undefined>()
  const [status,       setStatus]       = useState<string | undefined>()
  const [dateRange,    setDateRange]    = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [search,       setSearch]       = useState('')   // committed search

  // ── Events for selector ────────────────────────────────────────────────────
  const { data: eventsData } = useQuery({
    queryKey: ['events-list'],
    queryFn:  () => eventsApi.list({ pageSize: 200 }),
  })
  const events = eventsData?.data ?? []

  // ── Report query ───────────────────────────────────────────────────────────
  const params = useMemo(() => {
    const p: Record<string, any> = {}
    if (eventId)       p.eventId      = eventId
    if (status)        p.status       = status
    if (search)        p.clientSearch = search
    if (dateRange) {
      p.dateFrom = dateRange[0].startOf('day').toISOString()
      p.dateTo   = dateRange[1].endOf('day').toISOString()
    }
    return p
  }, [eventId, status, search, dateRange])

  const { data, isLoading } = useQuery({
    queryKey: ['orders-report', params],
    queryFn:  () => ordersApi.report(params),
  })

  const orders = data?.data    ?? []
  const totals = data?.totals  ?? {}

  // ── Clear filters ──────────────────────────────────────────────────────────
  const clearFilters = () => {
    setEventId(undefined)
    setStatus(undefined)
    setDateRange(null)
    setClientSearch('')
    setSearch('')
  }
  const hasFilters = !!(eventId || status || dateRange || search)

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    exportToCsv(
      `reporte-ordenes-${dayjs().format('YYYY-MM-DD')}`,
      orders.map((o: any) => ({
        numero:    o.orderNumber,
        evento:    o.event?.name ?? '',
        cliente:   o.client?.companyName ?? `${o.client?.firstName ?? ''} ${o.client?.lastName ?? ''}`.trim(),
        rfc:       o.client?.rfc ?? '',
        email:     o.client?.email ?? '',
        stand:        o.stand?.code ?? '',
        organizacion: o.organizacion ? `${o.organizacion.clave} — ${o.organizacion.descripcion}` : '',
        estatus:      STATUS_LABEL[o.status] ?? o.status,
        subtotal:  Number(o.subtotal).toFixed(2),
        descuento: Number(o.discountAmount).toFixed(2),
        iva:       Number(o.taxAmount).toFixed(2),
        total:     Number(o.total).toFixed(2),
        pagado:    Number(o.paidAmount).toFixed(2),
        saldo:     (Number(o.total) - Number(o.paidAmount)).toFixed(2),
        fechaInicio: o.startDate ? dayjs(o.startDate).format('DD/MM/YYYY HH:mm') : '',
        fechaFin:    o.endDate   ? dayjs(o.endDate).format('DD/MM/YYYY HH:mm')   : '',
        fecha:       dayjs(o.createdAt).format('DD/MM/YYYY'),
      })),
      [
        { header: 'Número',    key: 'numero'    },
        { header: 'Evento',    key: 'evento'    },
        { header: 'Cliente',   key: 'cliente'   },
        { header: 'RFC',       key: 'rfc'       },
        { header: 'Email',     key: 'email'     },
        { header: 'Stand',        key: 'stand'        },
        { header: 'Organización', key: 'organizacion' },
        { header: 'Estatus',      key: 'estatus'      },
        { header: 'Subtotal',  key: 'subtotal'  },
        { header: 'Descuento', key: 'descuento' },
        { header: 'IVA',       key: 'iva'       },
        { header: 'Total',     key: 'total'     },
        { header: 'Pagado',    key: 'pagado'    },
        { header: 'Saldo',     key: 'saldo'     },
        { header: 'F. Inicio', key: 'fechaInicio' },
        { header: 'F. Fin',   key: 'fechaFin'   },
        { header: 'Fecha',    key: 'fecha'       },
      ]
    )
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Orden',
      dataIndex: 'orderNumber',
      width: 130,
      render: (v: string, r: any) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600, color: BLUE }} onClick={() => navigate(`/ordenes/${r.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Cliente',
      key: 'client',
      render: (_: any, r: any) => {
        const name = r.client?.companyName ?? `${r.client?.firstName ?? ''} ${r.client?.lastName ?? ''}`.trim()
        return (
          <div>
            <Text strong style={{ color: NAVY, fontSize: 13 }}>{name}</Text>
            {r.client?.rfc && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.client.rfc}</Text></div>}
            {r.client?.email && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.client.email}</Text></div>}
          </div>
        )
      },
    },
    {
      title: 'Organización',
      key: 'organizacion',
      width: 130,
      render: (_: any, r: any) => r.organizacion
        ? <Text style={{ fontSize: 12 }}>{r.organizacion.descripcion}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Evento',
      key: 'event',
      render: (_: any, r: any) => (
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>{r.event?.name}</Text>
          {r.stand && <div><Text type="secondary" style={{ fontSize: 11 }}>Stand: {r.stand.code}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Estatus',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Ítems',
      key: 'items',
      width: 60,
      align: 'center' as const,
      render: (_: any, r: any) => (
        <Tooltip title={r.lineItems?.map((li: any) => li.description).join(', ')}>
          <Tag>{r._count?.lineItems ?? 0}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(Number(v))}</Text>,
    },
    {
      title: 'Descuento',
      dataIndex: 'discountAmount',
      width: 100,
      align: 'right' as const,
      render: (v: number) => Number(v) > 0
        ? <Text type="danger" style={{ fontSize: 12 }}>-{fmt(Number(v))}</Text>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'IVA',
      dataIndex: 'taxAmount',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(Number(v))}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 120,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: NAVY, fontSize: 13 }}>{fmt(Number(v))}</Text>
      ),
    },
    {
      title: 'Pagado',
      dataIndex: 'paidAmount',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a', fontSize: 12 }}>{fmt(Number(v))}</Text>,
    },
    {
      title: 'Saldo',
      key: 'balance',
      width: 110,
      align: 'right' as const,
      render: (_: any, r: any) => {
        const balance = Number(r.total) - Number(r.paidAmount)
        return balance > 0
          ? <Text strong style={{ color: '#fa8c16', fontSize: 12 }}>{fmt(balance)}</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
      },
    },
    {
      title: 'F. Inicio',
      dataIndex: 'startDate',
      width: 120,
      render: (v: string) => v ? <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text> : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'F. Fin',
      dataIndex: 'endDate',
      width: 120,
      render: (v: string) => v ? <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</Text> : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      width: 95,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</Text>,
    },
  ]

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <div style={{ background: NAVY, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
            <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: NAVY }}>Reporte de Órdenes de Servicio</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Consulta, filtra y exporta todas las órdenes</Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          disabled={orders.length === 0}
          style={{ background: '#8c8c8c', borderColor: '#8c8c8c' }}
        >
          Exportar CSV
        </Button>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          {
            title: 'Total Órdenes',
            value: totals.count ?? 0,
            icon: <FileTextOutlined />,
            color: NAVY,
            suffix: undefined,
            prefix: undefined,
          },
          {
            title: 'Monto Total',
            value: totals.total ?? 0,
            icon: <DollarOutlined />,
            color: BLUE,
            prefix: '$',
            formatter: (v: number) => Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 }),
          },
          {
            title: 'Total Cobrado',
            value: totals.paidAmount ?? 0,
            icon: <CheckCircleOutlined />,
            color: '#52c41a',
            prefix: '$',
            formatter: (v: number) => Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 }),
          },
          {
            title: 'Saldo Pendiente',
            value: totals.balance ?? 0,
            icon: <ClockCircleOutlined />,
            color: '#fa8c16',
            prefix: '$',
            formatter: (v: number) => Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 }),
          },
        ].map(card => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card
              style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Statistic
                  title={<Text style={{ fontSize: 12, color: '#64748b' }}>{card.title}</Text>}
                  value={card.value}
                  prefix={card.prefix}
                  formatter={card.formatter as any}
                  valueStyle={{ color: card.color, fontWeight: 700, fontSize: 22 }}
                />
                <div style={{
                  background: `${card.color}18`,
                  borderRadius: 10, padding: 10, fontSize: 20, color: card.color,
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Totals breakdown ────────────────────────────────────────────────── */}
      {orders.length > 0 && (
        <Card
          style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #e8f0fe', boxShadow: '0 1px 6px rgba(26,58,92,0.06)' }}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              Subtotal: <Text strong>{fmt(totals.subtotal ?? 0)}</Text>
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              Descuentos: <Text strong type="danger">-{fmt(totals.discountAmount ?? 0)}</Text>
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              IVA (16%): <Text strong>{fmt(totals.taxAmount ?? 0)}</Text>
            </Text>
            <Divider type="vertical" />
            <Text style={{ color: NAVY, fontSize: 13 }}>
              Total neto: <Text strong style={{ color: NAVY, fontSize: 16 }}>{fmt(totals.total ?? 0)}</Text>
            </Text>
            <Text style={{ color: '#52c41a', fontSize: 13 }}>
              Cobrado: <Text strong style={{ color: '#52c41a', fontSize: 15 }}>{fmt(totals.paidAmount ?? 0)}</Text>
            </Text>
            <Text style={{ color: '#fa8c16', fontSize: 13 }}>
              Por cobrar: <Text strong style={{ color: '#fa8c16', fontSize: 15 }}>{fmt(totals.balance ?? 0)}</Text>
            </Text>
          </div>
        </Card>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #e8f0fe' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Evento</Text>
            <Select
              style={{ width: 220 }}
              placeholder="Todos los eventos"
              allowClear
              value={eventId}
              onChange={v => setEventId(v)}
              showSearch
              filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={events.map((e: any) => ({ value: e.id, label: e.name }))}
            />
          </div>
          <div>
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Estatus</Text>
            <Select
              style={{ width: 150 }}
              placeholder="Todos"
              allowClear
              value={status}
              onChange={v => setStatus(v)}
              options={Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>
          <div>
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Rango de fechas</Text>
            <RangePicker
              style={{ width: 240 }}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={v => setDateRange(v as any)}
            />
          </div>
          <div>
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Cliente / RFC / Email</Text>
            <Input.Search
              style={{ width: 220 }}
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              onSearch={v => setSearch(v)}
              allowClear
              onClear={() => setSearch('')}
              enterButton={<SearchOutlined />}
            />
          </div>
          {hasFilters && (
            <Button icon={<ClearOutlined />} onClick={clearFilters} style={{ marginBottom: 1 }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card
        style={{ borderRadius: 12, border: '1px solid #e8f0fe', boxShadow: '0 2px 12px rgba(26,58,92,0.05)' }}
        bodyStyle={{ padding: 0 }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : orders.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No se encontraron órdenes con los filtros aplicados"
            style={{ padding: 48 }}
          />
        ) : (
          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 25, showSizeChanger: true, showTotal: t => `${t} órdenes` }}
            rowClassName={(_, i) => i % 2 === 0 ? '' : 'ant-table-row-alt'}
            style={{ borderRadius: 12, overflow: 'hidden' }}
            summary={() => orders.length > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <Text strong style={{ color: NAVY }}>Totales ({orders.length} órdenes)</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong style={{ fontSize: 12 }}>{fmt(totals.subtotal ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <Text strong type="danger" style={{ fontSize: 12 }}>-{fmt(totals.discountAmount ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <Text strong style={{ fontSize: 12 }}>{fmt(totals.taxAmount ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    <Text strong style={{ color: NAVY, fontSize: 13 }}>{fmt(totals.total ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right">
                    <Text strong style={{ color: '#52c41a', fontSize: 12 }}>{fmt(totals.paidAmount ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right">
                    <Text strong style={{ color: '#fa8c16', fontSize: 12 }}>{fmt(totals.balance ?? 0)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={11} />
                </Table.Summary.Row>
              </Table.Summary>
            ) : null}
          />
        )}
      </Card>
    </div>
  )
}
