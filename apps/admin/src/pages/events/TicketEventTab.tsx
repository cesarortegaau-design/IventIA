import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App, Button, Form, Input, InputNumber, Modal, Popconfirm, Radio,
  Select, Space, Switch, Table, Tag, Tabs, Typography, Empty, Badge,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ticketEventsApi } from '../../api/ticketEvents'
import { priceListsApi } from '../../api/priceLists'
import { resourcesApi } from '../../api/resources'

const { Text } = Typography

const TICKET_STATUS_COLORS: Record<string, string> = {
  PENDING: '#3b82f6',
  PAID: '#22c55e',
  CANCELLED: '#ef4444',
  REFUNDED: '#f59e0b',
}
const TICKET_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
}

interface Props {
  eventId: string
}

export default function TicketEventTab({ eventId }: Props) {
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  // ── State ────────────────────────────────────────────────────────────────
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<any>(null)
  const [sectionForm] = Form.useForm()

  const [seatsModalOpen, setSeatsModalOpen] = useState(false)
  const [seatsTargetSection, setSeatsTargetSection] = useState<any>(null)
  const [seatsForm] = Form.useForm()
  const [seatsPreview, setSeatsPreview] = useState<{ row: string; seats: number[] }[]>([])

  const [configForm] = Form.useForm()

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['ticket-event', eventId],
    queryFn: () => ticketEventsApi.get(eventId),
    enabled: !!eventId,
  })
  const ticketEvent = ticketData?.data ?? null

  const { data: priceListsData } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => priceListsApi.list(),
  })
  const priceLists: any[] = priceListsData?.data ?? []

  const { data: ticketResourcesData } = useQuery({
    queryKey: ['resources', 'TICKET'],
    queryFn: () => resourcesApi.list({ type: 'TICKET', isActive: true }),
  })
  const ticketResources: any[] = ticketResourcesData?.data ?? []

  const { data: ordersData } = useQuery({
    queryKey: ['ticket-orders', eventId],
    queryFn: () => ticketEventsApi.listOrders(eventId),
    enabled: !!ticketEvent,
  })
  const orders: any[] = ordersData?.data ?? []

  // ── Mutations ────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: (data: any) => ticketEventsApi.upsert(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-event', eventId] })
      message.success('Configuración guardada')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? 'Error al guardar la configuración'),
  })

  const createSectionMutation = useMutation({
    mutationFn: (data: any) => ticketEventsApi.createSection(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-event', eventId] })
      setSectionModalOpen(false)
      sectionForm.resetFields()
      setEditingSection(null)
      message.success('Sección creada')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? 'Error al crear sección'),
  })

  const updateSectionMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      ticketEventsApi.updateSection(eventId, sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-event', eventId] })
      setSectionModalOpen(false)
      sectionForm.resetFields()
      setEditingSection(null)
      message.success('Sección actualizada')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? err?.message ?? 'Error al actualizar sección'),
  })

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => ticketEventsApi.deleteSection(eventId, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-event', eventId] })
      message.success('Sección eliminada')
    },
    onError: () => message.error('Error al eliminar sección'),
  })

  const generateSeatsMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: { rows: string[]; seatsPerRow: number } }) =>
      ticketEventsApi.generateSeats(eventId, sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-event', eventId] })
      setSeatsModalOpen(false)
      seatsForm.resetFields()
      setSeatsPreview([])
      message.success('Butacas generadas')
    },
    onError: () => message.error('Error al generar butacas'),
  })

  // ── Helpers ──────────────────────────────────────────────────────────────
  function parseRows(input: string): string[] {
    const trimmed = input.trim()
    // Range format: A-E
    const rangeMatch = trimmed.match(/^([A-Za-z])-([A-Za-z])$/)
    if (rangeMatch) {
      const start = rangeMatch[1].toUpperCase().charCodeAt(0)
      const end = rangeMatch[2].toUpperCase().charCodeAt(0)
      return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i))
    }
    // CSV format: A,B,C
    return trimmed.split(',').map(r => r.trim()).filter(Boolean).map(r => r.toUpperCase())
  }

  function buildPreview(rowsInput: string, seatsPerRow: number) {
    if (!rowsInput || !seatsPerRow) return []
    const rows = parseRows(rowsInput)
    return rows.map(row => ({ row, seats: Array.from({ length: seatsPerRow }, (_, i) => i + 1) }))
  }

  function handleSeatsPreviewChange() {
    const vals = seatsForm.getFieldsValue()
    if (vals.rowsInput && vals.seatsPerRow) {
      setSeatsPreview(buildPreview(vals.rowsInput, vals.seatsPerRow))
    }
  }

  function openSectionModal(section?: any) {
    setEditingSection(section ?? null)
    if (section) {
      sectionForm.setFieldsValue({
        name: section.name,
        color: section.color ?? '#6366f1',
        capacity: section.capacity,
        price: section.price,
        resourceId: section.resourceId || undefined,
      })
    } else {
      sectionForm.resetFields()
    }
    setSectionModalOpen(true)
  }

  function openSeatsModal(section: any) {
    setSeatsTargetSection(section)
    seatsForm.resetFields()
    setSeatsPreview([])
    setSeatsModalOpen(true)
  }

  function handleSectionSave() {
    sectionForm.validateFields().then(vals => {
      const payload = {
        name: vals.name,
        colorHex: vals.color,
        capacity: vals.capacity,
        price: vals.price,
      }
      if (editingSection) {
        updateSectionMutation.mutate({ sectionId: editingSection.id, data: payload })
      } else {
        createSectionMutation.mutate(payload)
      }
    })
  }

  function handleGenerateSeats() {
    seatsForm.validateFields().then(vals => {
      const rows = parseRows(vals.rowsInput)
      generateSeatsMutation.mutate({
        sectionId: seatsTargetSection!.id,
        data: { rows, seatsPerRow: vals.seatsPerRow },
      })
    })
  }

  const sections: any[] = ticketEvent?.sections ?? []
  const isSeatMode = ticketEvent?.mode === 'SEAT'

  // ── "No ticket event" state ──────────────────────────────────────────────
  if (isLoading) return <div style={{ padding: 32, textAlign: 'center' }}><Text type="secondary">Cargando...</Text></div>

  if (!ticketEvent) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Empty
          description="Este evento no tiene portal de boletos configurado."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => upsertMutation.mutate({ slug: '', mode: 'SECTION' })}
            loading={upsertMutation.isPending}
          >
            Configurar portal de boletos
          </Button>
        </Empty>
      </div>
    )
  }

  // ── Header ───────────────────────────────────────────────────────────────
  const activeSwitch = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <Text strong style={{ fontSize: 16 }}>Portal de Boletos</Text>
      <Space>
        <Text type="secondary">Estado:</Text>
        <Switch
          checked={!!ticketEvent.active}
          checkedChildren="Activo"
          unCheckedChildren="Inactivo"
          onChange={(checked) => upsertMutation.mutate({ active: checked })}
          loading={upsertMutation.isPending}
        />
        {ticketEvent.active && <Badge status="processing" color="green" text="Publicado" />}
      </Space>
    </div>
  )

  // ── Sub-tabs ─────────────────────────────────────────────────────────────
  return (
    <div>
      {activeSwitch}

      <Tabs
        items={[
          // ── Config General ──────────────────────────────────────────────
          {
            key: 'config',
            label: 'Config General',
            children: (
              <div style={{ maxWidth: 560 }}>
                <Form
                  form={configForm}
                  layout="vertical"
                  initialValues={{
                    slug: ticketEvent.slug ?? '',
                    mode: ticketEvent.mode ?? 'SECTION',
                    priceListId: ticketEvent.priceListId ?? undefined,
                    imageUrl: ticketEvent.imageUrl ?? '',
                    mapImageUrl: ticketEvent.mapImageUrl ?? '',
                    description: ticketEvent.description ?? '',
                  }}
                  onFinish={(vals) => upsertMutation.mutate(vals)}
                >
                  <Form.Item
                    name="slug"
                    label="Slug"
                    rules={[{ required: true, message: 'El slug es requerido' }, { max: 100 }]}
                  >
                    <Input
                      addonBefore="tickets.iventIA.com/"
                      placeholder="mi-evento-2025"
                    />
                  </Form.Item>

                  <Form.Item name="mode" label="Modo de boletaje" rules={[{ required: true }]}>
                    <Radio.Group>
                      <Radio value="SECTION">Por Sección</Radio>
                      <Radio value="SEAT">Por Butaca</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item name="priceListId" label="Lista de precios">
                    <Select
                      allowClear
                      placeholder="Seleccionar lista de precios..."
                      options={priceLists.map((pl: any) => ({
                        value: pl.id,
                        label: pl.name,
                      }))}
                    />
                  </Form.Item>

                  <Form.Item name="imageUrl" label="Imagen del evento (URL)">
                    <Input placeholder="https://..." />
                  </Form.Item>

                  <Form.Item name="mapImageUrl" label="Imagen del mapa del venue (URL)">
                    <Input placeholder="https://..." />
                  </Form.Item>

                  <Form.Item name="description" label="Descripción pública">
                    <Input.TextArea rows={4} placeholder="Descripción visible para los compradores..." />
                  </Form.Item>

                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={upsertMutation.isPending}>
                      Guardar
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            ),
          },

          // ── Secciones ───────────────────────────────────────────────────
          {
            key: 'sections',
            label: `Secciones (${sections.length})`,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openSectionModal()}>
                    Agregar sección
                  </Button>
                </div>

                <Table
                  dataSource={sections}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  columns={[
                    {
                      title: 'Color',
                      dataIndex: 'color',
                      width: 60,
                      render: (color: string) => (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: color ?? '#6366f1',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      ),
                    },
                    { title: 'Nombre', dataIndex: 'name' },
                    {
                      title: 'Capacidad',
                      dataIndex: 'capacity',
                      align: 'right' as const,
                      render: (v: number) => v?.toLocaleString('es-MX') ?? '—',
                    },
                    {
                      title: 'Vendidos',
                      dataIndex: 'sold',
                      align: 'right' as const,
                      render: (v: number) => v?.toLocaleString('es-MX') ?? 0,
                    },
                    {
                      title: 'Disponibles',
                      align: 'right' as const,
                      render: (_: any, r: any) => {
                        const avail = (r.capacity ?? 0) - (r.sold ?? 0)
                        return <Text type={avail <= 0 ? 'danger' : undefined}>{avail.toLocaleString('es-MX')}</Text>
                      },
                    },
                    {
                      title: 'Precio',
                      dataIndex: 'price',
                      align: 'right' as const,
                      render: (v: number) => v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—',
                    },
                    {
                      title: 'Acciones',
                      key: 'actions',
                      render: (_: any, r: any) => (
                        <Space>
                          {isSeatMode && (
                            <Button
                              size="small"
                              icon={<AppstoreOutlined />}
                              onClick={() => openSeatsModal(r)}
                            >
                              Generar butacas
                            </Button>
                          )}
                          <Button size="small" icon={<EditOutlined />} onClick={() => openSectionModal(r)} />
                          <Popconfirm
                            title="¿Eliminar esta sección?"
                            onConfirm={() => deleteSectionMutation.mutate(r.id)}
                            okText="Sí"
                            cancelText="No"
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              loading={deleteSectionMutation.isPending}
                            />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />

                {/* Section modal */}
                <Modal
                  title={editingSection ? 'Editar sección' : 'Agregar sección'}
                  open={sectionModalOpen}
                  onCancel={() => { setSectionModalOpen(false); setEditingSection(null); sectionForm.resetFields() }}
                  onOk={handleSectionSave}
                  confirmLoading={createSectionMutation.isPending || updateSectionMutation.isPending}
                  okText="Guardar"
                  width={480}
                >
                  <Form form={sectionForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
                      <Input placeholder="Ej. VIP, General, Palcos..." />
                    </Form.Item>
                    <Form.Item name="color" label="Color" initialValue="#6366f1">
                      <input
                        type="color"
                        style={{ width: 48, height: 32, cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: 6 }}
                        onChange={(e) => sectionForm.setFieldValue('color', e.target.value)}
                        defaultValue="#6366f1"
                      />
                    </Form.Item>
                    <Form.Item name="capacity" label="Capacidad" rules={[{ required: true }]}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="price" label="Precio">
                      <InputNumber
                        min={0}
                        prefix="$"
                        style={{ width: '100%' }}
                        formatter={(v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      />
                    </Form.Item>
                  </Form>
                </Modal>

                {/* Generate seats modal */}
                <Modal
                  title={`Generar butacas — ${seatsTargetSection?.name ?? ''}`}
                  open={seatsModalOpen}
                  onCancel={() => { setSeatsModalOpen(false); seatsForm.resetFields(); setSeatsPreview([]) }}
                  onOk={handleGenerateSeats}
                  confirmLoading={generateSeatsMutation.isPending}
                  okText="Generar"
                  width={560}
                >
                  <Form
                    form={seatsForm}
                    layout="vertical"
                    style={{ marginTop: 16 }}
                    onValuesChange={handleSeatsPreviewChange}
                  >
                    <Form.Item
                      name="rowsInput"
                      label='Filas (ej. "A,B,C,D" o "A-E")'
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="A-E" />
                    </Form.Item>
                    <Form.Item
                      name="seatsPerRow"
                      label="Butacas por fila"
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} max={200} style={{ width: '100%' }} />
                    </Form.Item>
                  </Form>

                  {seatsPreview.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        Vista previa ({seatsPreview.length} filas · {seatsPreview[0].seats.length} butacas c/u = {seatsPreview.length * seatsPreview[0].seats.length} butacas total)
                      </Text>
                      <Table
                        dataSource={seatsPreview}
                        rowKey="row"
                        size="small"
                        pagination={false}
                        scroll={{ y: 200 }}
                        columns={[
                          { title: 'Fila', dataIndex: 'row', width: 60 },
                          {
                            title: 'Butacas',
                            dataIndex: 'seats',
                            render: (seats: number[]) => (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {seats[0]} – {seats[seats.length - 1]} ({seats.length})
                              </Text>
                            ),
                          },
                        ]}
                      />
                    </div>
                  )}
                </Modal>
              </>
            ),
          },

          // ── Mapa del Venue ──────────────────────────────────────────────
          {
            key: 'map',
            label: 'Mapa del Venue',
            children: <div style={{ minHeight: 600 }}>Mapa del venue — en desarrollo</div>,
          },

          // ── Órdenes ─────────────────────────────────────────────────────
          {
            key: 'orders',
            label: `Órdenes (${orders.length})`,
            children: (
              <Table
                dataSource={orders}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: <Empty description="Sin órdenes de boletos" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                columns={[
                  {
                    title: 'Comprador',
                    key: 'buyer',
                    render: (_: any, r: any) => (
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.buyerName ?? r.buyer?.name ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.buyerEmail ?? r.buyer?.email}</div>
                      </div>
                    ),
                  },
                  {
                    title: 'Sección(es)',
                    key: 'sections',
                    render: (_: any, r: any) => {
                      const secs: string[] = r.sections ?? (r.sectionName ? [r.sectionName] : [])
                      return secs.length > 0 ? secs.join(', ') : '—'
                    },
                  },
                  {
                    title: 'Cantidad',
                    dataIndex: 'quantity',
                    align: 'right' as const,
                    render: (v: number) => v ?? '—',
                  },
                  {
                    title: 'Total',
                    dataIndex: 'total',
                    align: 'right' as const,
                    render: (v: number) => v != null ? `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—',
                  },
                  {
                    title: 'Estado',
                    dataIndex: 'status',
                    render: (v: string) => (
                      <Tag color={TICKET_STATUS_COLORS[v] ?? 'default'}>
                        {TICKET_STATUS_LABELS[v] ?? v}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Fecha',
                    dataIndex: 'createdAt',
                    render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
