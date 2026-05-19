import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tag, Button, Typography, Tabs, App, Spin, Alert, Space, Row, Col, Card,
  Form, Input, InputNumber, DatePicker, TimePicker, Table, Modal, Popconfirm,
  Upload, Select, Avatar, Progress,
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  FileExcelOutlined, UploadOutlined, LinkOutlined, SaveOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ThunderboltOutlined,
  FilePdfOutlined, FileImageOutlined, PlaySquareOutlined,
  RobotOutlined, BulbOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd'
import { eventsApi } from '../../api/events'
import { aiApi } from '../../api/ai'
import { Stage, Layer, Rect, Circle, Text as KonvaText, Transformer } from 'react-konva'

const { Title, Text, Paragraph } = Typography

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  QUOTED:       { color: '#F97316', label: 'Cotizado' },
  CONFIRMED:    { color: '#7C3AED', label: 'Confirmado' },
  IN_EXECUTION: { color: '#0D9488', label: 'En ejecución' },
  CLOSED:       { color: '#6B7280', label: 'Cerrado' },
  CANCELLED:    { color: '#DC2626', label: 'Cancelado' },
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Excel export helper ───────────────────────────────────────────────────────
async function exportToExcel(
  rows: any[],
  columns: { header: string; key: string }[],
  filename: string
) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Datos')
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 24 }))
  rows.forEach((r) => ws.addRow(r))
  ws.getRow(1).font = { bold: true }
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────
function TimelineTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['planner-activities', eventId],
    queryFn: () => eventsApi.getActivities(eventId),
  })
  const activities: any[] = data?.data || []

  const createMutation = useMutation({
    mutationFn: (d: any) => eventsApi.createActivity(eventId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-activities', eventId] })
      message.success('Actividad agregada')
      setModalOpen(false)
      form.resetFields()
    },
    onError: () => message.error('Error al guardar'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      eventsApi.updateActivity(eventId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-activities', eventId] })
      message.success('Actividad actualizada')
      setModalOpen(false)
      setEditing(null)
    },
    onError: () => message.error('Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.deleteActivity(eventId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-activities', eventId] })
      message.success('Actividad eliminada')
    },
  })

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (row: any) => {
    setEditing(row)
    form.setFieldsValue({
      name: row.name,
      date: row.date ? dayjs(row.date) : undefined,
      time: row.time ? dayjs(`2000-01-01T${row.time}`) : undefined,
      notes: row.notes,
    })
    setModalOpen(true)
  }

  const onFinish = (vals: any) => {
    const payload = {
      name: vals.name,
      date: vals.date ? vals.date.format('YYYY-MM-DD') : undefined,
      time: vals.time ? vals.time.format('HH:mm') : undefined,
      notes: vals.notes,
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const columns = [
    { title: 'Actividad', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Fecha', dataIndex: 'date', key: 'date', width: 120, render: (v: string) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
    { title: 'Hora', dataIndex: 'time', key: 'time', width: 90, render: (v: string) => v || '—' },
    { title: 'Notas', dataIndex: 'notes', key: 'notes', render: (v: string) => v || '—' },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, row: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="¿Eliminar?" onConfirm={() => deleteMutation.mutate(row.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>Timeline del evento</Text>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() =>
              exportToExcel(
                activities.map((a) => ({
                  name: a.name,
                  date: a.date ? dayjs(a.date).format('DD/MM/YYYY') : '',
                  time: a.time || '',
                  notes: a.notes || '',
                })),
                [
                  { header: 'Actividad', key: 'name' },
                  { header: 'Fecha', key: 'date' },
                  { header: 'Hora', key: 'time' },
                  { header: 'Notas', key: 'notes' },
                ],
                'timeline.xlsx'
              )
            }
          >
            Exportar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}
            style={{ background: 'var(--pl-primary)', border: 'none' }}>
            Agregar actividad
          </Button>
        </Space>
      </div>

      <Table
        dataSource={activities}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={false}
      />

      <Modal
        title={editing ? 'Editar actividad' : 'Nueva actividad'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
        onOk={() => form.submit()}
        okText="Guardar"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre de la actividad" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Fecha">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time" label="Hora">
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} placeholder="Notas adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Budget Tab ────────────────────────────────────────────────────────────────
function BudgetTab({ eventId, event }: { eventId: string; event: any }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['planner-budgets', eventId],
    queryFn: () => eventsApi.getBudgets(eventId),
  })
  const budgets: any[] = data?.data || []

  const createMutation = useMutation({
    mutationFn: (d: any) => eventsApi.createBudget(eventId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-budgets', eventId] })
      message.success('Partida agregada')
      setModalOpen(false)
      form.resetFields()
    },
    onError: () => message.error('Error al guardar'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      eventsApi.updateBudget(eventId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-budgets', eventId] })
      message.success('Partida actualizada')
      setModalOpen(false)
      setEditing(null)
    },
    onError: () => message.error('Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.deleteBudget(eventId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-budgets', eventId] })
      message.success('Partida eliminada')
    },
  })

  const total = budgets.reduce((s, b) => s + (b.amount || 0), 0)

  const groups = [...new Set(budgets.map((b) => b.group || 'General'))]

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (row: any) => {
    setEditing(row)
    form.setFieldsValue({
      group: row.group,
      concept: row.concept,
      amount: row.amount,
      notes: row.notes,
    })
    setModalOpen(true)
  }

  const onFinish = (vals: any) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: vals })
    } else {
      createMutation.mutate(vals)
    }
  }

  const handleAi = async () => {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await aiApi.generateBudget({
        eventName: event?.name || '',
        eventType: event?.eventType || '',
        guestCount: event?.expectedAttendees,
        notes: event?.description,
      })
      setAiResult(res.data?.result || res.result || JSON.stringify(res))
    } catch {
      message.error('Error al generar presupuesto con IA')
    } finally {
      setAiLoading(false)
    }
  }

  const columns = [
    { title: 'Grupo', dataIndex: 'group', key: 'group', width: 140, render: (v: string) => v || 'General' },
    { title: 'Concepto', dataIndex: 'concept', key: 'concept', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Monto', dataIndex: 'amount', key: 'amount', width: 140, render: (v: number) => <Text style={{ color: '#7C3AED', fontWeight: 700 }}>{fmt(v || 0)}</Text> },
    { title: 'Notas', dataIndex: 'notes', key: 'notes', render: (v: string) => v || '—' },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, row: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="¿Eliminar?" onConfirm={() => deleteMutation.mutate(row.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* Totals */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, borderLeft: '4px solid #7C3AED', background: '#F5F3FF' }}>
            <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>Total presupuesto</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>{fmt(total)}</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, borderLeft: '4px solid #0D9488', background: '#F0FDFA' }}>
            <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>Partidas</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488' }}>{budgets.length}</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, borderLeft: '4px solid #F97316', background: '#FFF7ED' }}>
            <Text style={{ fontSize: 12, color: 'var(--pl-text-secondary)' }}>Grupos</Text>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#F97316' }}>{groups.length}</div>
          </Card>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>Partidas presupuestales</Text>
        <Space>
          <Button
            icon={<RobotOutlined />}
            loading={aiLoading}
            onClick={handleAi}
            style={{ borderColor: '#EC4899', color: '#EC4899' }}
          >
            IA: Sugerir presupuesto
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={() =>
              exportToExcel(
                budgets.map((b) => ({
                  group: b.group || 'General',
                  concept: b.concept,
                  amount: b.amount || 0,
                  notes: b.notes || '',
                })),
                [
                  { header: 'Grupo', key: 'group' },
                  { header: 'Concepto', key: 'concept' },
                  { header: 'Monto', key: 'amount' },
                  { header: 'Notas', key: 'notes' },
                ],
                'presupuesto.xlsx'
              )
            }
          >
            Exportar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}
            style={{ background: 'var(--pl-primary)', border: 'none' }}>
            Agregar partida
          </Button>
        </Space>
      </div>

      {aiResult && (
        <Card style={{ marginBottom: 16, borderRadius: 12, background: '#FDF2F8', border: '1px solid #FBCFE8' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <RobotOutlined style={{ color: '#EC4899', fontSize: 16 }} />
            <Text strong style={{ color: '#EC4899' }}>Sugerencia de IA</Text>
          </div>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{aiResult}</Paragraph>
        </Card>
      )}

      <Table
        dataSource={budgets}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={false}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: '#F5F3FF' }}>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <Text strong style={{ color: '#7C3AED' }}>{fmt(total)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      <Modal
        title={editing ? 'Editar partida' : 'Nueva partida'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
        onOk={() => form.submit()}
        okText="Guardar"
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="group" label="Grupo">
            <Input placeholder="Ej: Logística, Decoración, Catering..." />
          </Form.Item>
          <Form.Item name="concept" label="Concepto" rules={[{ required: true }]}>
            <Input placeholder="Descripción del gasto" />
          </Form.Item>
          <Form.Item name="amount" label="Monto" rules={[{ required: true }]}>
            <InputNumber
              prefix="$"
              style={{ width: '100%' }}
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: '#F97316',
  IN_PROGRESS: '#7C3AED',
  DONE: '#059669',
  CANCELLED: '#6B7280',
}
const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completada',
  CANCELLED: 'Cancelada',
}

function TasksTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['planner-tasks', eventId],
    queryFn: () => eventsApi.getCollabTasks(eventId),
  })
  const tasks: any[] = data?.data || []

  const done = tasks.filter((t) => t.status === 'DONE').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const columns = [
    { title: 'Tarea', dataIndex: 'title', key: 'title', render: (v: string) => <Text strong>{v}</Text> },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => (
        <Tag style={{ background: (TASK_STATUS_COLORS[v] || '#6B7280') + '18', color: TASK_STATUS_COLORS[v] || '#6B7280', border: 'none', borderRadius: 20, fontWeight: 600 }}>
          {TASK_STATUS_LABELS[v] || v}
        </Tag>
      ),
    },
    {
      title: 'Asignado a',
      dataIndex: 'assignedUser',
      key: 'assignedUser',
      width: 160,
      render: (u: any) =>
        u ? (
          <Space size={6}>
            <Avatar size={20} style={{ background: '#7C3AED20', color: '#7C3AED', fontSize: 10 }}>
              {u.firstName?.[0]}{u.lastName?.[0]}
            </Avatar>
            <Text style={{ fontSize: 12 }}>{u.firstName} {u.lastName}</Text>
          </Space>
        ) : '—',
    },
    {
      title: 'Vence',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (v: string) => {
        if (!v) return '—'
        const overdue = dayjs(v).isBefore(dayjs(), 'day')
        return <Text style={{ color: overdue ? '#DC2626' : 'inherit' }}>{dayjs(v).format('DD MMM YYYY')}</Text>
      },
    },
    { title: 'Prioridad', dataIndex: 'priority', key: 'priority', width: 100,
      render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <Text strong style={{ fontSize: 16 }}>Tareas del evento</Text>
            <Text style={{ color: 'var(--pl-text-secondary)' }}>({done}/{tasks.length} completadas)</Text>
          </Space>
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() =>
                exportToExcel(
                  tasks.map((t) => ({
                    title: t.title,
                    status: TASK_STATUS_LABELS[t.status] || t.status,
                    assignedTo: t.assignedUser ? `${t.assignedUser.firstName} ${t.assignedUser.lastName}` : '',
                    dueDate: t.dueDate ? dayjs(t.dueDate).format('DD/MM/YYYY') : '',
                    priority: t.priority || '',
                  })),
                  [
                    { header: 'Tarea', key: 'title' },
                    { header: 'Estado', key: 'status' },
                    { header: 'Asignado a', key: 'assignedTo' },
                    { header: 'Fecha límite', key: 'dueDate' },
                    { header: 'Prioridad', key: 'priority' },
                  ],
                  'tareas.xlsx'
                )
              }
            >
              Exportar
            </Button>
          </Space>
        </div>
        {tasks.length > 0 && (
          <Progress
            percent={pct}
            strokeColor={{ '0%': '#7C3AED', '100%': '#EC4899' }}
            style={{ marginBottom: 4 }}
          />
        )}
      </div>
      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={false}
      />
    </div>
  )
}

