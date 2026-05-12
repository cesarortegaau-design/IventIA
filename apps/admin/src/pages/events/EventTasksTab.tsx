import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Tag, Space, Input, Select, Drawer, Spin, Empty,
  Progress, Avatar, App, Popconfirm, Row, Col, Statistic,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, UserOutlined, ClockCircleOutlined,
  CheckCircleOutlined, SyncOutlined, PauseCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { collabTasksApi } from '../../api/collabTasks'
import { usersApi } from '../../api/users'
import { resourcesApi } from '../../api/resources'
import { TaskFormModal } from '../chat/tareas/TaskFormModal'
import { TaskDetailDrawer } from '../chat/tareas/TaskDetailDrawer'
import { T } from '../../styles/tokens'

// ── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  PENDING:     { color: 'default',    label: 'Pendiente',   icon: <ClockCircleOutlined /> },
  IN_PROGRESS: { color: 'processing', label: 'En Progreso', icon: <SyncOutlined spin /> },
  ON_HOLD:     { color: 'warning',    label: 'En Espera',   icon: <PauseCircleOutlined /> },
  DONE:        { color: 'success',    label: 'Completada',  icon: <CheckCircleOutlined /> },
  CANCELLED:   { color: 'error',      label: 'Cancelada',   icon: <CloseCircleOutlined /> },
}

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOW:      { color: 'default', label: 'Baja' },
  MEDIUM:   { color: 'blue',    label: 'Media' },
  HIGH:     { color: 'orange',  label: 'Alta' },
  CRITICAL: { color: 'red',     label: 'Crítica' },
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))
const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return dayjs(d).format('DD MMM YYYY')
}

// ── Component ────────────────────────────────────────────────────────────────

interface EventTasksTabProps {
  eventId: string
  event?: any
}

