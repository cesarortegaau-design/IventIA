import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Select, Modal, Form, Input, Space, Tag, Typography,
  Spin, Empty, Popconfirm, InputNumber, Divider, message as antMessage,
} from 'antd'
import { PlusOutlined, DeleteOutlined, FileExcelOutlined, EditOutlined, OrderedListOutlined, CheckSquareOutlined, FilePdfOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { budgetsApi } from '../../api/budgets'
import { priceListsApi } from '../../api/priceLists'
import { eventsApi } from '../../api/events'
import { collabTasksApi } from '../../api/collabTasks'
import { T } from '../../styles/tokens'

const { Text } = Typography

// ── Order management panel (shared by direct & indirect) ─────────────────────
function OrdersPanel({
  title,
  lineLabel,
  assignedOrders,
  availableOrders,
  color,
  onAdd,
  onRemove,
  addLoading,
  removeLoading,
}: {
  title: string
  lineLabel: string
  assignedOrders: any[]
  availableOrders: any[]
  color: string
  onAdd: (orderId: string) => void
  onRemove: (orderId: string) => void
  addLoading: boolean
  removeLoading: boolean
}) {
  const navigate = useNavigate()
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>()
  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  return (
    <div>
      {/* Concept name */}
      <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
        <Text type="secondary" style={{ fontSize: 11 }}>Concepto</Text>
        <div style={{ fontWeight: 600, color: '#1a3a5c' }}>{lineLabel}</div>
      </div>

      {/* Assigned orders */}
      <Text strong style={{ fontSize: 13 }}>{title}</Text>
      {assignedOrders.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
          <ExclamationCircleOutlined style={{ marginRight: 6 }} />
          Sin órdenes asignadas
        </div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {assignedOrders.map((o: any) => (
            <div
              key={o.orderId}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8,
                border: `1px solid #e8e8e8`, background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag color={color} style={{ margin: 0, fontWeight: 600 }}>{o.order?.orderNumber}</Tag>
                <Text style={{ fontSize: 13, color: '#1a3a5c', fontWeight: 500 }}>
                  {fmt(Number(o.order?.total || 0))}
                </Text>
                {o.order?.client && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    · {o.order.client.companyName || `${o.order.client.firstName ?? ''} ${o.order.client.lastName ?? ''}`.trim()}
                  </Text>
                )}
              </div>
              <Space size={4}>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  title="Ir a la orden"
                  onClick={() => navigate(`/ordenes/${o.orderId}`)}
                />
                <Popconfirm
                  title="¿Quitar esta orden del concepto?"
                  okText="Sí, quitar"
                  cancelText="No"
                  onConfirm={() => onRemove(o.orderId)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} loading={removeLoading} />
                </Popconfirm>
              </Space>
            </div>
          ))}
        </div>
      )}

      <Divider style={{ margin: '16px 0' }} />

      {/* Add order */}
      <Text strong style={{ fontSize: 13 }}>Agregar orden</Text>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Select
          placeholder="Buscar y seleccionar orden presupuestal…"
          style={{ flex: 1 }}
          showSearch
          allowClear
          optionFilterProp="label"
          value={selectedOrderId}
          onChange={setSelectedOrderId}
          options={availableOrders.map((o: any) => ({
            value: o.id,
            label: `${o.orderNumber} — ${fmt(Number(o.total || 0))}`,
          }))}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={addLoading}
          disabled={!selectedOrderId}
          style={{ background: '#1a3a5c', borderColor: '#1a3a5c' }}
          onClick={() => {
            if (selectedOrderId) {
              onAdd(selectedOrderId)
              setSelectedOrderId(undefined)
            }
          }}
        >
          Agregar
        </Button>
      </div>
    </div>
  )
}

interface EventBudgetTabProps {
  eventId: string
  event?: any
}