// ── Media Tab ─────────────────────────────────────────────────────────────────
function MediaTab({ eventId, event }: { eventId: string; event: any }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [videoLink, setVideoLink] = useState('')

  const handleImageUpload = async (file: File) => {
    try {
      await eventsApi.uploadDocument(eventId, file, 'IMAGE')
      qc.invalidateQueries({ queryKey: ['planner-event', eventId] })
      message.success('Imagen subida')
    } catch {
      message.error('Error al subir imagen')
    }
    return false
  }

  const handlePdfUpload = async (file: File) => {
    try {
      await eventsApi.uploadDocument(eventId, file, 'PDF')
      qc.invalidateQueries({ queryKey: ['planner-event', eventId] })
      message.success('PDF subido')
    } catch {
      message.error('Error al subir PDF')
    }
    return false
  }

  const deleteDoc = async (docId: string) => {
    try {
      await eventsApi.deleteDocument(eventId, docId)
      qc.invalidateQueries({ queryKey: ['planner-event', eventId] })
      message.success('Documento eliminado')
    } catch {
      message.error('Error al eliminar')
    }
  }

  const docs: any[] = event?.documents || []
  const images = docs.filter((d) => d.documentType === 'IMAGE' || d.mimeType?.startsWith('image/'))
  const pdfs = docs.filter((d) => d.documentType === 'PDF' || d.mimeType === 'application/pdf')
  const videos: string[] = event?.videoLinks || []

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* Images */}
        <Col xs={24} md={12}>
          <Card
            title={<Space><FileImageOutlined style={{ color: '#EC4899' }} /><span>Imágenes</span></Space>}
            style={{ borderRadius: 16 }}
          >
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleImageUpload}
              multiple
            >
              <Button icon={<UploadOutlined />} style={{ marginBottom: 16, width: '100%' }}>
                Subir imágenes
              </Button>
            </Upload>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {images.map((img) => (
                <div key={img.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                  <img
                    src={img.url || `/uploads/${img.filename}`}
                    alt={img.originalName}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.5)', borderRadius: 4,
                  }}>
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      type="text"
                      style={{ color: '#fff', padding: '2px 4px' }}
                      onClick={() => deleteDoc(img.id)}
                    />
                  </div>
                </div>
              ))}
              {images.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: 'var(--pl-text-muted)' }}>
                  Sin imágenes
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* PDFs */}
        <Col xs={24} md={12}>
          <Card
            title={<Space><FilePdfOutlined style={{ color: '#F97316' }} /><span>Documentos PDF</span></Space>}
            style={{ borderRadius: 16 }}
          >
            <Upload
              accept=".pdf"
              showUploadList={false}
              beforeUpload={handlePdfUpload}
              multiple
            >
              <Button icon={<UploadOutlined />} style={{ marginBottom: 16, width: '100%' }}>
                Subir PDFs
              </Button>
            </Upload>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#FFF7ED',
                    borderRadius: 8,
                    border: '1px solid #FED7AA',
                  }}
                >
                  <Space>
                    <FilePdfOutlined style={{ color: '#F97316' }} />
                    <a href={pdf.url || `/uploads/${pdf.filename}`} target="_blank" rel="noreferrer">
                      <Text style={{ fontSize: 13 }}>{pdf.originalName || pdf.filename}</Text>
                    </a>
                  </Space>
                  <Popconfirm title="¿Eliminar?" onConfirm={() => deleteDoc(pdf.id)}>
                    <Button size="small" icon={<DeleteOutlined />} danger type="text" />
                  </Popconfirm>
                </div>
              ))}
              {pdfs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--pl-text-muted)' }}>
                  Sin documentos PDF
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Video links */}
        <Col xs={24}>
          <Card
            title={<Space><PlaySquareOutlined style={{ color: '#7C3AED' }} /><span>Videos (YouTube / TikTok)</span></Space>}
            style={{ borderRadius: 16 }}
          >
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input
                prefix={<LinkOutlined />}
                placeholder="https://youtube.com/..."
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
              />
              <Button
                type="primary"
                style={{ background: 'var(--pl-primary)', border: 'none' }}
                onClick={() => {
                  if (videoLink.trim()) {
                    message.info('Funcionalidad de video links disponible próximamente')
                    setVideoLink('')
                  }
                }}
              >
                Agregar
              </Button>
            </Space.Compact>
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--pl-text-muted)' }}>
              {videos.length === 0 ? 'Sin videos vinculados' : `${videos.length} video(s)`}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

