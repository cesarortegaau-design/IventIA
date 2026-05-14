import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout, Select, Input, Button, Empty, Spin, Space, Segmented, Badge, message as antMessage } from 'antd'
import { PlusOutlined, FilterOutlined, UserOutlined, FireOutlined, TeamOutlined } from '@ant-design/icons'
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


export function TareasTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const currentUserId = currentUser?.id ?? ''

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any | null>(null)
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'urgent'>('all')
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

  return (
    <>
      <Layout style={{ height: '100%', borderRadius: 0, overflow: 'hidden' }}>
        {/* ── Task list sidebar ───────────────────────────────────────────────── */}
        <Sider width={340} style={{ background: '#f8fafc', borderRight: '1px solid #e8f0fe', overflowY: 'auto' }}>
          <div style={{ borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            {/* View filter */}
            <div style={{ padding: '12px 14px 0' }}>
              <Segmented
                block
                size="small"
                value={viewFilter}
                onChange={(v) => setViewFilter(v as any)}
                options={[
                  {
                    value: 'all',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                        <TeamOutlined /> Todo
                      </span>
                    ),
                  },
                  {
                    value: 'mine',
                    label: (
                      <Badge count={mineCount} size="small" offset={[6, -2]} color={T.navy}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <UserOutlined /> Mías
                        </span>
                      </Badge>
                    ),
                  },
                  {
                    value: 'urgent',
                    label: (
                      <Badge count={urgentCount} size="small" offset={[6, -2]} color="#ef4444">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <FireOutlined /> Urgentes
                        </span>
                      </Badge>
                    ),
                  },
                ]}
              />
            </div>

            <div style={{ padding: '10px 14px 12px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Button
                  type="primary"
                  block
                  icon={<PlusOutlined />}
                  onClick={handleCreateTask}
                  style={{ background: T.navy, borderColor: T.navy, borderRadius: 6, height: 36 }}
                >
                  Nueva Tarea
                </Button>

                <Input
                  placeholder="Buscar tareas..."
                  value={filters.search}
                  onChange={e => setFilters({ ...filters, search: e.target.value })}
                  style={{ borderRadius: 6, height: 32 }}
                  allowClear
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Select
                    placeholder="Estado"
                    size="small"
                    value={filters.status || undefined}
                    onChange={status => setFilters({ ...filters, status })}
                    allowClear
                    style={{ width: '100%' }}
                    options={[
                      { value: 'PENDING',     label: 'Pendiente' },
                      { value: 'IN_PROGRESS', label: 'En Progreso' },
                      { value: 'ON_HOLD',     label: 'En Espera' },
                      { value: 'DONE',        label: 'Completada' },
                      { value: 'CANCELLED',   label: 'Cancelada' },
                    ]}
                  />
                  <Select
                    placeholder="Prioridad"
                    size="small"
                    value={filters.priority || undefined}
                    onChange={priority => setFilters({ ...filters, priority })}
                    allowClear
                    style={{ width: '100%' }}
                    options={[
                      { value: 'LOW',      label: 'Baja' },
                      { value: 'MEDIUM',   label: 'Media' },
                      { value: 'HIGH',     label: 'Alta' },
                      { value: 'CRITICAL', label: 'Crítica' },
                    ]}
                  />
                </div>

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

        {/* ── Task detail ───────────────────────────────────────────────────── */}
        <Content style={{ overflow: 'auto', background: '#f8fafc' }}>
          {!selectedTaskId ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: 16 }}>
              <FilterOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />
              <span style={{ fontSize: 14 }}>Selecciona una tarea para ver los detalles</span>
            </div>
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
