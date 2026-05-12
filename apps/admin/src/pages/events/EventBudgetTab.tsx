import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Select, Modal, Form, Input, Space, Tag, Typography,
  Spin, Empty, Popconfirm, InputNumber, Divider, message as antMessage, Tabs,
} from 'antd'
import { PlusOutlined, DeleteOutlined, FileExcelOutlined, EditOutlined, OrderedListOutlined, CheckSquareOutlined, FilePdfOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { budgetsApi } from '../../api/budgets'
import { priceListsApi } from '../../api/priceLists'
import { eventsApi } from '../../api/events'
import { collabTasksApi } from '../../api/collabTasks'
import { T } from '../../styles/tokens'

const { Text } = Typography

// ── Shared helpers ────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Header cell styles — clean and semantic ──────────────────────────────────
const hFixed = { style: { background: '#1e293b', color: '#f1f5f9', fontWeight: 700, fontSize: 12, padding: '8px 10px' } }

// Presupuestado palette
const hPres = (center = false) => ({
  style: {
    background: '#ede9fe', color: '#4c1d95', fontWeight: 700, fontSize: 12,
    padding: '7px 8px', ...(center ? { textAlign: 'center' as const } : {}),
  },
})

// Real palette
const hReal = (center = false) => ({
  style: {
    background: '#dbeafe', color: '#1e3a8a', fontWeight: 700, fontSize: 12,
    padding: '7px 8px', ...(center ? { textAlign: 'center' as const } : {}),
  },
})

// ── Number cell helpers ───────────────────────────────────────────────────────
function AmountCell({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: muted ? '#64748b' : '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
      {fmt(value)}
    </div>
  )
}

function UtilCell({ value, base }: { value: number; base: number }) {
  const pct  = base > 0 ? (value / base) * 100 : 0
  const pos  = value >= 0
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
        padding: '4px 8px', borderRadius: 6,
        background: pos ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${pos ? '#bbf7d0' : '#fecaca'}`,
        minWidth: 90,
      }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: pos ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(value)}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: pos ? '#15803d' : '#b91c1c' }}>
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function TotalCostoCell({ value }: { value: number }) {
  return (
    <div style={{
      textAlign: 'right', padding: '5px 8px', borderRadius: 5,
      background: '#f1f5f9', border: '1px solid #e2e8f0',
      fontWeight: 700, fontSize: 12, color: '#334155', fontVariantNumeric: 'tabular-nums',
    }}>
      {fmt(value)}
    </div>
  )
}

// ── Order management panel ────────────────────────────────────────────────────
function OrdersPanel({
  title, lineLabel, assignedOrders, availableOrders, color,
  onAdd, onRemove, addLoading, removeLoading,
}: {
  title: string; lineLabel: string; assignedOrders: any[]; availableOrders: any[]
  color: string; onAdd: (id: string) => void; onRemove: (id: string) => void
  addLoading: boolean; removeLoading: boolean
}) {
  const navigate = useNavigate()
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>()

  return (
    <div>
      <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
        <Text type="secondary" style={{ fontSize: 11 }}>Concepto</Text>
        <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{lineLabel}</div>
      </div>
      <Text strong style={{ fontSize: 13 }}>{title}</Text>
      {assignedOrders.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
          <ExclamationCircleOutlined style={{ marginRight: 6 }} />
          Sin órdenes asignadas
        </div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {assignedOrders.map((o: any) => (
            <div key={o.orderId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e8e8', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag color={color} style={{ margin: 0, fontWeight: 600 }}>{o.order?.orderNumber}</Tag>
                <Text style={{ fontSize: 13, color: '#1a3a5c', fontWeight: 500 }}>{fmt(Number(o.order?.total || 0))}</Text>
                {o.order?.client && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    · {o.order.client.companyName || `${o.order.client.firstName ?? ''} ${o.order.client.lastName ?? ''}`.trim()}
                  </Text>
                )}
              </div>
              <Space size={4}>
                <Button size="small" icon={<EditOutlined />} title="Ir a la orden" onClick={() => navigate(`/ordenes/${o.orderId}`)} />
                <Popconfirm title="¿Quitar esta orden del concepto?" okText="Sí, quitar" cancelText="No" onConfirm={() => onRemove(o.orderId)}>
                  <Button size="small" danger icon={<DeleteOutlined />} loading={removeLoading} />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      )}
      <Divider style={{ margin: '16px 0' }} />
      <Text strong style={{ fontSize: 13 }}>Agregar orden</Text>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Select
          placeholder="Buscar y seleccionar orden presupuestal…"
          style={{ flex: 1 }} showSearch allowClear optionFilterProp="label"
          value={selectedOrderId} onChange={setSelectedOrderId}
          options={availableOrders.map((o: any) => ({ value: o.id, label: `${o.orderNumber} — ${fmt(Number(o.total || 0))}` }))}
        />
        <Button type="primary" icon={<PlusOutlined />} loading={addLoading} disabled={!selectedOrderId}
          style={{ background: '#1a3a5c', borderColor: '#1a3a5c' }}
          onClick={() => { if (selectedOrderId) { onAdd(selectedOrderId); setSelectedOrderId(undefined) } }}
        >
          Agregar
        </Button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface EventBudgetTabProps { eventId: string; event?: any }

export default function EventBudgetTab({ eventId, event }: EventBudgetTabProps) {
  const qc = useQueryClient()
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen]   = useState(false)
  const [directOrderModal, setDirectOrderModal] = useState<{ lineId: string } | null>(null)
  const [indirectOrderModal, setIndirectOrderModal] = useState<{ lineId: string } | null>(null)
  const [taskModal, setTaskModal]               = useState<{ lineId: string } | null>(null)
  const [pdfLoading, setPdfLoading]             = useState(false)
  const [excelLoading, setExcelLoading]         = useState(false)
  const [form] = Form.useForm()
  const [pctPresMap, setPctPresMap] = useState<Record<string, number | undefined>>({})
  const [pctRealMap, setPctRealMap] = useState<Record<string, number | undefined>>({})
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [activeTab, setActiveTab] = useState<'presupuestado' | 'real'>('presupuestado')

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: budgetsData } = useQuery({
    queryKey: ['event-budgets', eventId],
    queryFn: () => budgetsApi.listByEvent(eventId),
    enabled: !!eventId,
  })
  const budgets: any[] = budgetsData?.data ?? []

  const { data: budgetDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['budget-detail', selectedBudgetId],
    queryFn: () => budgetsApi.get(selectedBudgetId!),
    enabled: !!selectedBudgetId,
  })
  const budget = budgetDetail?.data ?? null
  const lines: any[] = budget?.lines ?? []

  const { data: conceptListsData } = useQuery({
    queryKey: ['price-lists-concept'],
    queryFn: () => priceListsApi.list({ isConceptList: true }),
    enabled: createModalOpen,
  })
  const conceptLists: any[] = conceptListsData?.data ?? []

  const { data: budgetOrdersData } = useQuery({
    queryKey: ['event-budget-orders', eventId],
    queryFn: () => eventsApi.getOrders(eventId).then((r: any) => {
      const orders = r?.data ?? r ?? []
      return Array.isArray(orders) ? orders.filter((o: any) => o.isBudgetOrder) : []
    }),
    enabled: !!(directOrderModal || indirectOrderModal),
  })
  const budgetOrders: any[] = budgetOrdersData ?? []

  const { data: tasksData } = useQuery({
    queryKey: ['collab-tasks', {}],
    queryFn: () => collabTasksApi.list({}),
    enabled: !!taskModal,
  })
  const tasks: any[] = Array.isArray(tasksData) ? tasksData : (tasksData?.data ?? [])

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidateDetail = () => qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] })

  const createMut = useMutation({
    mutationFn: (values: any) => budgetsApi.create(eventId, values),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['event-budgets', eventId] })
      setCreateModalOpen(false); form.resetFields()
      setSelectedBudgetId(res.data?.id ?? null)
      antMessage.success('Presupuesto creado')
    },
    onError: (e: any) => antMessage.error(e.response?.data?.message || 'Error al crear presupuesto'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-budgets', eventId] })
      setSelectedBudgetId(null); antMessage.success('Presupuesto eliminado')
    },
    onError: () => antMessage.error('Error al eliminar'),
  })

  const updateLineMut = useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: any }) =>
      budgetsApi.updateLine(selectedBudgetId!, lineId, data),
    onSuccess: invalidateDetail,
  })

  const assignDirectMut   = useMutation({ mutationFn: ({ lineId, orderId }: any) => budgetsApi.assignDirectOrder(selectedBudgetId!, lineId, orderId),   onSuccess: () => { invalidateDetail(); setDirectOrderModal(null);   antMessage.success('Orden asignada') } })
  const removeDirectMut   = useMutation({ mutationFn: ({ lineId, orderId }: any) => budgetsApi.removeDirectOrder(selectedBudgetId!, lineId, orderId),   onSuccess: invalidateDetail })
  const assignIndirectMut = useMutation({ mutationFn: ({ lineId, orderId }: any) => budgetsApi.assignIndirectOrder(selectedBudgetId!, lineId, orderId), onSuccess: () => { invalidateDetail(); setIndirectOrderModal(null); antMessage.success('Orden asignada') } })
  const removeIndirectMut = useMutation({ mutationFn: ({ lineId, orderId }: any) => budgetsApi.removeIndirectOrder(selectedBudgetId!, lineId, orderId), onSuccess: invalidateDetail })
  const assignTaskMut     = useMutation({ mutationFn: ({ lineId, taskId }: any) => budgetsApi.assignTask(selectedBudgetId!, lineId, taskId),             onSuccess: () => { invalidateDetail(); setTaskModal(null);           antMessage.success('Tarea asignada') } })
  const removeTaskMut     = useMutation({ mutationFn: ({ lineId, taskId }: any) => budgetsApi.removeTask(selectedBudgetId!, lineId, taskId),             onSuccess: invalidateDetail })

  // ── Export ───────────────────────────────────────────────────────────────────
  async function handleExportExcel() {
    if (!budget) return; setExcelLoading(true)
    try { const { downloadBudgetExcel } = await import('../../utils/budgetExcel'); await downloadBudgetExcel(budget, event) }
    catch { antMessage.error('Error al generar Excel') } finally { setExcelLoading(false) }
  }

  async function handleDownloadPdf() {
    if (!budget) return; setPdfLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { EventBudgetPdf } = await import('../../components/EventBudgetPdf')
      const blob = await pdf(<EventBudgetPdf budget={budget} event={event} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `presupuesto-${budget.name}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { antMessage.error('Error al generar PDF') } finally { setPdfLoading(false) }
  }

  // ── Column helpers ───────────────────────────────────────────────────────────
  function editableAmount(value: number, field: string, lineId: string) {
    return (
      <InputNumber
        size="small" prefix="$"
        value={value}
        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
        style={{ width: '100%' }}
        onBlur={(e: any) => {
          const val = parseFloat(e.target.value.replace(/,/g, ''))
          if (!isNaN(val) && val !== value) updateLineMut.mutate({ lineId, data: { [field]: val } })
        }}
      />
    )
  }

  function totalWithCalc(
    totalCosto: number, total: number, lineId: string,
    saveField: string, pctMap: Record<string, number | undefined>,
    setPctMap: React.Dispatch<React.SetStateAction<Record<string, number | undefined>>>,
    accentColor: string,
  ) {
    const pctInput = pctMap[lineId]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <InputNumber
          size="small" prefix="$"
          value={total}
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
          style={{ width: '100%', fontWeight: 600 }}
          onBlur={(e: any) => {
            const val = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(val) && val !== total) updateLineMut.mutate({ lineId, data: { [saveField]: val } })
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <InputNumber
            size="small" min={0} max={9999} precision={1}
            value={pctInput} placeholder="% margen" suffix="%"
            style={{ flex: 1, fontSize: 11 }}
            onChange={v => setPctMap(m => ({ ...m, [lineId]: v ?? undefined }))}
          />
          <Button
            size="small" type="primary"
            disabled={pctInput === undefined || pctInput === null}
            style={{ fontSize: 10, background: accentColor, borderColor: accentColor, padding: '0 6px', color: '#fff' }}
            onClick={() => {
              if (pctInput !== undefined && pctInput !== null) {
                updateLineMut.mutate({ lineId, data: { [saveField]: parseFloat((totalCosto * (1 + pctInput / 100)).toFixed(2)) } })
              }
            }}
          >
            Calc.
          </Button>
        </div>
      </div>
    )
  }

  /** Returns the effective real cost for a line: sum of assigned orders when present, otherwise the stored DB value. */
  function effectiveCost(r: any, orderKey: 'directOrders' | 'indirectOrders', costField: string): number {
    const orders: any[] = r[orderKey] ?? []
    if (orders.length > 0) return orders.reduce((sum, o) => sum + Number(o.order?.total || 0), 0)
    return Number(r[costField] || 0)
  }

  function orderCostCell(r: any, orderKey: 'directOrders' | 'indirectOrders', costField: string, openModal: () => void, palette: { bg: string; border: string; text: string }) {
    const orders: any[] = r[orderKey] ?? []
    // Always derive the displayed total from the orders themselves so it's never stale
    const displayTotal = effectiveCost(r, orderKey, costField)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {orders.length > 0 ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(displayTotal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {orders.map((o: any) => (
                <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', borderRadius: 4, background: palette.bg, border: `1px solid ${palette.border}`, fontSize: 10 }}>
                  <span style={{ fontWeight: 600, color: palette.text }}>{o.order?.orderNumber}</span>
                  <span style={{ color: '#374151' }}>{fmt(Number(o.order?.total || 0))}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          editableAmount(Number(r[costField]), costField, r.id)
        )}
        <Button size="small" icon={<OrderedListOutlined />} onClick={openModal} style={{ fontSize: 10, height: 24 }}>
          {orders.length === 0 ? 'Asignar' : 'Gestionar'}
        </Button>
      </div>
    )
  }

  // ── Shared Concepto column ──────────────────────────────────────────────────
  const conceptoCol = {
    title: 'Concepto',
    key: 'desc', width: 220, fixed: 'left' as const,
    onHeaderCell: () => hFixed,
    render: (_: any, r: any) => (
      <div style={{ padding: '2px 0' }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{r.resource?.code}</div>
        <div style={{ fontWeight: r.resource?.isPackage ? 700 : 500, fontSize: 13, color: '#1e293b', lineHeight: 1.3 }}>
          {r.description}
          {r.resource?.isPackage && <Tag color="geekblue" style={{ marginLeft: 6, fontSize: 9 }}>Paquete</Tag>}
        </div>
      </div>
    ),
  }

  const tasksCol = {
    title: 'Tareas',
    key: 'tasks', width: 75, fixed: 'right' as const,
    onHeaderCell: () => hFixed,
    render: (_: any, r: any) => (
      <div style={{ textAlign: 'center' }}>
        <Button
          size="small" icon={<CheckSquareOutlined />}
          onClick={() => setTaskModal({ lineId: r.id })}
          type={r.collabTasks?.length > 0 ? 'primary' : 'default'}
          style={r.collabTasks?.length > 0 ? { background: T.navy, borderColor: T.navy } : {}}
        >
          {r.collabTasks?.length ?? 0}
        </Button>
      </div>
    ),
  }

  // ── Columns for PRESUPUESTADO tab ────────────────────────────────────────────
  const columnsPres: any[] = [
    conceptoCol,
    {
      title: 'Costo Directo',
      key: 'directCostBudgeted', width: 130,
      onHeaderCell: () => hPres(),
      render: (_: any, r: any) => editableAmount(Number(r.directCostBudgeted ?? 0), 'directCostBudgeted', r.id),
    },
    {
      title: 'Costo Indirecto',
      key: 'indirectCostBudgeted', width: 130,
      onHeaderCell: () => hPres(),
      render: (_: any, r: any) => editableAmount(Number(r.indirectCostBudgeted ?? 0), 'indirectCostBudgeted', r.id),
    },
    {
      title: 'Total Costo',
      key: 'totalCostoPres', width: 115,
      onHeaderCell: () => hPres(true),
      render: (_: any, r: any) => (
        <TotalCostoCell value={Number(r.directCostBudgeted ?? 0) + Number(r.indirectCostBudgeted ?? 0)} />
      ),
    },
    {
      title: 'Total Presupuestado',
      key: 'totalPres', width: 190,
      onHeaderCell: () => hPres(true),
      render: (_: any, r: any) => {
        const totalCosto = Number(r.directCostBudgeted ?? 0) + Number(r.indirectCostBudgeted ?? 0)
        return totalWithCalc(totalCosto, Number(r.utility), r.id, 'utility', pctPresMap, setPctPresMap, '#6d28d9')
      },
    },
    {
      title: 'Utilidad',
      key: 'utilidadPres', width: 125,
      onHeaderCell: () => hPres(true),
      render: (_: any, r: any) => {
        const totalCosto = Number(r.directCostBudgeted ?? 0) + Number(r.indirectCostBudgeted ?? 0)
        const total      = Number(r.utility)
        return <UtilCell value={total - totalCosto} base={total} />
      },
    },
    tasksCol,
  ]

  // ── Columns for REAL tab ─────────────────────────────────────────────────────
  const columnsReal: any[] = [
    conceptoCol,
    {
      title: 'Costo Directo',
      key: 'directCost', width: 185,
      onHeaderCell: () => hReal(),
      render: (_: any, r: any) => orderCostCell(r, 'directOrders', 'directCost',
        () => setDirectOrderModal({ lineId: r.id }),
        { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' }),
    },
    {
      title: 'Costo Indirecto',
      key: 'indirectCost', width: 185,
      onHeaderCell: () => hReal(),
      render: (_: any, r: any) => orderCostCell(r, 'indirectOrders', 'indirectCost',
        () => setIndirectOrderModal({ lineId: r.id }),
        { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' }),
    },
    {
      title: 'Total Costo',
      key: 'totalCostoReal', width: 115,
      onHeaderCell: () => hReal(true),
      render: (_: any, r: any) => (
        <TotalCostoCell value={effectiveCost(r, 'directOrders', 'directCost') + effectiveCost(r, 'indirectOrders', 'indirectCost')} />
      ),
    },
    {
      title: 'Total Real',
      key: 'totalReal', width: 190,
      onHeaderCell: () => hReal(true),
      render: (_: any, r: any) => {
        const totalCosto = effectiveCost(r, 'directOrders', 'directCost') + effectiveCost(r, 'indirectOrders', 'indirectCost')
        return totalWithCalc(totalCosto, Number(r.income), r.id, 'income', pctRealMap, setPctRealMap, '#1d4ed8')
      },
    },
    {
      title: 'Utilidad',
      key: 'utilidadReal', width: 125,
      onHeaderCell: () => hReal(true),
      render: (_: any, r: any) => {
        const totalCosto = effectiveCost(r, 'directOrders', 'directCost') + effectiveCost(r, 'indirectOrders', 'indirectCost')
        const total      = Number(r.income)
        return <UtilCell value={total - totalCosto} base={total} />
      },
    },
    tasksCol,
  ]

  // ── Summary helpers ─────────────────────────────────────────────────────────
  const cellSt: React.CSSProperties = { background: '#f1f5f9', fontWeight: 700 }
  const numSt: React.CSSProperties  = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 12 }

  function SumNum({ v, color }: { v: number; color?: string }) {
    return <div style={{ ...numSt, color: color ?? '#1e293b' }}>{fmt(v)}</div>
  }
  function SumUtil({ v, base }: { v: number; base: number }) {
    const pct = base > 0 ? (v / base * 100) : 0
    const pos = v >= 0
    return (
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: pos ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 12 }}>{fmt(v)}</div>
        <div style={{ fontSize: 10, color: pos ? '#15803d' : '#b91c1c' }}>{pct.toFixed(1)}%</div>
      </div>
    )
  }

  // ── Summary for PRESUPUESTADO tab ────────────────────────────────────────────
  function renderSummaryPres() {
    const totDirP  = lines.reduce((s, l) => s + Number(l.directCostBudgeted || 0), 0)
    const totInrP  = lines.reduce((s, l) => s + Number(l.indirectCostBudgeted || 0), 0)
    const totTP    = lines.reduce((s, l) => s + Number(l.utility || 0), 0)
    const tcP = totDirP + totInrP
    const utP = totTP - tcP

    return (
      <Table.Summary fixed>
        <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 700 }}>
          <Table.Summary.Cell index={0} style={cellSt}>
            <Text strong style={{ color: '#1e293b', fontSize: 11 }}>TOTALES</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1}  style={cellSt}><SumNum v={totDirP} /></Table.Summary.Cell>
          <Table.Summary.Cell index={2}  style={cellSt}><SumNum v={totInrP} /></Table.Summary.Cell>
          <Table.Summary.Cell index={3}  style={{ ...cellSt, background: '#e2e8f0' }}><SumNum v={tcP} /></Table.Summary.Cell>
          <Table.Summary.Cell index={4}  style={cellSt}><SumNum v={totTP} color="#4c1d95" /></Table.Summary.Cell>
          <Table.Summary.Cell index={5}  style={cellSt}><SumUtil v={utP} base={totTP} /></Table.Summary.Cell>
          <Table.Summary.Cell index={6}  style={cellSt} />
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  // ── Summary for REAL tab ─────────────────────────────────────────────────────
  function renderSummaryReal() {
    const totDirR  = lines.reduce((s, l) => s + effectiveCost(l, 'directOrders', 'directCost'), 0)
    const totInrR  = lines.reduce((s, l) => s + effectiveCost(l, 'indirectOrders', 'indirectCost'), 0)
    const totTR    = lines.reduce((s, l) => s + Number(l.income || 0), 0)
    const tcR = totDirR + totInrR
    const utR = totTR - tcR

    return (
      <Table.Summary fixed>
        <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 700 }}>
          <Table.Summary.Cell index={0} style={cellSt}>
            <Text strong style={{ color: '#1e293b', fontSize: 11 }}>TOTALES</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1}  style={cellSt}><SumNum v={totDirR} /></Table.Summary.Cell>
          <Table.Summary.Cell index={2}  style={cellSt}><SumNum v={totInrR} /></Table.Summary.Cell>
          <Table.Summary.Cell index={3}  style={{ ...cellSt, background: '#e8f0ff' }}><SumNum v={tcR} /></Table.Summary.Cell>
          <Table.Summary.Cell index={4}  style={cellSt}><SumNum v={totTR} color="#1e3a8a" /></Table.Summary.Cell>
          <Table.Summary.Cell index={5}  style={cellSt}><SumUtil v={utR} base={totTR} /></Table.Summary.Cell>
          <Table.Summary.Cell index={6}  style={cellSt} />
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong style={{ color: T.navy, fontSize: 15 }}>Presupuesto</Text>
          {budgets.length > 0 && (
            <Select
              placeholder="Seleccionar presupuesto"
              value={selectedBudgetId} onChange={setSelectedBudgetId}
              style={{ width: 260 }}
              options={budgets.map((b: any) => ({ value: b.id, label: b.name }))}
              allowClear
            />
          )}
        </Space>
        <Space>
          {selectedBudgetId && budget && (
            <>
              <Button icon={<FileExcelOutlined />} loading={excelLoading} onClick={handleExportExcel}>Excel</Button>
              <Button icon={<FilePdfOutlined />}   loading={pdfLoading}   onClick={handleDownloadPdf}>PDF</Button>
              <Popconfirm title="¿Eliminar este presupuesto?" onConfirm={() => deleteMut.mutate(selectedBudgetId)} okText="Sí" cancelText="No">
                <Button danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>Eliminar</Button>
              </Popconfirm>
            </>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)} style={{ background: T.navy, borderColor: T.navy }}>
            Nuevo Presupuesto
          </Button>
        </Space>
      </div>

      {/* Table with Tabs */}
      {!selectedBudgetId ? (
        <Empty description={budgets.length === 0 ? 'Sin presupuestos. Crea uno con el botón de arriba.' : 'Selecciona un presupuesto para ver sus líneas'} style={{ padding: 48 }} />
      ) : detailLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'presupuestado' | 'real')}
          size="small"
          style={{ marginTop: 8 }}
          items={[
            {
              key: 'presupuestado',
              label: '📋 Presupuestado',
              children: (
                <Table
                  dataSource={lines} columns={columnsPres} rowKey="id" size="small"
                  pagination={false} scroll={{ x: 1100, y: 'calc(100vh - 380px)' }}
                  rowClassName={() => 'budget-row'}
                  expandable={{
                    expandedRowKeys,
                    onExpand: (expanded, record) => {
                      setExpandedKeys(expanded ? [...expandedKeys, record.id] : expandedKeys.filter(k => k !== record.id))
                    },
                    expandedRowRender: (record) => {
                      if (!record.resource?.isPackage || !record.resource?.packageComponents?.length) return null
                      return (
                        <Table
                          dataSource={record.resource.packageComponents} rowKey="id" size="small" pagination={false}
                          columns={[
                            { title: 'Componente', render: (_: any, pc: any) => (
                              <div style={{ paddingLeft: 16 }}>
                                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: T.textMuted }}>{pc.componentResource?.code}</Text>
                                <div>{pc.componentResource?.name}</div>
                              </div>
                            )},
                            { title: 'Cantidad', dataIndex: 'quantity', width: 80, render: (v: any) => Number(v) },
                            { title: 'Unidad', render: (_: any, pc: any) => pc.componentResource?.unit ?? '' },
                          ]}
                        />
                      )
                    },
                    rowExpandable: (r) => r.resource?.isPackage && r.resource?.packageComponents?.length > 0,
                  }}
                  summary={renderSummaryPres}
                />
              ),
            },
            {
              key: 'real',
              label: '💰 Real',
              children: (
                <Table
                  dataSource={lines} columns={columnsReal} rowKey="id" size="small"
                  pagination={false} scroll={{ x: 1100, y: 'calc(100vh - 380px)' }}
                  rowClassName={() => 'budget-row'}
                  expandable={{
                    expandedRowKeys,
                    onExpand: (expanded, record) => {
                      setExpandedKeys(expanded ? [...expandedKeys, record.id] : expandedKeys.filter(k => k !== record.id))
                    },
                    expandedRowRender: (record) => {
                      if (!record.resource?.isPackage || !record.resource?.packageComponents?.length) return null
                      return (
                        <Table
                          dataSource={record.resource.packageComponents} rowKey="id" size="small" pagination={false}
                          columns={[
                            { title: 'Componente', render: (_: any, pc: any) => (
                              <div style={{ paddingLeft: 16 }}>
                                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: T.textMuted }}>{pc.componentResource?.code}</Text>
                                <div>{pc.componentResource?.name}</div>
                              </div>
                            )},
                            { title: 'Cantidad', dataIndex: 'quantity', width: 80, render: (v: any) => Number(v) },
                            { title: 'Unidad', render: (_: any, pc: any) => pc.componentResource?.unit ?? '' },
                          ]}
                        />
                      )
                    },
                    rowExpandable: (r) => r.resource?.isPackage && r.resource?.packageComponents?.length > 0,
                  }}
                  summary={renderSummaryReal}
                />
              ),
            },
          ]}
        />
      )}

      {/* Create Budget Modal */}
      <Modal
        title="Nuevo Presupuesto" open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()} okText="Crear"
        okButtonProps={{ loading: createMut.isPending, style: { background: T.navy, borderColor: T.navy } }}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nombre del presupuesto" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Presupuesto 2025" />
          </Form.Item>
          <Form.Item name="priceListId" label="Lista de Conceptos" rules={[{ required: true, message: 'Requerido' }]}>
            <Select placeholder="Seleccionar lista de conceptos" options={conceptLists.map((l: any) => ({ value: l.id, label: l.name }))} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="notes" label="Notas"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Direct Order Modal */}
      {directOrderModal && (() => {
        const line = lines.find(l => l.id === directOrderModal.lineId)
        const assignedIds = new Set(line?.directOrders?.map((o: any) => o.orderId) ?? [])
        return (
          <Modal title={<Space><OrderedListOutlined />Órdenes — Costo Directo</Space>} open
            onCancel={() => setDirectOrderModal(null)} footer={<Button onClick={() => setDirectOrderModal(null)}>Cerrar</Button>} width={620} styles={{ body: { paddingTop: 8 } }}
          >
            <OrdersPanel
              title="Órdenes asignadas a costo directo" lineLabel={line?.description ?? '—'}
              assignedOrders={line?.directOrders ?? []} availableOrders={budgetOrders.filter((o: any) => !assignedIds.has(o.id))}
              color="blue"
              onAdd={(orderId) => assignDirectMut.mutate({ lineId: directOrderModal.lineId, orderId })}
              onRemove={(orderId) => removeDirectMut.mutate({ lineId: directOrderModal.lineId, orderId })}
              addLoading={assignDirectMut.isPending} removeLoading={removeDirectMut.isPending}
            />
          </Modal>
        )
      })()}

      {/* Indirect Order Modal */}
      {indirectOrderModal && (() => {
        const line = lines.find(l => l.id === indirectOrderModal.lineId)
        const assignedIds = new Set(line?.indirectOrders?.map((o: any) => o.orderId) ?? [])
        return (
          <Modal title={<Space><OrderedListOutlined />Órdenes — Costo Indirecto</Space>} open
            onCancel={() => setIndirectOrderModal(null)} footer={<Button onClick={() => setIndirectOrderModal(null)}>Cerrar</Button>} width={620} styles={{ body: { paddingTop: 8 } }}
          >
            <OrdersPanel
              title="Órdenes asignadas a costo indirecto" lineLabel={line?.description ?? '—'}
              assignedOrders={line?.indirectOrders ?? []} availableOrders={budgetOrders.filter((o: any) => !assignedIds.has(o.id))}
              color="orange"
              onAdd={(orderId) => assignIndirectMut.mutate({ lineId: indirectOrderModal.lineId, orderId })}
              onRemove={(orderId) => removeIndirectMut.mutate({ lineId: indirectOrderModal.lineId, orderId })}
              addLoading={assignIndirectMut.isPending} removeLoading={removeIndirectMut.isPending}
            />
          </Modal>
        )
      })()}

      {/* Task Modal */}
      <Modal title="Asignar Tareas de Colabora" open={!!taskModal} onCancel={() => setTaskModal(null)} footer={null} width={600}>
        {taskModal && (() => {
          const line = lines.find(l => l.id === taskModal.lineId)
          const assignedIds = new Set(line?.collabTasks?.map((t: any) => t.collabTaskId) ?? [])
          return (
            <>
              {line?.collabTasks?.map((t: any) => (
                <div key={t.collabTaskId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <Text>{t.collabTask?.title}</Text>
                  <Button size="small" danger onClick={() => removeTaskMut.mutate({ lineId: taskModal.lineId, taskId: t.collabTaskId })}>Quitar</Button>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <Select placeholder="Seleccionar tarea" style={{ width: '100%', marginTop: 8 }} showSearch optionFilterProp="label"
                  options={tasks.filter((t: any) => !assignedIds.has(t.id)).map((t: any) => ({ value: t.id, label: t.title }))}
                  onChange={(taskId) => { if (taskId) assignTaskMut.mutate({ lineId: taskModal.lineId, taskId }) }}
                />
              </div>
            </>
          )
        })()}
      </Modal>

    </div>
  )
}
