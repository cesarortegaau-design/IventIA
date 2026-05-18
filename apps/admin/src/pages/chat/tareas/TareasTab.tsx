import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout, Select, Input, Button, Empty, Spin, Space, Tag, message as antMessage } from 'antd'
import { PlusOutlined, UserOutlined, FireOutlined, TeamOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { collabTasksApi } from '../../../api/collabTasks'
import { eventActivitiesApi } from '../../../api/eventActivities'
import { usersApi } from '../../../api/users'
import { eventsApi } from '../../../api/events'
import { clientsApi } from '../../../api/clients'
import { ordersApi } from '../../../api/orders'
import { resourcesApi } from '../../../api/resources'
import { useAuthStore } from '../../../stores/authStore'
import { TaskListPanel } from './TaskListPanel'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { TaskFormModal } from './TaskFormModal'
import { EventActivityFormModal } from './EventActivityFormModal'
import { T } from '../../../styles/tokens'

const STATUS_CONFIG = {
  PENDING:     { color: 'default',    label: 'Pendiente' },
  IN_PROGRESS: { color: 'processing', label: 'En Progreso' },
  ON_HOLD:     { color: 'warning',    label: 'En Espera' },
  DONE:        { color: 'success',    label: 'Completada' },
  CANCELLED:   { color: 'error',      label: 'Cancelada' },
}

const PRIORITY_CONFIG = {
  LOW:      { color: 'default', label: 'Baja' },
  MEDIUM:   { color: 'blue',    label: 'Media' },
  HIGH:     { color: 'orange',  label: 'Alta' },
  CRITICAL: { color: 'red',     label: 'Crítica' },
}

const { Sider, Content } = Layout

const PRIORITY_BAR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#3b82f6',
  LOW:      '#94a3b8',
}

function MyTasksOverview({
  myPendingTasks,
  onSelectTask,
  onCreateTask,
}: {
  myPendingTasks: any[]
  onSelectTask: (id: string) => void
  onCreateTask: () => void
}) {
  if (myPendingTasks.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#94a3b8' }}>
        <CheckCircleOutlined style={{ fontSize: 52, color: '#10b981' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 4 }}>¡Todo al día!</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>No tienes tareas pendientes asignadas.</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateTask} style={{ background: T.navy, borderColor: T.navy }}>
          Nueva Tarea
        </Button>
      </div>
    )
  }

  const overdue = myPendingTasks.filter(t => {
    if (!t.endDate) return false
    return new Date(t.endDate).getTime() < Date.now()
  })
  const dueToday = myPendingTasks.filter(t => {
    if (!t.endDate) return false
    const days = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 864e5)
    return days === 0
  })
  const upcoming = myPendingTasks.filter(t => {
    if (!t.endDate) return false
    const days = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 864e5)
    return days >= 1 && days <= 7
  })
  const rest = myPendingTasks.filter(t => {
    if (!t.endDate) return true
    const days = Math.ceil((new Date(t.endDate).getTime() - Date.now()) / 864e5)
    return days > 7
  })

  const TaskRow = ({ task }: { task: any }) => {
    const barColor = PRIORITY_BAR[task.priority] ?? '#94a3b8'
    const eventName = task.event?.name
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectTask(task.id)}
        onKeyDown={e => e.key === 'Enter' && onSelectTask(task.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e8f0fe',
          borderLeft: `4px solid ${barColor}`,
          cursor: 'pointer',
          marginBottom: 8,
          transition: 'box-shadow 0.12s, transform 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(30,60,120,0.10)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {eventName && (
              <span style={{ fontSize: 11, color: '#64748b' }}>{eventName.length > 25 ? eventName.slice(0, 25) + '…' : eventName}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <Tag
            color={task.priority === 'CRITICAL' ? 'red' : task.priority === 'HIGH' ? 'orange' : task.priority === 'MEDIUM' ? 'blue' : 'default'}
            style={{ fontSize: 10, margin: 0 }}
          >
            {task.priority === 'CRITICAL' ? 'Crítica' : task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
          </Tag>
          {task.endDate && (() => {
            const days = Math.ceil((new Date(task.endDate).getTime() - Date.now()) / 864e5)
            if (days < 0) return <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: 4 }}>{Math.abs(days)}d vencida</span>
            if (days === 0) return <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', background: '#fff7ed', padding: '2px 6px', borderRadius: 4 }}>Hoy</span>
            if (days === 1) return <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#fffbeb', padding: '2px 6px', borderRadius: 4 }}>Mañana</span>
            return <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{days}d</span>
          })()}
        </div>
      </div>
    )
  }

  const Section = ({ label, tasks, icon, color }: { label: string; tasks: any[]; icon: React.ReactNode; color: string }) => {
    if (tasks.length === 0) return null
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color, fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: color, borderRadius: 10, padding: '1px 8px', lineHeight: '18px' }}>
            {tasks.length}
          </span>
        </div>
        {tasks.map(t => <TaskRow key={t.id} task={t} />)}
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <UserOutlined style={{ fontSize: 20, color: T.navy }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: T.navy }}>Mis Tareas Pendientes</span>
          </div>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {myPendingTasks.length} tarea{myPendingTasks.length !== 1 ? 's' : ''} asignada{myPendingTasks.length !== 1 ? 's' : ''} a ti
          </span>
        </div>
        <Button icon={<PlusOutlined />} onClick={onCreateTask} style={{ borderColor: T.navy, color: T.navy }}>
          Nueva Tarea
        </Button>
      </div>

      <Section label="Vencidas" tasks={overdue} icon={<ExclamationCircleOutlined />} color="#ef4444" />
      <Section label="Vencen hoy" tasks={dueToday} icon={<ClockCircleOutlined />} color="#f97316" />
      <Section label="Esta semana" tasks={upcoming} icon={<ClockCircleOutlined />} color="#f59e0b" />
      <Section label="Próximas" tasks={rest} icon={<CheckCircleOutlined />} color="#3b82f6" />
    </div>
  )
}

