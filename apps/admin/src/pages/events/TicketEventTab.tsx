import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App, Button, Form, Input, InputNumber, Modal, Popconfirm, Radio,
  Select, Space, Switch, Table, Tag, Tabs, Typography, Empty, Badge, Checkbox, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, UploadOutlined,
  MailOutlined, SendOutlined, DownloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ticketEventsApi } from '../../api/ticketEvents'
import { priceListsApi } from '../../api/priceLists'
import { resourcesApi } from '../../api/resources'
import VenueMapV2 from './VenueMapV2'

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

  const [codesModalOpen, setCodesModalOpen] = useState(false)
  const [codesForm] = Form.useForm()

  const [configForm] = Form.useForm()

  // Guests state
  const [guestImportPreview, setGuestImportPreview] = useState<any[] | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<any>(null)
  const [sendAll, setSendAll] = useState(false)
  const [sendEmail, setSendEmailFlag] = useState(true)
  const [sendWhatsapp, setSendWhatsappFlag] = useState(false)

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

  const { data: codesData } = useQuery({
    queryKey: ['ticket-codes', eventId],
    queryFn: () => ticketEventsApi.listCodes(eventId),
    enabled: !!ticketEvent,
  })
  const codes: any[] = codesData?.data ?? []

  const { data: guestsData } = useQuery({
    queryKey: ['ticket-guests', eventId],
    queryFn: () => ticketEventsApi.listGuests(eventId),
    enabled: !!ticketEvent,
  })
  const guests: any[] = guestsData?.data ?? []

  // ── Mutations ────────────────────────────────────────────────────────────
  const uploadImageMut = useMutation({
    mutationFn: ({ field, file }: { field: 'imageUrl' | 'mapImageUrl'; file: File }) =>
      ticketEventsApi.uploadImage(eventId, field, file),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-event', eventId] })
      configForm.setFieldValue(vars.field, res.data.url)
      message.success('Imagen subida')
    },
    onError: () => message.error('Error al subir imagen'),
  })

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

  const generateCodesMutation = useMutation({
    mutationFn: (data: any) => ticketEventsApi.generateCodes(eventId, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-codes', eventId] })
      setCodesModalOpen(false)
      codesForm.resetFields()
      message.success(`${res.meta?.created ?? 0} códigos generados`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? 'Error al generar códigos'),
  })

  const revokeCodeMutation = useMutation({
    mutationFn: (codeId: string) => ticketEventsApi.revokeCode(eventId, codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-codes', eventId] })
      message.success('Código revocado')
    },
    onError: () => message.error('Error al revocar código'),
  })

  const importGuestsMutation = useMutation({
    mutationFn: (rows: any[]) => ticketEventsApi.importGuests(eventId, rows),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-guests', eventId] })
      setGuestImportPreview(null)
      message.success(`${res.meta?.created ?? 0} invitados importados`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al importar'),
  })

  const sendInvitationMutation = useMutation({
    mutationFn: ({ guestId, opts }: { guestId: string; opts: any }) =>
      ticketEventsApi.sendGuestInvitation(eventId, guestId, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-guests', eventId] })
      setSendModalOpen(false)
      message.success('Invitación enviada')
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al enviar'),
  })

  const sendAllMutation = useMutation({
    mutationFn: (opts: any) => ticketEventsApi.sendAllGuestInvitations(eventId, opts),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-guests', eventId] })
      setSendModalOpen(false)
      message.success(`Enviado: ${res.meta?.emailCount ?? 0} emails, ${res.meta?.whatsappCount ?? 0} WhatsApp`)
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message ?? 'Error al enviar'),
  })

  const deleteGuestMutation = useMutation({
    mutationFn: (guestId: string) => ticketEventsApi.deleteGuest(eventId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-guests', eventId] })
      message.success('Invitado eliminado')
    },
    onError: () => message.error('Error al eliminar'),
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

  function downloadGuestTemplate() {
    const csv = 'nombre,apellido_paterno,apellido_materno,email,telefono,numero_de_boletos\nJuan,Pérez,García,juan@email.com,5512345678,1\nMaría,López,,maria@email.com,,2'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'plantilla_invitados.csv'
    a.click()
  }

  function parseGuestCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/).filter(Boolean)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',')
        const row: any = {}
        headers.forEach((h, i) => { row[h] = vals[i]?.trim() ?? '' })
        return row
      }).filter(r => r.nombre && r.email)
      setGuestImportPreview(rows)
    }
    reader.readAsText(file)
    return false
  }

  function openSendModal(guest: any | null, all: boolean) {
    setSendTarget(guest)
    setSendAll(all)
    setSendEmailFlag(true)
    setSendWhatsappFlag(false)
    setSendModalOpen(true)
  }

  function handleSendConfirm() {
    const opts = { sendEmail, sendWhatsapp }
    if (sendAll) {
      sendAllMutation.mutate(opts)
    } else {
      sendInvitationMutation.mutate({ guestId: sendTarget.id, opts })
    }
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
                      <Radio value="REGISTRO">Registro</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {configForm.getFieldValue('mode') === 'REGISTRO' && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
                      En modo Registro, las secciones pueden tener precio $0. Cada boleto captura los datos del asistente.
                    </Text>
                  )}

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

                  <Form.Item name="imageUrl" hidden><Input /></Form.Item>
                  <Form.Item name="mapImageUrl" hidden><Input /></Form.Item>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Imagen del evento</div>
                    {ticketEvent?.imageUrl && (
                      <img src={ticketEvent.imageUrl} alt="Evento" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block' }} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadImageMut.mutate({ field: 'imageUrl', file })
                        e.target.value = ''
                      }}
                      style={{ display: 'none' }}
                      id="ticket-event-image-upload"
                    />
                    <Button icon={<UploadOutlined />} loading={uploadImageMut.isPending} onClick={() => document.getElementById('ticket-event-image-upload')?.click()}>
                      Subir imagen
                    </Button>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 4, fontWeight: 500 }}>Imagen del mapa del venue</div>
                    {ticketEvent?.mapImageUrl && (
                      <img src={ticketEvent.mapImageUrl} alt="Mapa" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block' }} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadImageMut.mutate({ field: 'mapImageUrl', file })
                        e.target.value = ''
                      }}
                      style={{ display: 'none' }}
                      id="ticket-event-map-upload"
                    />
                    <Button icon={<UploadOutlined />} loading={uploadImageMut.isPending} onClick={() => document.getElementById('ticket-event-map-upload')?.click()}>
                      Subir imagen
                    </Button>
                  </div>

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
                  forceRender
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
                  forceRender
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
            children: <VenueMapV2 eventId={eventId} />,
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

          // ── Códigos ─────────────────────────────────────────────────
          {
            key: 'codes',
            label: `Códigos (${codes.length})`,
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setCodesModalOpen(true)}>
                    Generar códigos
                  </Button>
                </div>

                <Table
                  dataSource={codes}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: <Empty description="Sin códigos" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  columns={[
                    {
                      title: 'Código',
                      dataIndex: 'code',
                      render: (v: string) => <strong style={{ fontFamily: 'monospace' }}>{v}</strong>,
                    },
                    {
                      title: 'Usos máximos',
                      dataIndex: 'maxUses',
                      align: 'right' as const,
                    },
                    {
                      title: 'Usado',
                      dataIndex: 'usedCount',
                      align: 'right' as const,
                    },
                    {
                      title: 'Expira',
                      dataIndex: 'expiresAt',
                      render: (v: string | null) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '—',
                    },
                    {
                      title: 'Estado',
                      dataIndex: 'isActive',
                      render: (v: boolean) => (
                        <Tag color={v ? 'green' : 'red'}>
                          {v ? 'Disponible' : 'Revocado'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Acciones',
                      key: 'actions',
                      render: (_: any, r: any) => (
                        <Popconfirm
                          title="¿Revocar este código?"
                          onConfirm={() => revokeCodeMutation.mutate(r.id)}
                          okText="Sí"
                          cancelText="No"
                        >
                          <Button
                            size="small"
                            danger
                            loading={revokeCodeMutation.isPending}
                            disabled={!r.isActive}
                          >
                            Revocar
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />

                {/* Generate codes modal */}
                <Modal
                  title="Generar códigos"
                  open={codesModalOpen}
                  onCancel={() => { setCodesModalOpen(false); codesForm.resetFields() }}
                  onOk={() => {
                    codesForm.validateFields().then(vals => {
                      generateCodesMutation.mutate(vals)
                    })
                  }}
                  confirmLoading={generateCodesMutation.isPending}
                  okText="Generar"
                  width={400}
                  forceRender
                >
                  <Form form={codesForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                      name="count"
                      label="Cantidad de códigos"
                      rules={[{ required: true }]}
                      initialValue={10}
                    >
                      <InputNumber min={1} max={200} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="maxUses"
                      label="Usos máximos por código"
                      rules={[{ required: true }]}
                      initialValue={1}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name="expiresAt"
                      label="Fecha de expiración"
                    >
                      <input type="datetime-local" style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }} />
                    </Form.Item>
                  </Form>
                </Modal>
              </>
            ),
          },

          // ── Invitados ───────────────────────────────────────────────────
          {
            key: 'guests',
            label: `Invitados (${guests.length})`,
            children: (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Button icon={<DownloadOutlined />} onClick={downloadGuestTemplate}>
                    Plantilla CSV
                  </Button>
                  <>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => document.getElementById('guest-csv-input')?.click()}
                    >
                      Importar CSV
                    </Button>
                    <input
                      id="guest-csv-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) { parseGuestCsvFile(e.target.files[0]); e.target.value = '' } }}
                    />
                  </>
                  {guests.length > 0 && (
                    <>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          const { apiClient } = await import('../../api/client')
                          const res = await apiClient.get(ticketEventsApi.exportGuestsUrl(eventId), { responseType: 'blob' })
                          const blob = new Blob([res.data], { type: 'text/csv' })
                          const a = document.createElement('a')
                          a.href = URL.createObjectURL(blob)
                          a.download = 'invitados.csv'
                          a.click()
                        }}
                      >
                        Exportar CSV
                      </Button>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={() => openSendModal(null, true)}
                      >
                        Enviar a todos
                      </Button>
                    </>
                  )}
                </div>

                <Table
                  dataSource={guests}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: <Empty description="Sin invitados. Importa un CSV para comenzar." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                  columns={[
                    {
                      title: 'Nombre',
                      key: 'name',
                      render: (_: any, r: any) => `${r.firstName} ${r.paternalLastName}${r.maternalLastName ? ' ' + r.maternalLastName : ''}`,
                    },
                    { title: 'Email', dataIndex: 'email' },
                    {
                      title: 'Teléfono',
                      dataIndex: 'phone',
                      render: (v: string | null) => v || '—',
                    },
                    {
                      title: 'Boletos',
                      dataIndex: 'ticketCount',
                      align: 'center' as const,
                    },
                    {
                      title: 'Código',
                      key: 'code',
                      render: (_: any, r: any) => (
                        <strong style={{ fontFamily: 'monospace' }}>{r.ticketAccessCode?.code}</strong>
                      ),
                    },
                    {
                      title: 'Usos',
                      key: 'uses',
                      align: 'center' as const,
                      render: (_: any, r: any) =>
                        r.ticketAccessCode ? `${r.ticketAccessCode.usedCount}/${r.ticketAccessCode.maxUses}` : '—',
                    },
                    {
                      title: 'Email enviado',
                      dataIndex: 'emailSentAt',
                      render: (v: string | null) => v
                        ? <Tooltip title={dayjs(v).format('DD/MM/YY HH:mm')}><Tag color="green">Enviado</Tag></Tooltip>
                        : <Tag>Pendiente</Tag>,
                    },
                    {
                      title: 'WhatsApp',
                      dataIndex: 'whatsappSentAt',
                      render: (v: string | null) => v
                        ? <Tooltip title={dayjs(v).format('DD/MM/YY HH:mm')}><Tag color="green">Enviado</Tag></Tooltip>
                        : <Tag>Pendiente</Tag>,
                    },
                    {
                      title: 'Acciones',
                      key: 'actions',
                      render: (_: any, r: any) => (
                        <Space>
                          <Button
                            size="small"
                            icon={<MailOutlined />}
                            onClick={() => openSendModal(r, false)}
                          >
                            Enviar
                          </Button>
                          <Popconfirm
                            title="¿Eliminar este invitado?"
                            onConfirm={() => deleteGuestMutation.mutate(r.id)}
                            okText="Sí"
                            cancelText="No"
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />

                {/* Import preview modal */}
                <Modal
                  open={guestImportPreview !== null}
                  title={`Importar invitados — ${guestImportPreview?.length ?? 0} filas`}
                  onCancel={() => setGuestImportPreview(null)}
                  onOk={() => importGuestsMutation.mutate(guestImportPreview!)}
                  confirmLoading={importGuestsMutation.isPending}
                  okText="Importar"
                  width="min(860px, 95vw)"
                >
                  <Table
                    dataSource={guestImportPreview ?? []}
                    rowKey={(_, i) => String(i)}
                    size="small"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      { title: 'Nombre', dataIndex: 'nombre' },
                      { title: 'Ap. Paterno', dataIndex: 'apellido_paterno' },
                      { title: 'Ap. Materno', dataIndex: 'apellido_materno' },
                      { title: 'Email', dataIndex: 'email' },
                      { title: 'Teléfono', dataIndex: 'telefono' },
                      { title: 'Boletos', dataIndex: 'numero_de_boletos' },
                    ]}
                  />
                </Modal>

                {/* Send invitation modal */}
                <Modal
                  open={sendModalOpen}
                  title={sendAll ? 'Enviar a todos los invitados' : `Enviar invitación — ${sendTarget?.firstName ?? ''}`}
                  onCancel={() => setSendModalOpen(false)}
                  onOk={handleSendConfirm}
                  confirmLoading={sendInvitationMutation.isPending || sendAllMutation.isPending}
                  okText="Enviar"
                  width={360}
                >
                  <div style={{ marginTop: 16 }}>
                    <p style={{ marginBottom: 12 }}>Selecciona cómo enviar la invitación:</p>
                    <Space direction="vertical">
                      <Checkbox checked={sendEmail} onChange={e => setSendEmailFlag(e.target.checked)}>
                        Correo electrónico
                      </Checkbox>
                      <Checkbox checked={sendWhatsapp} onChange={e => setSendWhatsappFlag(e.target.checked)}>
                        WhatsApp
                      </Checkbox>
                    </Space>
                  </div>
                </Modal>
              </>
            ),
          },
        ]}
      />
    </div>
  )
}
