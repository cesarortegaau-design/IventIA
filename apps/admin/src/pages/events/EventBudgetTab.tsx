import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Select, Modal, Form, Input, Space, Tag, Typography,
  Spin, Empty, Popconfirm, InputNumber, Tooltip, message as antMessage,
} from 'antd'
import { PlusOutlined, DeleteOutlined, FileExcelOutlined, OrderedListOutlined, CheckSquareOutlined, FilePdfOutlined } from '@ant-design/icons'
import { budgetsApi } from '../../api/budgets'
import { priceListsApi } from '../../api/priceLists'
import { eventsApi } from '../../api/events'
import { collabTasksApi } from '../../api/collabTasks'
import { T } from '../../styles/tokens'

const { Text } = Typography

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
    {
      title: 'Costo Directo',
      key: 'directCost',
      width: 200,
      render: (_: any, r: any) => {
        const hasOrders = r.directOrders?.length > 0
        return (
          <div>
            {hasOrders ? (
              // Calculated from assigned orders — show as readonly total
              <div style={{ marginBottom: 4 }}>
                <Text strong style={{ color: T.navy }}>{fmt(Number(r.directCost))}</Text>
                <Text style={{ fontSize: 11, color: T.textMuted, marginLeft: 6 }}>(calculado)</Text>
              </div>
            ) : (
              <InputNumber
                size="small"
                prefix="$"
                value={Number(r.directCost)}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%', marginBottom: 4 }}
                onBlur={(e: any) => {
                  const val = parseFloat(e.target.value.replace(/,/g, ''))
                  if (!isNaN(val) && val !== Number(r.directCost)) {
                    updateLineMut.mutate({ lineId: r.id, data: { directCost: val } })
                  }
                }}
              />
            )}
            {/* Assigned orders chips */}
            {hasOrders && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 4 }}>
                {r.directOrders.map((o: any) => (
                  <Tag
                    key={o.orderId}
                    closable
                    onClose={() => removeDirectMut.mutate({ lineId: r.id, orderId: o.orderId })}
                    style={{ fontSize: 11, margin: 0 }}
                    color="blue"
                  >
                    {o.order?.orderNumber}
                  </Tag>
                ))}
              </div>
            )}
            <Button
              type="link"
              size="small"
              icon={<OrderedListOutlined />}
              style={{ padding: 0, fontSize: 11, height: 'auto' }}
              onClick={() => setDirectOrderModal({ lineId: r.id })}
            >
              + Asignar órdenes
            </Button>
          </div>
        )
      },
    },
    {
      title: 'Ingreso',
      key: 'income',
      width: 140,
      render: (_: any, r: any) => (
        <InputNumber
          size="small"
          prefix="$"
          value={Number(r.income)}
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
          style={{ width: '100%' }}
          onBlur={(e: any) => {
            const val = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(val) && val !== Number(r.income)) {
              updateLineMut.mutate({ lineId: r.id, data: { income: val } })
            }
          }}
        />
      ),
    },
    {
      title: 'Costo Indirecto',
      key: 'indirectCost',
      width: 200,
      render: (_: any, r: any) => {
        const hasOrders = r.indirectOrders?.length > 0
        return (
          <div>
            {hasOrders ? (
              <div style={{ marginBottom: 4 }}>
                <Text strong style={{ color: T.navy }}>{fmt(Number(r.indirectCost))}</Text>
                <Text style={{ fontSize: 11, color: T.textMuted, marginLeft: 6 }}>(calculado)</Text>
              </div>
            ) : (
              <InputNumber
                size="small"
                prefix="$"
                value={Number(r.indirectCost)}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
                style={{ width: '100%', marginBottom: 4 }}
                onBlur={(e: any) => {
                  const val = parseFloat(e.target.value.replace(/,/g, ''))
                  if (!isNaN(val) && val !== Number(r.indirectCost)) {
                    updateLineMut.mutate({ lineId: r.id, data: { indirectCost: val } })
                  }
                }}
              />
            )}
            {hasOrders && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 4 }}>
                {r.indirectOrders.map((o: any) => (
                  <Tag
                    key={o.orderId}
                    closable
                    onClose={() => removeIndirectMut.mutate({ lineId: r.id, orderId: o.orderId })}
                    style={{ fontSize: 11, margin: 0 }}
                    color="orange"
                  >
                    {o.order?.orderNumber}
                  </Tag>
                ))}
              </div>
            )}
            <Button
              type="link"
              size="small"
              icon={<OrderedListOutlined />}
              style={{ padding: 0, fontSize: 11, height: 'auto' }}
              onClick={() => setIndirectOrderModal({ lineId: r.id })}
            >
              + Asignar órdenes
            </Button>
          </div>
        )
      },
    },
    {
      title: 'Utilidad',
      key: 'utility',
      width: 140,
      render: (_: any, r: any) => (
        <InputNumber
          size="small"
          prefix="$"
          value={Number(r.utility)}
          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v: any) => v!.replace(/\$\s?|(,*)/g, '')}
          style={{ width: '100%' }}
          onBlur={(e: any) => {
            const val = parseFloat(e.target.value.replace(/,/g, ''))
            if (!isNaN(val) && val !== Number(r.utility)) {
              updateLineMut.mutate({ lineId: r.id, data: { utility: val } })
            }
          }}
        />
      ),
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
            const totalDirect = lines.reduce((s, l) => s + Number(l.directCost || 0), 0)
            const totalIncome = lines.reduce((s, l) => s + Number(l.income || 0), 0)
            const totalIndirect = lines.reduce((s, l) => s + Number(l.indirectCost || 0), 0)
            const totalUtility = lines.reduce((s, l) => s + Number(l.utility || 0), 0)
            const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 600, background: '#f8fafc' }}>
                  <Table.Summary.Cell index={0}>TOTALES</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>{fmt(totalDirect)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>{fmt(totalIncome)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>{fmt(totalIndirect)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>{fmt(totalUtility)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
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
      <Modal
        title="Asignar Órdenes a Costo Directo"
        open={!!directOrderModal}
        onCancel={() => setDirectOrderModal(null)}
        footer={null}
        width={600}
      >
        {directOrderModal && (() => {
          const line = lines.find(l => l.id === directOrderModal.lineId)
          const assignedIds = new Set(line?.directOrders?.map((o: any) => o.orderId) ?? [])
          return (
            <>
              <div style={{ marginBottom: 12 }}>
                <Text style={{ color: T.textMuted }}>Órdenes presupuestales asignadas:</Text>
              </div>
              {line?.directOrders?.map((o: any) => (
                <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <Text>{o.order?.orderNumber}</Text>
                  <Space>
                    <Text style={{ color: T.textMuted }}>${Number(o.order?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                    <Button size="small" danger onClick={() => removeDirectMut.mutate({ lineId: directOrderModal.lineId, orderId: o.orderId })}>
                      Quitar
                    </Button>
                  </Space>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: T.textMuted }}>Agregar orden:</Text>
                <Select
                  placeholder="Seleccionar orden presupuestal"
                  style={{ width: '100%', marginTop: 8 }}
                  showSearch
                  optionFilterProp="label"
                  options={budgetOrders.filter((o: any) => !assignedIds.has(o.id)).map((o: any) => ({
                    value: o.id,
                    label: `${o.orderNumber} - $${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                  }))}
                  onChange={(orderId) => {
                    if (orderId) assignDirectMut.mutate({ lineId: directOrderModal.lineId, orderId })
                  }}
                />
              </div>
            </>
          )
        })()}
      </Modal>

      {/* Indirect Order Assignment Modal */}
      <Modal
        title="Asignar Órdenes a Costo Indirecto"
        open={!!indirectOrderModal}
        onCancel={() => setIndirectOrderModal(null)}
        footer={null}
        width={600}
      >
        {indirectOrderModal && (() => {
          const line = lines.find(l => l.id === indirectOrderModal.lineId)
          const assignedIds = new Set(line?.indirectOrders?.map((o: any) => o.orderId) ?? [])
          return (
            <>
              {line?.indirectOrders?.map((o: any) => (
                <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <Text>{o.order?.orderNumber}</Text>
                  <Space>
                    <Text style={{ color: T.textMuted }}>${Number(o.order?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                    <Button size="small" danger onClick={() => removeIndirectMut.mutate({ lineId: indirectOrderModal.lineId, orderId: o.orderId })}>
                      Quitar
                    </Button>
                  </Space>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <Select
                  placeholder="Seleccionar orden presupuestal"
                  style={{ width: '100%', marginTop: 8 }}
                  showSearch
                  optionFilterProp="label"
                  options={budgetOrders.filter((o: any) => !assignedIds.has(o.id)).map((o: any) => ({
                    value: o.id,
                    label: `${o.orderNumber} - $${Number(o.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                  }))}
                  onChange={(orderId) => {
                    if (orderId) assignIndirectMut.mutate({ lineId: indirectOrderModal.lineId, orderId })
                  }}
                />
              </div>
            </>
          )
        })()}
      </Modal>

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
