import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card, Table, Tag, Typography, Row, Col, Statistic, Select, DatePicker,
  Space, Tabs, Tooltip, Button, Progress,
} from 'antd'
import {
  BarChartOutlined, ShoppingCartOutlined, WarningOutlined,
  CheckCircleOutlined, DollarOutlined, DownloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { productionApi } from '../../api/production'
import { eventsApi } from '../../api/events'
import { resourcesApi } from '../../api/resources'
import { exportToCsv } from '../../utils/exportCsv'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const PURPLE = '#531dab'

export default function ProductionPage() {
  const navigate = useNavigate()
  const [eventId, setEventId] = useState<string>()
  const [departmentId, setDepartmentId] = useState<string>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  const dateFrom = dateRange?.[0]?.format('YYYY-MM-DD')
  const dateTo = dateRange?.[1]?.format('YYYY-MM-DD')

  const { data: eventsData } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => eventsApi.list({ pageSize: 200 }),
  })
  const events = eventsData?.data ?? []

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => resourcesApi.listDepartments(),
  })
  const departments = Array.isArray(departmentsData) ? departmentsData : (departmentsData as any)?.data ?? []

  const { data: planningData, isLoading: planningLoading } = useQuery({
    queryKey: ['production-planning', eventId, departmentId, dateFrom, dateTo],
    queryFn: () => productionApi.resourcePlanning({ eventId, departmentId, dateFrom, dateTo }),
  })
  const planning = planningData?.data ?? []

  const { data: profitData, isLoading: profitLoading } = useQuery({
    queryKey: ['production-profitability', eventId, dateFrom, dateTo],
    queryFn: () => productionApi.profitability({ eventId, dateFrom, dateTo }),
  })
  const profitability = profitData?.data

  const resourcesWithGap = planning.filter((p: any) => p.gap > 0)
  const totalDemand = planning.reduce((sum: number, p: any) => sum + p.demand.totalReal, 0)
  const totalInventory = planning.reduce((sum: number, p: any) => sum + p.supply.inventoryTotal, 0)

  const planningColumns = [
    {
      title: 'Recurso', key: 'resource', width: 200,
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.resource?.name}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.resource?.code} · {r.resource?.department?.name ?? ''}</Text>
        </div>
      ),
    },
    { title: 'Unidad', key: 'unit', width: 70, render: (_: any, r: any) => r.resource?.unit ?? '—' },
    {
      title: 'Demanda Real', key: 'demand', width: 100, align: 'right' as const,
      render: (_: any, r: any) => <Text strong>{r.demand.totalReal.toFixed(2)}</Text>,
    },
    {
      title: 'Inventario', key: 'inventory', width: 100, align: 'right' as const,
      render: (_: any, r: any) => r.supply.inventoryTotal.toFixed(2),
    },
    {
      title: 'OC Pendiente', key: 'poPending', width: 100, align: 'right' as const,
      render: (_: any, r: any) => r.supply.poPending > 0
        ? <Tag color="processing">{r.supply.poPending.toFixed(2)}</Tag>
        : '0',
    },
    {
      title: 'Faltante', key: 'gap', width: 100, align: 'right' as const,
      render: (_: any, r: any) => r.gap > 0
        ? <Tag color="red" icon={<WarningOutlined />}>{r.gap.toFixed(2)}</Tag>
        : <Tag color="green" icon={<CheckCircleOutlined />}>0</Tag>,
    },
    {
      title: 'Excedente', key: 'surplus', width: 100, align: 'right' as const,
      render: (_: any, r: any) => r.surplus > 0 ? <Text type="success">{r.surplus.toFixed(2)}</Text> : '—',
    },
    {
      title: 'Órdenes', key: 'orders', width: 80, align: 'center' as const,
      render: (_: any, r: any) => r.demand.orders.length,
    },
  ]

  const orderProfitColumns = [
    {
      title: 'Orden', key: 'order', width: 130,
      render: (_: any, r: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/ordenes/${r.orderId}`)}>
          {r.orderNumber}
        </Button>
      ),
    },
    { title: 'Evento', key: 'event', render: (_: any, r: any) => r.event ? `${r.event.code} — ${r.event.name}` : '—' },
    { title: 'Cliente', dataIndex: 'client', width: 160, ellipsis: true },
    {
      title: 'Estado', dataIndex: 'status', width: 100,
      render: (v: string) => {
        const colors: Record<string, string> = { CONFIRMED: 'green', EXECUTED: 'geekblue', INVOICED: 'cyan' }
        const labels: Record<string, string> = { CONFIRMED: 'Confirmada', EXECUTED: 'Ejecutada', INVOICED: 'Facturada' }
        return <Tag color={colors[v]}>{labels[v] ?? v}</Tag>
      },
    },
    {
      title: 'Ingreso', dataIndex: 'income', width: 120, align: 'right' as const,
      render: (v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Egresos', dataIndex: 'expenses', width: 120, align: 'right' as const,
      render: (v: number) => v > 0 ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      title: 'Ganancia', dataIndex: 'profit', width: 120, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          ${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Margen', dataIndex: 'margin', width: 90, align: 'right' as const,
      render: (v: number) => (
        <Tooltip title={`${v}%`}>
          <Progress
            percent={Math.min(Math.abs(v), 100)}
            size="small"
            strokeColor={v >= 30 ? '#52c41a' : v >= 15 ? '#faad14' : '#ff4d4f'}
            format={() => `${v}%`}
            style={{ width: 70 }}
          />
        </Tooltip>
      ),
    },
  ]

  const eventProfitColumns = [
    { title: 'Evento', key: 'event', render: (_: any, r: any) => `${r.event.code} — ${r.event.name}` },
    { title: 'Órdenes', dataIndex: 'orderCount', width: 80, align: 'center' as const },
    {
      title: 'Ingreso', dataIndex: 'income', width: 140, align: 'right' as const,
      render: (v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Egresos', dataIndex: 'expenses', width: 140, align: 'right' as const,
      render: (v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Ganancia', dataIndex: 'profit', width: 140, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
          ${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Margen', dataIndex: 'margin', width: 100, align: 'right' as const,
      render: (v: number) => <Tag color={v >= 30 ? 'green' : v >= 15 ? 'gold' : 'red'}>{v}%</Tag>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BarChartOutlined style={{ color: PURPLE, fontSize: 22 }} />
        <Title level={4} style={{ margin: 0, color: PURPLE }}>Producción y Costos</Title>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Select
            style={{ width: 260 }}
            placeholder="Filtrar por evento"
            allowClear
            showSearch
            filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            value={eventId}
            onChange={v => setEventId(v)}
            options={events.map((e: any) => ({ value: e.id, label: `${e.code} — ${e.name}` }))}
          />
          <Select
            style={{ width: 200 }}
            placeholder="Departamento"
            allowClear
            value={departmentId}
            onChange={v => setDepartmentId(v)}
            options={(departments as any[]).map((d: any) => ({ value: d.id, label: d.name }))}
          />
          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={v => setDateRange(v as any)}
            placeholder={['Desde', 'Hasta']}
          />
        </Space>
      </Card>

      <Tabs
        items={[
          {
            key: 'planning',
            label: (
              <Space>
                <ShoppingCartOutlined />
                Planificación de Recursos
              </Space>
            ),
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Recursos Programados" value={planning.length} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Con Faltante" value={resourcesWithGap.length} valueStyle={{ color: resourcesWithGap.length > 0 ? '#ff4d4f' : '#52c41a' }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Demanda Total" value={totalDemand.toFixed(0)} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Inventario Disponible" value={totalInventory.toFixed(0)} />
                    </Card>
                  </Col>
                </Row>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={() => exportToCsv('planificacion-recursos', planning.map((p: any) => ({
                      codigo: p.resource?.code,
                      recurso: p.resource?.name,
                      departamento: p.resource?.department?.name ?? '',
                      unidad: p.resource?.unit ?? '',
                      demandaReal: p.demand.totalReal.toFixed(2),
                      inventario: p.supply.inventoryTotal.toFixed(2),
                      ocPendiente: p.supply.poPending.toFixed(2),
                      faltante: p.gap.toFixed(2),
                      excedente: p.surplus.toFixed(2),
                    })), [
                      { header: 'Código', key: 'codigo' },
                      { header: 'Recurso', key: 'recurso' },
                      { header: 'Departamento', key: 'departamento' },
                      { header: 'Unidad', key: 'unidad' },
                      { header: 'Demanda Real', key: 'demandaReal' },
                      { header: 'Inventario', key: 'inventario' },
                      { header: 'OC Pendiente', key: 'ocPendiente' },
                      { header: 'Faltante', key: 'faltante' },
                      { header: 'Excedente', key: 'excedente' },
                    ])}
                  >
                    Exportar CSV
                  </Button>
                </div>

                <Table
                  dataSource={planning}
                  columns={planningColumns}
                  rowKey={(r: any) => r.resource?.id}
                  loading={planningLoading}
                  size="small"
                  pagination={{ pageSize: 50 }}
                  scroll={{ x: 'max-content' }}
                  expandable={{
                    expandedRowRender: (record: any) => (
                      <div style={{ padding: '8px 0' }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 12 }}>Órdenes de Servicio:</Text>
                            <Table
                              dataSource={record.demand.orders}
                              size="small"
                              pagination={false}
                              rowKey="orderId"
                              columns={[
                                {
                                  title: 'Orden', dataIndex: 'orderNumber', width: 120,
                                  render: (v: string, r: any) => (
                                    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/ordenes/${r.orderId}`)}>
                                      {v}
                                    </Button>
                                  ),
                                },
                                { title: 'Evento', dataIndex: 'eventCode', width: 100 },
                                { title: 'Solicitado', dataIndex: 'requested', width: 90, align: 'right' as const, render: (v: number) => v.toFixed(2) },
                                { title: 'Real', dataIndex: 'real', width: 90, align: 'right' as const, render: (v: number) => v.toFixed(2) },
                              ]}
                            />
                          </Col>
                          <Col span={12}>
                            {record.supply.poItems.length > 0 && (
                              <>
                                <Text strong style={{ fontSize: 12 }}>Órdenes de Compra:</Text>
                                <Table
                                  dataSource={record.supply.poItems}
                                  size="small"
                                  pagination={false}
                                  rowKey="poId"
                                  columns={[
                                    {
                                      title: 'OC', dataIndex: 'poNumber', width: 120,
                                      render: (v: string, r: any) => (
                                        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/catalogos/ordenes-compra/${r.poId}`)}>
                                          {v}
                                        </Button>
                                      ),
                                    },
                                    { title: 'Estado', dataIndex: 'poStatus', width: 100, render: (v: string) => <Tag>{v}</Tag> },
                                    { title: 'Ordenado', dataIndex: 'quantity', width: 90, align: 'right' as const },
                                    { title: 'Recibido', dataIndex: 'received', width: 90, align: 'right' as const },
                                  ]}
                                />
                              </>
                            )}
                            {record.supply.inventoryWarehouses.length > 0 && (
                              <>
                                <Text strong style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Inventario:</Text>
                                {record.supply.inventoryWarehouses.map((w: any) => (
                                  <div key={w.warehouseId} style={{ fontSize: 12 }}>
                                    {w.warehouseName}: <strong>{w.quantity}</strong>
                                  </div>
                                ))}
                              </>
                            )}
                          </Col>
                        </Row>
                      </div>
                    ),
                  }}
                />
              </>
            ),
          },
          {
            key: 'profitability',
            label: (
              <Space>
                <DollarOutlined />
                Rentabilidad
              </Space>
            ),
            children: profitability ? (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Ingresos Totales" prefix="$" value={profitability.summary.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Egresos Totales" prefix="$" value={profitability.summary.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })} valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic
                        title="Ganancia Neta"
                        prefix="$"
                        value={profitability.summary.totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        valueStyle={{ color: profitability.summary.totalProfit >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Card size="small">
                      <Statistic title="Margen General" suffix="%" value={profitability.summary.totalMargin} valueStyle={{ color: PURPLE }} />
                    </Card>
                  </Col>
                </Row>

                <Title level={5}>Por Evento</Title>
                <Table
                  dataSource={profitability.byEvent}
                  columns={eventProfitColumns}
                  rowKey={(r: any) => r.event.id}
                  loading={profitLoading}
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  style={{ marginBottom: 24 }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Title level={5} style={{ margin: 0 }}>Por Orden de Servicio</Title>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={() => exportToCsv('rentabilidad-ordenes', profitability.byOrder.map((o: any) => ({
                      orden: o.orderNumber,
                      evento: o.event ? `${o.event.code} — ${o.event.name}` : '',
                      cliente: o.client,
                      estado: o.status,
                      ingreso: o.income.toFixed(2),
                      egresos: o.expenses.toFixed(2),
                      ganancia: o.profit.toFixed(2),
                      margen: `${o.margin}%`,
                    })), [
                      { header: 'Orden', key: 'orden' },
                      { header: 'Evento', key: 'evento' },
                      { header: 'Cliente', key: 'cliente' },
                      { header: 'Estado', key: 'estado' },
                      { header: 'Ingreso', key: 'ingreso' },
                      { header: 'Egresos', key: 'egresos' },
                      { header: 'Ganancia', key: 'ganancia' },
                      { header: 'Margen', key: 'margen' },
                    ])}
                  >
                    Exportar CSV
                  </Button>
                </div>
                <Table
                  dataSource={profitability.byOrder}
                  columns={orderProfitColumns}
                  rowKey="orderId"
                  loading={profitLoading}
                  size="small"
                  pagination={{ pageSize: 50 }}
                  scroll={{ x: 'max-content' }}
                />
              </>
            ) : null,
          },
        ]}
      />
    </div>
  )
}