export function TareasTab({ initialTaskId }: { initialTaskId?: string | null }) {
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const currentUserId = currentUser?.id ?? ''

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'urgent'>('mine')
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
    search: '',
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['collab-tasks', filters],
    queryFn: () => collabTasksApi.list(filters),
  })

  const { data: eventActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['my-event-activities'],
    queryFn: () => collabTasksApi.listMyEventActivities(),
  })

  // Load reference data
  const { data: users = [] } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: async () => {
      const res = await usersApi.listAssignable()
      return Array.isArray(res) ? res : res?.data || []
    },
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => {
      const res = await eventsApi.list({ pageSize: 1000 })
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    },
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const res = await clientsApi.list({ pageSize: 1000 })
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    },
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const res = await resourcesApi.listDepartments()
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
    },
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-list'],
    queryFn: async () => {
      const res = await ordersApi.report({ pageSize: 1000 })
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
    },
  })

  const isLoading = tasksLoading || activitiesLoading

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const isAssignedToMe = (item: any) => {
    if (item.assignedTo?.id === currentUserId) return true
    if (item.assignees?.some((a: any) => a.userId === currentUserId || a.user?.id === currentUserId)) return true
    return false
  }

  const isUrgent = (item: any) => {
    if (item.status === 'DONE' || item.status === 'CANCELLED') return false
    if (!item.endDate) return false
    const days = Math.ceil((new Date(item.endDate).getTime() - Date.now()) / 864e5)
    return days <= 1
  }

  const mergedTasks = useMemo(() => {
    const collabItems = (tasks as any[]).map(t => ({ ...t, _type: 'collab_task' }))
    const activityItems = (eventActivities as any[]).map(a => ({ ...a, _type: 'event_activity' }))
    const all = [...collabItems, ...activityItems]

    return all.filter(item => {
      if (filters.status && item.status !== filters.status) return false
      if (filters.priority && item.priority !== filters.priority) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!item.title?.toLowerCase().includes(q)) return false
      }
      if (viewFilter === 'mine' && !isAssignedToMe(item)) return false
      if (viewFilter === 'urgent' && !isUrgent(item)) return false
      return true
    })
  }, [tasks, eventActivities, filters, viewFilter, currentUserId])

  // Counts for view filter badges
  const allTasks = useMemo(() => {
    const collabItems = (tasks as any[]).map(t => ({ ...t, _type: 'collab_task' }))
    const activityItems = (eventActivities as any[]).map(a => ({ ...a, _type: 'event_activity' }))
    return [...collabItems, ...activityItems]
  }, [tasks, eventActivities])

  const mineCount = allTasks.filter(isAssignedToMe).length
  const urgentCount = allTasks.filter(isUrgent).length

  const selectedEventActivity = mergedTasks.find(
    t => t.id === selectedTaskId && t._type === 'event_activity'
  ) || null

  const { data: selectedCollabTask } = useQuery({
    queryKey: ['collab-task', selectedTaskId],
    queryFn: () => collabTasksApi.get(selectedTaskId!),
    enabled: !!selectedTaskId && !selectedEventActivity,
  })

  const selectedTask = selectedEventActivity || selectedCollabTask

  const createMut = useMutation({
    mutationFn: (data: any) => collabTasksApi.create(data),
    onSuccess: () => {
      antMessage.success('Tarea creada exitosamente')
      setShowFormModal(false)
      qc.invalidateQueries({ queryKey: ['collab-tasks'] })
    },
    onError: (err: any) => {
      antMessage.error(err.response?.data?.message || 'Error al crear la tarea')
    },
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => collabTasksApi.update(editingTask.id, data),
    onSuccess: () => {
      antMessage.success('Tarea actualizada exitosamente')
      setShowFormModal(false)
      setEditingTask(null)
      qc.invalidateQueries({ queryKey: ['collab-tasks'] })
      qc.invalidateQueries({ queryKey: ['collab-task', selectedTaskId] })
    },
    onError: (err: any) => {
      antMessage.error(err.response?.data?.message || 'Error al actualizar la tarea')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => collabTasksApi.delete(id),
    onSuccess: () => {
      antMessage.success('Tarea eliminada exitosamente')
      setSelectedTaskId(null)
      qc.invalidateQueries({ queryKey: ['collab-tasks'] })
    },
    onError: (err: any) => {
      antMessage.error(err.response?.data?.message || 'Error al eliminar la tarea')
    },
  })

  const updateActivityMut = useMutation({
    mutationFn: (data: any) =>
      eventActivitiesApi.update(editingActivity.event.id, editingActivity.id, data),
    onSuccess: () => {
      antMessage.success('Actividad actualizada exitosamente')
      setShowActivityModal(false)
      setEditingActivity(null)
      qc.invalidateQueries({ queryKey: ['my-event-activities'] })
      if (selectedTaskId) {
        qc.invalidateQueries({ queryKey: ['collab-task', selectedTaskId] })
      }
    },
    onError: (err: any) => {
      antMessage.error(err.response?.data?.message || 'Error al actualizar la actividad')
    },
  })

  const handleCreateTask = () => {
    setEditingTask(null)
    setShowFormModal(true)
  }

  const handleEditTask = (task: any) => {
    setEditingTask(task)
    setShowFormModal(true)
  }

  const handleFormSubmit = (values: any) => {
    if (editingTask) {
      updateMut.mutate(values)
    } else {
      createMut.mutate(values)
    }
  }

  const handleDeleteTask = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
      deleteMut.mutate(id)
    }
  }

  const handleEditEventActivity = (activity: any) => {
    setEditingActivity(activity)
    setShowActivityModal(true)
  }

  // Pending "mine" tasks for home screen overview
  const myPendingTasks = useMemo(() =>
    allTasks.filter(t =>
      isAssignedToMe(t) &&
      t.status !== 'DONE' &&
      t.status !== 'CANCELLED'
    ).sort((a, b) => {
      // Overdue/urgent first
      const aUrgent = isUrgent(a) ? 0 : 1
      const bUrgent = isUrgent(b) ? 0 : 1
      if (aUrgent !== bUrgent) return aUrgent - bUrgent
      // Then by priority weight
      const pw: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      return (pw[a.priority] ?? 4) - (pw[b.priority] ?? 4)
    }),
    [allTasks, currentUserId]
  )

  // On mobile: show detail panel when task selected, list otherwise
  const showList = !isMobile || !selectedTaskId
  const showDetail = !isMobile || !!selectedTaskId

  return (
    <>
      <Layout style={{ height: '100%', borderRadius: 0, overflow: 'hidden' }}>
        {/* ── Task list sidebar ───────────────────────────────────────────────── */}
        <Sider
          width={isMobile ? '100%' : 420}
          style={{
            background: '#f8fafc',
            borderRight: isMobile ? 'none' : '1px solid #e8f0fe',
            overflowY: 'auto',
            display: showList ? 'block' : 'none',
            maxWidth: isMobile ? '100%' : 420,
            minWidth: isMobile ? '100%' : 320,
          }}
        >
          <div style={{ borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>

            {/* ── View filter tabs ── */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              {([
                { value: 'mine',   icon: <UserOutlined />,  label: 'Mías',     count: mineCount,   accent: T.navy,    bg: '#e8f0fe' },
                { value: 'all',    icon: <TeamOutlined />,  label: 'Todas',    count: allTasks.length, accent: '#64748b', bg: '#f1f5f9' },
                { value: 'urgent', icon: <FireOutlined />,  label: 'Urgentes', count: urgentCount, accent: '#ef4444', bg: '#fef2f2' },
              ] as const).map(tab => {
                const active = viewFilter === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => setViewFilter(tab.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderBottom: active ? `3px solid ${tab.accent}` : '3px solid transparent',
                      background: active ? tab.bg : 'transparent',
                      cursor: 'pointer',
                      padding: '10px 6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      transition: 'all 0.15s',
                      outline: 'none',
                    }}
                  >
                    <span style={{ fontSize: 16, color: active ? tab.accent : '#94a3b8', lineHeight: 1 }}>{tab.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? tab.accent : '#64748b', lineHeight: 1 }}>{tab.label}</span>
                    {tab.count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: active ? '#fff' : '#94a3b8',
                        background: active ? tab.accent : '#e2e8f0',
                        borderRadius: 10, padding: '1px 7px', lineHeight: '16px',
                        minWidth: 20, textAlign: 'center',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Search + filters ── */}
            <div style={{ padding: '12px 14px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Button
                  type="primary"
                  block
                  icon={<PlusOutlined />}
                  onClick={handleCreateTask}
                  style={{ background: T.navy, borderColor: T.navy, borderRadius: 6, height: 38, fontWeight: 600 }}
                >
                  Nueva Tarea
                </Button>

                <Input
                  placeholder="Buscar tareas..."
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  style={{ borderRadius: 6, height: 34 }}
                  allowClear
                />

                <Select
                  placeholder="Filtrar por estado..."
                  value={filters.status || undefined}
                  onChange={status => setFilters({ ...filters, status })}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { value: 'PENDING',     label: '⬜ Pendiente' },
                    { value: 'IN_PROGRESS', label: '🔵 En Progreso' },
                    { value: 'ON_HOLD',     label: '🟡 En Espera' },
                    { value: 'DONE',        label: '✅ Completada' },
                    { value: 'CANCELLED',   label: '❌ Cancelada' },
                  ]}
                />

                <Select
                  placeholder="Filtrar por prioridad..."
                  value={filters.priority || undefined}
                  onChange={priority => setFilters({ ...filters, priority })}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { value: 'CRITICAL', label: '🔴 Crítica' },
                    { value: 'HIGH',     label: '🟠 Alta' },
                    { value: 'MEDIUM',   label: '🔵 Media' },
                    { value: 'LOW',      label: '⚪ Baja' },
                  ]}
                />

                {(filters.status || filters.priority || filters.search) && (
                  <Button
                    type="link"
                    size="small"
                    style={{ color: T.navy, padding: '0', height: 'auto' }}
                    onClick={() => setFilters({ status: undefined, priority: undefined, search: '' })}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </Space>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          ) : mergedTasks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Empty
                description={(filters.status || filters.priority || filters.search) ? "Sin resultados para los filtros aplicados" : "Sin tareas aún"}
              />
            </div>
          ) : (
            <TaskListPanel
              tasks={mergedTasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              currentUserId={currentUserId}
              viewFilter={viewFilter}
            />
          )}
        </Sider>

        {/* ── Task detail / home overview ───────────────────────────────────── */}
        <Content style={{ overflow: 'auto', background: '#f8fafc', display: showDetail ? 'block' : 'none' }}>
          {isMobile && selectedTaskId && (
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e8f0fe', background: '#fff' }}>
              <Button size="small" onClick={() => setSelectedTaskId(null)}>← Volver a tareas</Button>
            </div>
          )}
          {!selectedTaskId ? (
            <MyTasksOverview
              myPendingTasks={myPendingTasks}
              onSelectTask={setSelectedTaskId}
              onCreateTask={handleCreateTask}
            />
          ) : (
            <TaskDetailDrawer
              task={selectedTask}
              isLoading={!selectedTask}
              statusConfig={STATUS_CONFIG}
              priorityConfig={PRIORITY_CONFIG}
              isEventActivity={!!selectedEventActivity}
              onEdit={() => handleEditTask(selectedTask)}
              onDelete={() => handleDeleteTask(selectedTaskId)}
              onEditEventActivity={handleEditEventActivity}
              isDeletingis={deleteMut.isPending}
            />
          )}
        </Content>
      </Layout>

      {/* ── Form Modal ──────────────────────────────────────────────────────── */}
      <TaskFormModal
        open={showFormModal}
        task={editingTask}
        onCancel={() => { setShowFormModal(false); setEditingTask(null) }}
        onSubmit={handleFormSubmit}
        isLoading={editingTask ? updateMut.isPending : createMut.isPending}
        users={users}
        events={events}
        clients={clients}
        departments={departments}
        orders={orders}
      />

      {/* ── Event Activity Modal ────────────────────────────────────────────── */}
      <EventActivityFormModal
        open={showActivityModal}
        activity={editingActivity}
        onClose={() => { setShowActivityModal(false); setEditingActivity(null) }}
        onSave={(values: any) => updateActivityMut.mutate(values)}
        loading={updateActivityMut.isPending}
        users={users}
        departments={departments}
      />
    </>
  )
}