// ── Map / Canvas Tab ──────────────────────────────────────────────────────────
const CANVAS_OBJECTS = [
  { id: 'table-round', label: 'Mesa redonda', type: 'circle', color: '#7C3AED' },
  { id: 'table-rect', label: 'Mesa rectangular', type: 'rect', color: '#EC4899' },
  { id: 'stage', label: 'Escenario', type: 'rect-wide', color: '#F97316' },
  { id: 'chair', label: 'Silla', type: 'small-circle', color: '#0D9488' },
]

function MapTab() {
  const [objects, setObjects] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const addObject = (template: any) => {
    const id = `${template.id}-${Date.now()}`
    const newObj = {
      id,
      type: template.type,
      color: template.color,
      label: template.label,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: template.type === 'rect-wide' ? 160 : template.type === 'rect' ? 100 : 60,
      height: template.type === 'rect-wide' ? 60 : template.type === 'rect' ? 70 : 60,
      radius: template.type === 'circle' ? 35 : template.type === 'small-circle' ? 12 : 0,
    }
    setObjects((prev) => [...prev, newObj])
  }

  const removeSelected = () => {
    if (selectedId) {
      setObjects((prev) => prev.filter((o) => o.id !== selectedId))
      setSelectedId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Text strong style={{ fontSize: 16, alignSelf: 'center' }}>Mapa del evento</Text>
        {CANVAS_OBJECTS.map((tmpl) => (
          <Button
            key={tmpl.id}
            size="small"
            onClick={() => addObject(tmpl)}
            style={{ borderColor: tmpl.color, color: tmpl.color }}
          >
            + {tmpl.label}
          </Button>
        ))}
        {selectedId && (
          <Button size="small" danger icon={<DeleteOutlined />} onClick={removeSelected}>
            Eliminar seleccionado
          </Button>
        )}
      </div>

      <div
        style={{
          background: '#F1F0FF',
          border: '2px dashed #DDD6FE',
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Stage
          width={900}
          height={600}
          onClick={(e) => {
            if (e.target === e.target.getStage()) setSelectedId(null)
          }}
          style={{ maxWidth: '100%' }}
        >
          <Layer>
            {objects.map((obj) => {
              const isSelected = obj.id === selectedId
              const common = {
                key: obj.id,
                fill: obj.color + '40',
                stroke: obj.color,
                strokeWidth: isSelected ? 2 : 1,
                draggable: true,
                onClick: () => setSelectedId(obj.id),
                onDragEnd: (e: any) => {
                  setObjects((prev) =>
                    prev.map((o) =>
                      o.id === obj.id ? { ...o, x: e.target.x(), y: e.target.y() } : o
                    )
                  )
                },
              }

              if (obj.type === 'circle' || obj.type === 'small-circle') {
                return (
                  <>
                    <Circle {...common} x={obj.x} y={obj.y} radius={obj.radius} />
                    <KonvaText
                      x={obj.x - 30}
                      y={obj.y - 6}
                      text={obj.label}
                      fontSize={9}
                      fill={obj.color}
                      listening={false}
                    />
                  </>
                )
              }
              return (
                <>
                  <Rect {...common} x={obj.x} y={obj.y} width={obj.width} height={obj.height} cornerRadius={6} />
                  <KonvaText
                    x={obj.x + 4}
                    y={obj.y + obj.height / 2 - 6}
                    text={obj.label}
                    fontSize={10}
                    fill={obj.color}
                    listening={false}
                  />
                </>
              )
            })}
          </Layer>
        </Stage>

        {objects.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{ textAlign: 'center', color: 'var(--pl-text-muted)' }}>
              <BulbOutlined style={{ fontSize: 40, color: '#DDD6FE', marginBottom: 8 }} />
              <div>Agrega elementos al mapa usando los botones de arriba</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Event Info Tab ────────────────────────────────────────────────────────────
function EventInfoTab({ event, eventId }: { event: any; eventId: string }) {
  const qc = useQueryClient()
  const { message } = App.useApp()
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  const updateMutation = useMutation({
    mutationFn: (data: any) => eventsApi.update(eventId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planner-event', eventId] })
      message.success('Evento actualizado')
      setEditing(false)
    },
    onError: () => message.error('Error al actualizar'),
  })

  const startEditing = () => {
    form.setFieldsValue({
      name: event.name,
      description: event.description,
      venueLocation: event.venueLocation,
      expectedAttendees: event.expectedAttendees,
      eventStart: event.eventStart ? dayjs(event.eventStart) : undefined,
      eventEnd: event.eventEnd ? dayjs(event.eventEnd) : undefined,
    })
    setEditing(true)
  }

  if (editing) {
    return (
      <Card style={{ borderRadius: 16 }}>
        <Form form={form} layout="vertical" onFinish={(vals) => {
          updateMutation.mutate({
            ...vals,
            eventStart: vals.eventStart?.toISOString(),
            eventEnd: vals.eventEnd?.toISOString(),
          })
        }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Nombre del evento" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Descripción">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="venueLocation" label="Lugar / Sede">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedAttendees" label="Asistentes esperados">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="eventStart" label="Inicio del evento">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="eventEnd" label="Fin del evento">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending}
              style={{ background: 'var(--pl-primary)', border: 'none' }}>
              Guardar
            </Button>
            <Button onClick={() => setEditing(false)}>Cancelar</Button>
          </Space>
        </Form>
      </Card>
    )
  }

  const fields = [
    { label: 'Nombre', value: event.name },
    { label: 'Código', value: event.code },
    { label: 'Estado', value: STATUS_CONFIG[event.status]?.label || event.status },
    { label: 'Descripción', value: event.description || '—' },
    { label: 'Lugar / Sede', value: event.venueLocation || '—' },
    { label: 'Asistentes esperados', value: event.expectedAttendees?.toString() || '—' },
    { label: 'Inicio', value: event.eventStart ? dayjs(event.eventStart).format('DD/MM/YYYY HH:mm') : '—' },
    { label: 'Fin', value: event.eventEnd ? dayjs(event.eventEnd).format('DD/MM/YYYY HH:mm') : '—' },
    { label: 'Cliente', value: event.primaryClient ? (event.primaryClient.companyName || `${event.primaryClient.firstName} ${event.primaryClient.lastName}`) : '—' },
  ]

  return (
    <Card
      style={{ borderRadius: 16 }}
      extra={
        <Button icon={<EditOutlined />} onClick={startEditing}>
          Editar
        </Button>
      }
      title="Información general"
    >
      <Row gutter={[16, 12]}>
        {fields.map((f) => (
          <Col xs={24} sm={12} key={f.label}>
            <div>
              <Text style={{ fontSize: 11, color: 'var(--pl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {f.label}
              </Text>
              <div style={{ fontWeight: 500, marginTop: 2 }}>{f.value}</div>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  )
}

// ── Flujos Tab ────────────────────────────────────────────────────────────────
function FlujosTab({ eventId }: { eventId: string }) {
  const { data } = useQuery({
    queryKey: ['planner-tasks', eventId],
    queryFn: () => eventsApi.getCollabTasks(eventId),
  })
  const tasks: any[] = data?.data || []

  const byStatus = {
    PENDING: tasks.filter((t) => t.status === 'PENDING'),
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter((t) => t.status === 'DONE'),
  }

  const columns = [
    { key: 'PENDING', label: 'Pendiente', color: '#F97316', bg: '#FFF7ED' },
    { key: 'IN_PROGRESS', label: 'En progreso', color: '#7C3AED', bg: '#F5F3FF' },
    { key: 'DONE', label: 'Completado', color: '#059669', bg: '#F0FDF4' },
  ]

  return (
    <div>
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>
        Flujo de trabajo (Kanban)
      </Text>
      <Row gutter={[16, 16]}>
        {columns.map((col) => (
          <Col xs={24} md={8} key={col.key}>
            <div
              style={{
                background: col.bg,
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${col.color}30`,
                minHeight: 300,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                <Text strong style={{ color: col.color }}>{col.label}</Text>
                <Tag style={{ marginLeft: 'auto', background: col.color + '20', color: col.color, border: 'none', borderRadius: 20 }}>
                  {byStatus[col.key as keyof typeof byStatus]?.length || 0}
                </Tag>
              </div>
              {(byStatus[col.key as keyof typeof byStatus] || []).map((task: any) => (
                <Card
                  key={task.id}
                  style={{
                    borderRadius: 10,
                    marginBottom: 8,
                    border: `1px solid ${col.color}20`,
                    boxShadow: 'none',
                  }}
                  styles={{ body: { padding: '10px 12px' } }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>{task.title}</Text>
                  {task.dueDate && (
                    <div style={{ fontSize: 11, color: 'var(--pl-text-muted)', marginTop: 4 }}>
                      Vence: {dayjs(task.dueDate).format('DD MMM')}
                    </div>
                  )}
                </Card>
              ))}
              {(byStatus[col.key as keyof typeof byStatus] || []).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--pl-text-muted)', padding: 24, fontSize: 13 }}>
                  Sin tareas
                </div>
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}

// ── Main EventDetailPage ──────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('info')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['planner-event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  })

  const event = data?.data

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (isError || !event) {
    return (
      <Alert
        type="error"
        message="No se pudo cargar el evento"
        action={<Button onClick={() => navigate('/eventos')}>Volver</Button>}
      />
    )
  }

  const statusCfg = STATUS_CONFIG[event.status] || { color: '#6B7280', label: event.status }

  const tabs = [
    { key: 'info',       label: 'Evento',      children: <EventInfoTab event={event} eventId={id!} /> },
    { key: 'timeline',   label: 'Timeline',    children: <TimelineTab eventId={id!} /> },
    { key: 'tareas',     label: 'Tareas',      children: <TasksTab eventId={id!} /> },
    { key: 'flujos',     label: 'Flujos',      children: <FlujosTab eventId={id!} /> },
    { key: 'presupuesto',label: 'Presupuesto', children: <BudgetTab eventId={id!} event={event} /> },
    { key: 'medios',     label: 'Medios',      children: <MediaTab eventId={id!} event={event} /> },
    { key: 'mapa',       label: 'Mapa',        children: <MapTab /> },
  ]

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/eventos')}
          style={{ marginTop: 4 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
              {event.name}
            </Title>
            <Tag
              style={{
                background: statusCfg.color + '18',
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color}40`,
                borderRadius: 20,
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {statusCfg.label}
            </Tag>
            <Text style={{ color: 'var(--pl-text-muted)', fontSize: 12 }}>#{event.code}</Text>
          </div>
          {event.eventStart && (
            <Text style={{ color: 'var(--pl-text-secondary)', fontSize: 13 }}>
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              {dayjs(event.eventStart).format('D [de] MMMM YYYY')}
              {event.eventEnd && ` → ${dayjs(event.eventEnd).format('D [de] MMMM YYYY')}`}
            </Text>
          )}
        </div>
        <Button
          icon={<EditOutlined />}
          onClick={() => navigate(`/eventos/${id}/editar`)}
        >
          Editar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabs}
        tabPosition="top"
        style={{ background: '#fff', borderRadius: 16, padding: '0 16px 16px', boxShadow: 'var(--pl-shadow)' }}
      />
    </div>
  )
}