export default function EventBudgetTab({ eventId, event }: EventBudgetTabProps) {
  const qc = useQueryClient()
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [directOrderModal, setDirectOrderModal] = useState<{ lineId: string } | null>(null)
  const [indirectOrderModal, setIndirectOrderModal] = useState<{ lineId: string } | null>(null)
  const [taskModal, setTaskModal] = useState<{ lineId: string } | null>(null)
  const [pdfLoading, setPdfLoading]     = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [form] = Form.useForm()
  // Per-row percentage inputs for % calculators
  const [pctPresMap, setPctPresMap] = useState<Record<string, number | undefined>>({})
  const [pctRealMap, setPctRealMap] = useState<Record<string, number | undefined>>({})

  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
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

  const createMut = useMutation({
    mutationFn: (values: any) => budgetsApi.create(eventId, values),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['event-budgets', eventId] })
      setCreateModalOpen(false)
      form.resetFields()
      setSelectedBudgetId(res.data?.id ?? null)
      antMessage.success('Presupuesto creado')
    },
    onError: (e: any) => antMessage.error(e.response?.data?.message || 'Error al crear presupuesto'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => budgetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-budgets', eventId] })
      setSelectedBudgetId(null)
      antMessage.success('Presupuesto eliminado')
    },
    onError: () => antMessage.error('Error al eliminar'),
  })

  const updateLineMut = useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: any }) =>
      budgetsApi.updateLine(selectedBudgetId!, lineId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] }),
  })

  const assignDirectMut = useMutation({
    mutationFn: ({ lineId, orderId }: { lineId: string; orderId: string }) =>
      budgetsApi.assignDirectOrder(selectedBudgetId!, lineId, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] })
      setDirectOrderModal(null)
      antMessage.success('Orden asignada a costo directo')
    },
  })

  const removeDirectMut = useMutation({
    mutationFn: ({ lineId, orderId }: { lineId: string; orderId: string }) =>
      budgetsApi.removeDirectOrder(selectedBudgetId!, lineId, orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] }),
  })

  const assignIndirectMut = useMutation({
    mutationFn: ({ lineId, orderId }: { lineId: string; orderId: string }) =>
      budgetsApi.assignIndirectOrder(selectedBudgetId!, lineId, orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] })
      setIndirectOrderModal(null)
      antMessage.success('Orden asignada a costo indirecto')
    },
  })

  const removeIndirectMut = useMutation({
    mutationFn: ({ lineId, orderId }: { lineId: string; orderId: string }) =>
      budgetsApi.removeIndirectOrder(selectedBudgetId!, lineId, orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] }),
  })

  const assignTaskMut = useMutation({
    mutationFn: ({ lineId, taskId }: { lineId: string; taskId: string }) =>
      budgetsApi.assignTask(selectedBudgetId!, lineId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] })
      setTaskModal(null)
      antMessage.success('Tarea asignada')
    },
  })

  const removeTaskMut = useMutation({
    mutationFn: ({ lineId, taskId }: { lineId: string; taskId: string }) =>
      budgetsApi.removeTask(selectedBudgetId!, lineId, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-detail', selectedBudgetId] }),
  })

  async function handleExportExcel() {
    if (!budget) return
    setExcelLoading(true)
    try {
      const { downloadBudgetExcel } = await import('../../utils/budgetExcel')
      await downloadBudgetExcel(budget, event)
    } catch {
      antMessage.error('Error al generar Excel')
    } finally {
      setExcelLoading(false)
    }
  }

  async function handleDownloadPdf() {
    if (!budget) return
    setPdfLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { EventBudgetPdf } = await import('../../components/EventBudgetPdf')
      const blob = await pdf(<EventBudgetPdf budget={budget} event={event} />).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `presupuesto-${budget.name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      antMessage.error('Error al generar PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  const columns = [
    {
      title: 'Clave / Descripción',
      key: 'desc',
      render: (_: any, r: any) => (
        <div>
          <Text style={{ fontSize: 12, color: T.textMuted, fontFamily: 'monospace' }}>{r.resource?.code}</Text>
          <div style={{ fontWeight: r.resource?.isPackage ? 600 : 400 }}>
            {r.description}
            {r.resource?.isPackage && <Tag color="geekblue" style={{ marginLeft: 6, fontSize: 10 }}>Paquete</Tag>}
          </div>
        </div>
      ),
    },
    // ── PRESUPUESTADO ────────────────────────────────────────────────────────
    {
      title: 'Costo Directo Presupuestado',
      key: 'directCostBudgeted',
      width: 160,
      render: (_: any, r: any) => (
        <InputNumber
          size="small"
          prefix="$"
          value={Number(r.directCostBudgeted ?? 0)}
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
          style={{ width: '100%' }}
          onBlur={(e: any) => {
            const val = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(val) && val !== Number(r.directCostBudgeted ?? 0)) {
              updateLineMut.mutate({ lineId: r.id, data: { directCostBudgeted: val } })
            }
          }}
        />
      ),
    },
    {
      title: 'Costo Indirecto Presupuestado',
      key: 'indirectCostBudgeted',
      width: 160,
      render: (_: any, r: any) => (
        <InputNumber
          size="small"
          prefix="$"
          value={Number(r.indirectCostBudgeted ?? 0)}
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
          style={{ width: '100%' }}
          onBlur={(e: any) => {
            const val = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(val) && val !== Number(r.indirectCostBudgeted ?? 0)) {
              updateLineMut.mutate({ lineId: r.id, data: { indirectCostBudgeted: val } })
            }
          }}
        />
      ),
    },
    {
      title: 'Total Presupuestado',
      key: 'totalBudgeted',
      width: 300,
      render: (_: any, r: any) => {
        const totalCostoPres = Number(r.directCostBudgeted ?? 0) + Number(r.indirectCostBudgeted ?? 0)
        const totalPres      = Number(r.utility)
        const utilidadPres   = totalPres - totalCostoPres
        const pctCosto       = totalPres > 0 ? (totalCostoPres / totalPres * 100) : 0
        const pctUtilidad    = totalPres > 0 ? (utilidadPres   / totalPres * 100) : 0
        const pctInput       = pctPresMap[r.id]
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Total Costo Pres */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>Total Costo Pres.</Text>
              <Space size={4}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{fmt(totalCostoPres)}</Text>
                <Tag color="default" style={{ fontSize: 10, margin: 0 }}>{pctCosto.toFixed(1)}%</Tag>
              </Space>
            </div>
            {/* % calculator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
              <InputNumber
                size="small"
                min={0}
                max={999}
                precision={2}
                value={pctInput}
                placeholder="% margen"
                suffix="%"
                style={{ flex: 1, fontSize: 11 }}
                onChange={v => setPctPresMap(m => ({ ...m, [r.id]: v ?? undefined }))}
              />
              <Button
                size="small"
                type="primary"
                disabled={pctInput === undefined || pctInput === null}
                style={{ fontSize: 11, background: '#6B46C1', borderColor: '#6B46C1', padding: '0 6px' }}
                onClick={() => {
                  if (pctInput !== undefined && pctInput !== null) {
                    const newTotal = totalCostoPres * (1 + pctInput / 100)
                    updateLineMut.mutate({ lineId: r.id, data: { utility: parseFloat(newTotal.toFixed(2)) } })
                  }
                }}
              >
                Calcular
              </Button>
            </div>
            {/* Total Pres — editable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>Total Pres.</Text>
              <InputNumber
                size="small"
                prefix="$"
                value={totalPres}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
                style={{ flex: 1 }}
                onBlur={(e: any) => {
                  const val = parseFloat(e.target.value.replace(/,/g, ''))
                  if (!isNaN(val) && val !== totalPres) {
                    updateLineMut.mutate({ lineId: r.id, data: { utility: val } })
                  }
                }}
              />
            </div>
            {/* Utilidad Pres */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 6, background: utilidadPres >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${utilidadPres >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
              <Text style={{ fontSize: 11, fontWeight: 500, color: utilidadPres >= 0 ? '#166534' : '#991b1b' }}>Utilidad Pres.</Text>
              <Space size={4}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: utilidadPres >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(utilidadPres)}</Text>
                <Tag color={utilidadPres >= 0 ? 'success' : 'error'} style={{ fontSize: 10, margin: 0 }}>{pctUtilidad.toFixed(1)}%</Tag>
              </Space>
            </div>
          </div>
        )
      },
    },
    // ── REAL ────────────────────────────────────────────────────────────────
    {
      title: 'Costo Directo Real',
      key: 'directCost',
      width: 230,
      render: (_: any, r: any) => {
        const orders: any[] = r.directOrders ?? []
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orders.length > 0 ? (
              <Text strong style={{ color: T.navy, fontSize: 13 }}>{fmt(Number(r.directCost))}</Text>
            ) : (
              <InputNumber
                size="small"
                prefix="$"
                value={Number(r.directCost)}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }}
                onBlur={(e: any) => {
                  const val = parseFloat(e.target.value.replace(/,/g, ''))
                  if (!isNaN(val) && val !== Number(r.directCost)) {
                    updateLineMut.mutate({ lineId: r.id, data: { directCost: val } })
                  }
                }}
              />
            )}
            {orders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {orders.map((o: any) => (
                  <div key={o.orderId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderRadius: 4, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{o.order?.orderNumber}</span>
                    <span style={{ color: '#374151', marginLeft: 6 }}>{fmt(Number(o.order?.total || 0))}</span>
                  </div>
                ))}
              </div>
            )}
            <Button size="small" icon={<OrderedListOutlined />} onClick={() => setDirectOrderModal({ lineId: r.id })} style={{ fontSize: 11 }}>
              {orders.length === 0 ? 'Asignar órdenes' : 'Gestionar órdenes'}
            </Button>
          </div>
        )
      },
    },
    {
      title: 'Costo Indirecto Real',
      key: 'indirectCost',
      width: 230,
      render: (_: any, r: any) => {
        const orders: any[] = r.indirectOrders ?? []
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orders.length > 0 ? (
              <Text strong style={{ color: T.navy, fontSize: 13 }}>{fmt(Number(r.indirectCost))}</Text>
            ) : (
              <InputNumber
                size="small"
                prefix="$"
                value={Number(r.indirectCost)}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%' }}
                onBlur={(e: any) => {
                  const val = parseFloat(e.target.value.replace(/,/g, ''))
                  if (!isNaN(val) && val !== Number(r.indirectCost)) {
                    updateLineMut.mutate({ lineId: r.id, data: { indirectCost: val } })
                  }
                }}
              />
            )}
            {orders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {orders.map((o: any) => (
                  <div key={o.orderId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px', borderRadius: 4, background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: '#c2410c' }}>{o.order?.orderNumber}</span>
                    <span style={{ color: '#374151', marginLeft: 6 }}>{fmt(Number(o.order?.total || 0))}</span>
                  </div>
                ))}
              </div>
            )}
            <Button size="small" icon={<OrderedListOutlined />} onClick={() => setIndirectOrderModal({ lineId: r.id })} style={{ fontSize: 11 }}>
              {orders.length === 0 ? 'Asignar órdenes' : 'Gestionar órdenes'}
            </Button>
          </div>
        )
      },
    },
    {
      title: 'Total Real',
      key: 'totalReal',
      width: 300,
      render: (_: any, r: any) => {
        const totalCostoReal = Number(r.directCost) + Number(r.indirectCost)
        const totalReal      = Number(r.income)
        const utilidadReal   = totalReal - totalCostoReal
        const pctCosto       = totalReal > 0 ? (totalCostoReal / totalReal * 100) : 0
        const pctUtilidad    = totalReal > 0 ? (utilidadReal   / totalReal * 100) : 0
        const pctInput       = pctRealMap[r.id]
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Total Costo Real */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>Total Costo Real</Text>
              <Space size={4}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{fmt(totalCostoReal)}</Text>
                <Tag color="default" style={{ fontSize: 10, margin: 0 }}>{pctCosto.toFixed(1)}%</Tag>
              </Space>
            </div>
            {/* % calculator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
              <InputNumber
                size="small"
                min={0}
                max={999}
                precision={2}
                value={pctInput}
                placeholder="% margen"
                suffix="%"
                style={{ flex: 1, fontSize: 11 }}
                onChange={v => setPctRealMap(m => ({ ...m, [r.id]: v ?? undefined }))}
              />
              <Button
                size="small"
                type="primary"
                disabled={pctInput === undefined || pctInput === null}
                style={{ fontSize: 11, background: '#0369a1', borderColor: '#0369a1', padding: '0 6px' }}
                onClick={() => {
                  if (pctInput !== undefined && pctInput !== null) {
                    const newTotal = totalCostoReal * (1 + pctInput / 100)
                    updateLineMut.mutate({ lineId: r.id, data: { income: parseFloat(newTotal.toFixed(2)) } })
                  }
                }}
              >
                Calcular
              </Button>
            </div>
            {/* Total Real — editable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>Total Real</Text>
              <InputNumber
                size="small"
                prefix="$"
                value={totalReal}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
                style={{ flex: 1 }}
                onBlur={(e: any) => {
                  const val = parseFloat(e.target.value.replace(/,/g, ''))
                  if (!isNaN(val) && val !== totalReal) {
                    updateLineMut.mutate({ lineId: r.id, data: { income: val } })
                  }
                }}
              />
            </div>
            {/* Utilidad Real */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', borderRadius: 6, background: utilidadReal >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${utilidadReal >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
              <Text style={{ fontSize: 11, fontWeight: 500, color: utilidadReal >= 0 ? '#166534' : '#991b1b' }}>Utilidad Real</Text>
              <Space size={4}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: utilidadReal >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(utilidadReal)}</Text>
                <Tag color={utilidadReal >= 0 ? 'success' : 'error'} style={{ fontSize: 10, margin: 0 }}>{pctUtilidad.toFixed(1)}%</Tag>
              </Space>
            </div>
          </div>
        )
      },
    },
    {
      title: 'Tareas',
      key: 'tasks',
      width: 90,
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<CheckSquareOutlined />}
          onClick={() => setTaskModal({ lineId: r.id })}
          type={r.collabTasks?.length > 0 ? 'primary' : 'default'}
          style={r.collabTasks?.length > 0 ? { background: T.navy, borderColor: T.navy } : {}}
        >
          {r.collabTasks?.length ?? 0}
        </Button>
      ),
    },
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: `1px solid ${T.border}` }}>
      {/* Header: budget selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong style={{ color: T.navy }}>Presupuesto</Text>
          {budgets.length > 0 && (
            <Select
              placeholder="Seleccionar presupuesto"
              value={selectedBudgetId}
              onChange={setSelectedBudgetId}
              style={{ width: 250 }}
              options={budgets.map((b: any) => ({ value: b.id, label: b.name }))}
              allowClear
            />
          )}
        </Space>
        <Space>
          {selectedBudgetId && budget && (
            <>
              <Button icon={<FileExcelOutlined />} loading={excelLoading} onClick={handleExportExcel}>
                Exportar Excel
              </Button>
              <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={handleDownloadPdf}>
                Imprimir PDF
              </Button>
              <Popconfirm
                title="¿Eliminar este presupuesto?"
                onConfirm={() => deleteMut.mutate(selectedBudgetId)}
                okText="Sí"
                cancelText="No"
              >
                <Button danger icon={<DeleteOutlined />} loading={deleteMut.isPending}>
                  Eliminar
                </Button>
              </Popconfirm>
            </>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            style={{ background: T.navy, borderColor: T.navy }}
          >
            Nuevo Presupuesto
          </Button>
        </Space>
      </div>

      {/* Budget lines table */}
      {!selectedBudgetId ? (
        <Empty
          description={budgets.length === 0 ? 'Sin presupuestos. Crea uno con el botón de arriba.' : 'Selecciona un presupuesto para ver sus líneas'}
          style={{ padding: 48 }}
        />
      ) : detailLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
      ) : (
        <Table
          dataSource={lines}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 1800 }}
          expandable={{
            expandedRowRender: (record) => {
              if (!record.resource?.isPackage || !record.resource?.packageComponents?.length) return null
              return (
                <Table
                  dataSource={record.resource.packageComponents}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Componente',
                      render: (_: any, pc: any) => (
                        <div style={{ paddingLeft: 16 }}>
                          <Text style={{ fontSize: 11, fontFamily: 'monospace', color: T.textMuted }}>{pc.componentResource?.code}</Text>
                          <div>{pc.componentResource?.name}</div>
                        </div>
                      ),
                    },
                    { title: 'Cantidad', dataIndex: 'quantity', width: 80, render: (v: any) => Number(v) },
                    { title: 'Unidad', render: (_: any, pc: any) => pc.componentResource?.unit ?? '' },
                  ]}
                />
              )
            },
            rowExpandable: (r) => r.resource?.isPackage && r.resource?.packageComponents?.length > 0,
          }}
          summary={() => {
            const totalDirect    = lines.reduce((s, l) => s + Number(l.directCost || 0), 0)
            const totalIndirect  = lines.reduce((s, l) => s + Number(l.indirectCost || 0), 0)
            const totalIncome    = lines.reduce((s, l) => s + Number(l.income || 0), 0)
            const totalDirectB   = lines.reduce((s, l) => s + Number(l.directCostBudgeted || 0), 0)
            const totalIndirectB = lines.reduce((s, l) => s + Number(l.indirectCostBudgeted || 0), 0)
            const totalUtility   = lines.reduce((s, l) => s + Number(l.utility || 0), 0)

            const totalCostoReal = totalDirect + totalIndirect
            const utilidadReal   = totalIncome - totalCostoReal
            const pctCRUtilidad  = totalIncome > 0 ? (utilidadReal / totalIncome * 100) : 0

            const totalCostoPres = totalDirectB + totalIndirectB
            const utilidadPres   = totalUtility - totalCostoPres
            const pctCPUtilidad  = totalUtility > 0 ? (utilidadPres / totalUtility * 100) : 0

            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 600, background: '#f8fafc' }}>
                  <Table.Summary.Cell index={0}>TOTALES</Table.Summary.Cell>
                  {/* Presupuestado cols: 1=Dir Pres, 2=Indir Pres, 3=Total Pres */}
                  <Table.Summary.Cell index={1}><Text strong>{fmt(totalDirectB)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}><Text strong>{fmt(totalIndirectB)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: T.textMuted }}>Total Costo Pres.</span>
                        <Text strong>{fmt(totalCostoPres)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: T.textMuted }}>Total Pres.</span>
                        <Text strong>{fmt(totalUtility)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: utilidadPres >= 0 ? '#16a34a' : '#dc2626' }}>Utilidad Pres.</span>
                        <Space size={4}>
                          <Text strong style={{ color: utilidadPres >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(utilidadPres)}</Text>
                          <Tag color={utilidadPres >= 0 ? 'success' : 'error'} style={{ fontSize: 10, margin: 0 }}>{pctCPUtilidad.toFixed(1)}%</Tag>
                        </Space>
                      </div>
                    </div>
                  </Table.Summary.Cell>
                  {/* Real cols: 4=Dir Real, 5=Indir Real, 6=Total Real */}
                  <Table.Summary.Cell index={4}><Text strong>{fmt(totalDirect)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={5}><Text strong>{fmt(totalIndirect)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: T.textMuted }}>Total Costo Real</span>
                        <Text strong>{fmt(totalCostoReal)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: T.textMuted }}>Total Real</span>
                        <Text strong>{fmt(totalIncome)}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: utilidadReal >= 0 ? '#16a34a' : '#dc2626' }}>Utilidad Real</span>
                        <Space size={4}>
                          <Text strong style={{ color: utilidadReal >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(utilidadReal)}</Text>
                          <Tag color={utilidadReal >= 0 ? 'success' : 'error'} style={{ fontSize: 10, margin: 0 }}>{pctCRUtilidad.toFixed(1)}%</Tag>
                        </Space>
                      </div>
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                </Table.Summary.Row>
              </Table.Summary>
            )
          }}
        />
      )}

      {/* Create Budget Modal */}
      <Modal
        title="Nuevo Presupuesto"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText="Crear"
        okButtonProps={{ loading: createMut.isPending, style: { background: T.navy, borderColor: T.navy } }}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nombre del presupuesto" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Ej: Presupuesto 2025" />
          </Form.Item>
          <Form.Item name="priceListId" label="Lista de Conceptos" rules={[{ required: true, message: 'Requerido' }]}>
            <Select
              placeholder="Seleccionar lista de conceptos"
              options={conceptLists.map((l: any) => ({ value: l.id, label: l.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Direct Order Assignment Modal */}
      {directOrderModal && (() => {
        const line = lines.find(l => l.id === directOrderModal.lineId)
        const assignedIds = new Set(line?.directOrders?.map((o: any) => o.orderId) ?? [])
        return (
          <Modal
            title={<Space><OrderedListOutlined />Órdenes — Costo Directo</Space>}
            open
            onCancel={() => setDirectOrderModal(null)}
            footer={<Button onClick={() => setDirectOrderModal(null)}>Cerrar</Button>}
            width={620}
            styles={{ body: { paddingTop: 8 } }}
          >
            <OrdersPanel
              title="Órdenes asignadas a costo directo"
              lineLabel={line?.description ?? '—'}
              assignedOrders={line?.directOrders ?? []}
              availableOrders={budgetOrders.filter((o: any) => !assignedIds.has(o.id))}
              color="blue"
              onAdd={(orderId) => assignDirectMut.mutate({ lineId: directOrderModal.lineId, orderId })}
              onRemove={(orderId) => removeDirectMut.mutate({ lineId: directOrderModal.lineId, orderId })}
              addLoading={assignDirectMut.isPending}
              removeLoading={removeDirectMut.isPending}
            />
          </Modal>
        )
      })()}

      {/* Indirect Order Assignment Modal */}
      {indirectOrderModal && (() => {
        const line = lines.find(l => l.id === indirectOrderModal.lineId)
        const assignedIds = new Set(line?.indirectOrders?.map((o: any) => o.orderId) ?? [])
        return (
          <Modal
            title={<Space><OrderedListOutlined />Órdenes — Costo Indirecto</Space>}
            open
            onCancel={() => setIndirectOrderModal(null)}
            footer={<Button onClick={() => setIndirectOrderModal(null)}>Cerrar</Button>}
            width={620}
            styles={{ body: { paddingTop: 8 } }}
          >
            <OrdersPanel
              title="Órdenes asignadas a costo indirecto"
              lineLabel={line?.description ?? '—'}
              assignedOrders={line?.indirectOrders ?? []}
              availableOrders={budgetOrders.filter((o: any) => !assignedIds.has(o.id))}
              color="orange"
              onAdd={(orderId) => assignIndirectMut.mutate({ lineId: indirectOrderModal.lineId, orderId })}
              onRemove={(orderId) => removeIndirectMut.mutate({ lineId: indirectOrderModal.lineId, orderId })}
              addLoading={assignIndirectMut.isPending}
              removeLoading={removeIndirectMut.isPending}
            />
          </Modal>
        )
      })()}

      {/* Task Assignment Modal */}
      <Modal
        title="Asignar Tareas de Colabora"
        open={!!taskModal}
        onCancel={() => setTaskModal(null)}
        footer={null}
        width={600}
      >
        {taskModal && (() => {
          const line = lines.find(l => l.id === taskModal.lineId)
          const assignedIds = new Set(line?.collabTasks?.map((t: any) => t.collabTaskId) ?? [])
          return (
            <>
              {line?.collabTasks?.map((t: any) => (
                <div key={t.collabTaskId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <Text>{t.collabTask?.title}</Text>
                  <Button size="small" danger onClick={() => removeTaskMut.mutate({ lineId: taskModal.lineId, taskId: t.collabTaskId })}>
                    Quitar
                  </Button>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <Select
                  placeholder="Seleccionar tarea"
                  style={{ width: '100%', marginTop: 8 }}
                  showSearch
                  optionFilterProp="label"
                  options={tasks.filter((t: any) => !assignedIds.has(t.id)).map((t: any) => ({
                    value: t.id,
                    label: t.title,
                  }))}
                  onChange={(taskId) => {
                    if (taskId) assignTaskMut.mutate({ lineId: taskModal.lineId, taskId })
                  }}
                />
              </div>
            </>
          )
        })()}
      </Modal>
    </div>
  )
}
