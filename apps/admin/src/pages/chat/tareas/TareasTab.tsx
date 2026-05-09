import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout, Select, Input, Button, Empty, Spin, Space, message as antMessage } from 'antd'
import { PlusOutlined, FilterOutlined } from '@ant-design/icons'
import { collabTasksApi } from '../../../api/collabTasks'
import { TaskListPanel } from './TaskListPanel'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { TaskFormModal } from './TaskFormModal'

const { Sider, Content } = Layout

const STATUS_CONFIG = {
  PENDING: { color: 'default', label: 'Pendiente' },
  IN_PROGRESS: { color: 'processing', label: 'En Progreso' },
  ON_HOLD: { color: 'warning', label: 'En Espera' },
  DONE: { color: 'success', label: 'Completada' },
  CANCELLED: { color: 'error', label: 'Cancelada' },
}

const PRIORITY_CONFIG = {
  LOW: { color: 'default', label: 'Baja' },
  MEDIUM: { color: 'blue', label: 'Media' },
  HIGH: { color: 'orange', label: 'Alta' },
  CRITICAL: { color: 'red', label: 'Crítica' },
}

export function TareasTab() {
  const qc = useQueryClient()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    priority: undefined as string | undefined,
    search: '',
  })

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['collab-tasks', filters],
    queryFn: () => collabTasksApi.list(filters),
  })

  const { data: selectedTask } = useQuery({
    queryKey: ['collab-task', selectedTaskId],
    queryFn: () => collabTasksApi.get(selectedTaskId!),
    enabled: !!selectedTaskId,
  })

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

  return (
    <>
      <Layout style={{ height: '100%', borderRadius: 0, overflow: 'hidden' }}>
        {/* ── Task list sidebar ───────────────────────────────────────────────── */}
        <Sider width={340} style={{ background: '#f8fafc', borderRight: '1px solid #e8f0fe', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e8f0fe', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                type="primary"
                block
                icon={<PlusOutlined />}
                onClick={handleCreateTask}
                style={{ background: '#1a3a5c', borderColor: '#1a3a5c', borderRadius: 6 }}
              >
                Nueva Tarea
              </Button>

              <Input
                placeholder="Buscar tareas..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                size="small"
                style={{ borderRadius: 6 }}
              />

              <Space style={{ width: '100%', justifyContent: 'space-between' }} size="small">
                <Select
                  placeholder="Estado"
                  value={filters.status || undefined}
                  onChange={status => setFilters({ ...filters, status })}
                  allowClear
                  style={{ flex: 1, minWidth: 0 }}
                  size="small"
                  options={[
                    { value: 'PENDING', label: 'Pendiente' },
                    { value: 'IN_PROGRESS', label: 'En Progreso' },
                    { value: 'ON_HOLD', label: 'En Espera' },
                    { value: 'DONE', label: 'Completada' },
                    { value: 'CANCELLED', label: 'Cancelada' },
                  ]}
                />
                <Select
                  placeholder="Prioridad"
                  value={filters.priority || undefined}
                  onChange={priority => setFilters({ ...filters, priority })}
                  allowClear
                  style={{ flex: 1, minWidth: 0 }}
                  size="small"
                  options={[
                    { value: 'LOW', label: 'Baja' },
                    { value: 'MEDIUM', label: 'Media' },
                    { value: 'HIGH', label: 'Alta' },
                    { value: 'CRITICAL', label: 'Crítica' },
                  ]}
                />
              </Space>
            </Space>
          </div>

          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Empty description="Sin tareas" />
            </div>
          ) : (
            <TaskListPanel
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              statusConfig={STATUS_CONFIG}
              priorityConfig={PRIORITY_CONFIG}
            />
          )}
        </Sider>

        {/* ── Task detail ───────────────────────────────────────────────────── */}
        <Content style={{ overflow: 'auto', background: '#fff' }}>
          {!selectedTaskId ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: 16 }}>
              <FilterOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />
              <span>Selecciona una tarea para ver los detalles</span>
            </div>
          ) : (
            <TaskDetailDrawer
              task={selectedTask}
              isLoading={!selectedTask}
              statusConfig={STATUS_CONFIG}
              priorityConfig={PRIORITY_CONFIG}
              onEdit={() => handleEditTask(selectedTask)}
              onDelete={() => handleDeleteTask(selectedTaskId)}
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
      />
    </>
  )
}