export default function EventTasksTab({ eventId, event }: EventTasksTabProps) {
  const qc = useQueryClient()
  const { message } = App.useApp()

  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [filterPriority, setFilterPriority] = useState<string | undefined>()
  const [filterAssignee, setFilterAssignee] = useState<string | undefined>()

  const [showForm, setShowForm]       = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen]   = useState(false)

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: rawTasks, isLoading } = useQuery({
    queryKey: ['event-collab-tasks', eventId],
    queryFn: () => collabTasksApi.list({ eventId }),
    enabled: !!eventId,
  })
  const tasks: any[] = Array.isArray(rawTasks) ? rawTasks : []

  const { data: users = [] } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: async () => {
      const res = await usersApi.listAssignable()
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await resourcesApi.listDepartments()
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  const { data: selectedTask } = useQuery({
    queryKey: ['collab-task', selectedId],
    queryFn: () => collabTasksApi.get(selectedId!),
    enabled: !!selectedId && drawerOpen,
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['event-collab-tasks', eventId] })

  const createMut = useMutation({
    mutationFn: (data: any) => collabTasksApi.create({ ...data, eventId }),
    onSuccess: () => { message.success('Tarea creada'); setShowForm(false); invalidate() },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => collabTasksApi.update(editingTask.id, data),
    onSuccess: () => {
      message.success('Tarea actualizada')
      setShowForm(false)
      setEditingTask(null)
      invalidate()
      if (selectedId) qc.invalidateQueries({ queryKey: ['collab-task', selectedId] })
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => collabTasksApi.delete(id),
    onSuccess: () => {
      message.success('Tarea eliminada')
      setSelectedId(null)
      setDrawerOpen(false)
      invalidate()
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  // ── Filtered tasks ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return (tasks as any[]).filter(t => {
      if (filterStatus && t.status !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterAssignee && t.assignedToId !== filterAssignee) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.title?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tasks, filterStatus, filterPriority, filterAssignee, search])

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = tasks as any[]
    return {
      total:      all.length,
      pending:    all.filter(t => t.status === 'PENDING').length,
      inProgress: all.filter(t => t.status === 'IN_PROGRESS').length,
      done:       all.filter(t => t.status === 'DONE').length,
      overdue:    all.filter(t => t.endDate && new Date(t.endDate) < new Date() && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
    }
  }, [tasks])

  const hasFilters = !!(search || filterStatus || filterPriority || filterAssignee)

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Tarea',
      key: 'title',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: T.navy }}>{r.title}</div>
          {r.description && (
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
              {r.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      width: 130,
      render: (_: any, r: any) => {
        const s = STATUS_CONFIG[r.status] ?? { color: 'default', label: r.status }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: 'Prioridad',
      key: 'priority',
      width: 110,
      render: (_: any, r: any) => {
        const p = PRIORITY_CONFIG[r.priority] ?? { color: 'default', label: r.priority }
        return <Tag color={p.color}>{p.label}</Tag>
      },
    },
    {
      title: 'Progreso',
      key: 'progress',
      width: 120,
      render: (_: any, r: any) => {
        const p = PRIORITY_CONFIG[r.priority]
        return <Progress percent={r.progress ?? 0} size="small" strokeColor={p?.color === 'red' ? '#ef4444' : p?.color === 'orange' ? '#f59e0b' : T.blue} />
      },
    },
    {
      title: 'Asignado a',
      key: 'assignedTo',
      width: 150,
      render: (_: any, r: any) => r.assignedTo ? (
        <Space size={6}>
          <Avatar size={22} icon={<UserOutlined />} style={{ background: T.blue, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: T.text }}>{r.assignedTo.firstName} {r.assignedTo.lastName}</span>
        </Space>
      ) : <span style={{ color: T.textDim, fontSize: 12 }}>—</span>,
    },
    {
      title: 'Vencimiento',
      key: 'endDate',
      width: 120,
      render: (_: any, r: any) => {
        if (!r.endDate) return <span style={{ color: T.textDim }}>—</span>
        const overdue = new Date(r.endDate) < new Date() && r.status !== 'DONE' && r.status !== 'CANCELLED'
        return (
          <span style={{ fontSize: 12, color: overdue ? T.danger : T.textMuted, fontWeight: overdue ? 600 : 400 }}>
            {overdue ? '⚠ ' : ''}{fmtDate(r.endDate)}
          </span>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, r: any) => (
        <Button
          type="link" size="small" style={{ color: T.blue, padding: 0 }}
          onClick={(e) => { e.stopPropagation(); openDetail(r.id) }}
        >
          Ver
        </Button>
      ),
    },
  ]

  // ── Handlers ─────────────────────────────────────────────────────────────
  function openDetail(id: string) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  function handleEdit(task: any) {
    setEditingTask(task)
    setDrawerOpen(false)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    deleteMut.mutate(id)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats row */}
      <Row gutter={12}>
        {[
          { label: 'Total',       value: stats.total,      color: T.navy },
          { label: 'Pendientes',  value: stats.pending,    color: T.textMuted },
          { label: 'En Progreso', value: stats.inProgress, color: T.blue },
          { label: 'Completadas', value: stats.done,       color: T.success },
          { label: 'Vencidas',    value: stats.overdue,    color: stats.overdue > 0 ? T.danger : T.textDim },
        ].map(s => (
          <Col key={s.label} xs={12} sm={8} md={4} style={{ marginBottom: 8 }}>
            <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Toolbar */}
      <div style={{
        background: 'white', borderRadius: 10, padding: '12px 16px',
        border: `1px solid ${T.border}`, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Button
          type="primary" icon={<PlusOutlined />}
          style={{ background: T.navy, borderColor: T.navy }}
          onClick={() => { setEditingTask(null); setShowForm(true) }}
        >
          Nueva tarea
        </Button>

        <Input
          placeholder="Buscar por título o descripción..."
          prefix={<SearchOutlined style={{ color: T.textDim }} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />

        <Select
          placeholder="Estado"
          value={filterStatus}
          onChange={setFilterStatus}
          allowClear
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
        />

        <Select
          placeholder="Prioridad"
          value={filterPriority}
          onChange={setFilterPriority}
          allowClear
          style={{ width: 130 }}
          options={PRIORITY_OPTIONS}
        />

        <Select
          placeholder="Asignado a"
          value={filterAssignee}
          onChange={setFilterAssignee}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 180 }}
          options={(users as any[]).map((u: any) => ({
            value: u.id,
            label: `${u.firstName} ${u.lastName}`,
          }))}
        />

        {hasFilters && (
          <Button type="link" style={{ color: T.blue, padding: 0 }}
            onClick={() => { setSearch(''); setFilterStatus(undefined); setFilterPriority(undefined); setFilterAssignee(undefined) }}>
            Limpiar filtros
          </Button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted }}>
          {filtered.length} tarea{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description={hasFilters ? 'Sin resultados para los filtros aplicados' : 'Sin tareas para este evento'} /> }}
          onRow={r => ({
            onClick: () => openDetail(r.id),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Create / Edit Modal */}
      <TaskFormModal
        open={showForm}
        task={editingTask}
        onCancel={() => { setShowForm(false); setEditingTask(null) }}
        onSubmit={(values: any) => editingTask ? updateMut.mutate(values) : createMut.mutate(values)}
        isLoading={editingTask ? updateMut.isPending : createMut.isPending}
        users={users}
        departments={departments}
        events={[]}
        clients={[]}
        orders={[]}
        initialEventId={eventId}
        hideEventField
      />

      {/* Detail Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedId(null) }}
        width={640}
        title={null}
        styles={{ body: { padding: 0 } }}
      >
        {drawerOpen && (
          selectedTask ? (
            <TaskDetailDrawer
              task={selectedTask}
              isLoading={false}
              statusConfig={STATUS_CONFIG}
              priorityConfig={PRIORITY_CONFIG}
              isEventActivity={false}
              onEdit={() => handleEdit(selectedTask)}
              onDelete={() => handleDelete(selectedId!)}
              isDeletingis={deleteMut.isPending}
            />
          ) : (
            <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
          )
        )}
      </Drawer>
    </div>
  )
}
