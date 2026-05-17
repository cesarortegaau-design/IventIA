import { useState } from 'react'
import { Tabs, Descriptions, Progress, Button, Space, Spin, Popconfirm, Tag, Avatar, Typography, Divider, Empty, Modal, Select, App } from 'antd'
import { DeleteOutlined, EditOutlined, DownloadOutlined, CalendarOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { TaskDocumentsPanel } from './TaskDocumentsPanel'
import { TaskCommentThread } from './TaskCommentThread'
import ApprovalPanel from '../../../components/ApprovalPanel'
import { approvalFlowsApi } from '../../../api/approvalFlows'

const { Text } = Typography

function formatDateTime(date: string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function TaskDetailDrawer({ task, isLoading, statusConfig, priorityConfig, isEventActivity, onEdit, onDelete, isDeletingis, onEditEventActivity, onStatusChange }: any) {
  const { message } = App.useApp()
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [availableFlows, setAvailableFlows] = useState<any[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState<string | undefined>()
  const [triggering, setTriggering] = useState(false)

  async function openTriggerModal() {
    const flows = await approvalFlowsApi.list({ objectType: 'COLLAB_TASK' })
    setAvailableFlows(flows ?? [])
    setSelectedFlowId(undefined)
    setTriggerModalOpen(true)
  }

  async function handleTriggerFlow() {
    if (!selectedFlowId || !task?.id) return
    setTriggering(true)
    try {
      await approvalFlowsApi.triggerRequest({ flowId: selectedFlowId, objectType: 'COLLAB_TASK', objectId: task.id })
      message.success('Flujo de aprobación iniciado')
      setTriggerModalOpen(false)
    } catch {
      message.error('Error al iniciar el flujo')
    } finally {
      setTriggering(false)
    }
  }

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
  }

  if (!task) {
    return <Empty description="Tarea no encontrada" />
  }

  const status = statusConfig[task.status as keyof typeof statusConfig]
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig]

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 20, color: '#1a3a5c', display: 'block', marginBottom: 8 }}>
              {task.title}
            </Text>
            <Space>
              <Tag color={status.color}>{status.label}</Tag>
              <Tag color={priority.color}>{priority.label}</Tag>
              {task.completedAt && (
                <Text style={{ color: '#16a34a', fontSize: 12 }}>✓ Completada {new Date(task.completedAt).toLocaleDateString('es-MX')}</Text>
              )}
            </Space>
          </div>
          <Space>
            <Button icon={<ThunderboltOutlined />} size="small" onClick={openTriggerModal}>
              ⚡ Flujo de aprobación
            </Button>
            {isEventActivity ? (
              <Button icon={<EditOutlined />} type="primary" onClick={() => onEditEventActivity?.(task)}>
                Editar
              </Button>
            ) : (
              <>
                <Button icon={<EditOutlined />} onClick={onEdit}>Editar</Button>
                <Popconfirm
                  title="Eliminar tarea"
                  description="¿Estás seguro de que deseas eliminar esta tarea?"
                  onConfirm={onDelete}
                  okText="Sí"
                  cancelText="No"
                >
                  <Button icon={<DeleteOutlined />} danger loading={isDeletingis}>
                    Eliminar
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </Space>
      </div>

      <Divider />

      {/* Approval panel */}
      <div style={{ marginBottom: 16 }}>
        <ApprovalPanel
          objectType="COLLAB_TASK"
          objectId={task.id}
          onStatusChange={onStatusChange}
        />
      </div>

      {/* Progress */}
      {task.progress !== undefined && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 500 }}>Progreso</Text>
            <Progress percent={task.progress} strokeColor={priority.color} />
          </div>
          <Divider />
        </>
      )}

      {/* Trigger approval flow modal */}
      <Modal
        title="⚡ Iniciar Flujo de Aprobación"
        open={triggerModalOpen}
        onCancel={() => setTriggerModalOpen(false)}
        onOk={handleTriggerFlow}
        okText="Iniciar flujo"
        confirmLoading={triggering}
        okButtonProps={{ disabled: !selectedFlowId }}
      >
        <p style={{ marginBottom: 12, color: 'rgba(0,0,0,0.65)' }}>
          Selecciona el flujo de aprobación a iniciar para esta tarea:
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder="Seleccionar flujo…"
          value={selectedFlowId}
          onChange={setSelectedFlowId}
          options={availableFlows.map((f: any) => ({ value: f.id, label: f.name }))}
        />
      </Modal>

      {/* Tabs */}
      <Tabs
        items={[
          {
            key: 'details',
            label: 'Detalles',
            children: (
              <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
                {task.description && (
                  <Descriptions.Item label="Descripción">
                    <Text style={{ color: '#475569' }}>{task.description}</Text>
                  </Descriptions.Item>
                )}

                {task.startDate && (
                  <Descriptions.Item label="Fecha de inicio">
                    <Text>{formatDateTime(task.startDate)}</Text>
                  </Descriptions.Item>
                )}

                {task.endDate && (
                  <Descriptions.Item label="Fecha de vencimiento">
                    <Text>{formatDateTime(task.endDate)}</Text>
                  </Descriptions.Item>
                )}

                {(task.assignees?.length > 0 || task.assignedTo) && (
                  <Descriptions.Item label="Asignado a">
                    <Space direction="vertical" size={4}>
                      {(task.assignees?.length > 0
                        ? task.assignees.map((a: any) => a.user)
                        : [task.assignedTo]
                      ).map((u: any) => u && (
                        <Space key={u.id}>
                          <Avatar size={24} icon={<Text>👤</Text>} style={{ background: '#4A90E2' }} />
                          <Text>{u.firstName} {u.lastName}</Text>
                          {u.email && <Text style={{ color: '#94a3b8' }}>({u.email})</Text>}
                        </Space>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                {task.createdBy && !isEventActivity && (
                  <Descriptions.Item label="Creada por">
                    <Text>{task.createdBy.firstName} {task.createdBy.lastName}</Text>
                  </Descriptions.Item>
                )}

                {task.event && (
                  <Descriptions.Item label="Evento">
                    <Tag color="blue">{task.event.name}</Tag>
                  </Descriptions.Item>
                )}

                {task.client && (
                  <Descriptions.Item label="Cliente">
                    <Text>{task.client.companyName || `${task.client.firstName} ${task.client.lastName}`}</Text>
                  </Descriptions.Item>
                )}

                {task.departments && task.departments.length > 0 && !isEventActivity && (
                  <Descriptions.Item label="Departamentos">
                    <Space>
                      {task.departments.map((d: any) => (
                        <Tag key={d.departmentId} color="geekblue">{d.department.name}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                {task.activityDepartments && task.activityDepartments.length > 0 && isEventActivity && (
                  <Descriptions.Item label="Departamentos">
                    <Space>
                      {task.activityDepartments.map((d: any) => (
                        <Tag key={d.departmentId} color="geekblue">{d.department.name}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                {task.orders && task.orders.length > 0 && !isEventActivity && (
                  <Descriptions.Item label="Órdenes asociadas">
                    <Space direction="vertical" size="small">
                      {task.orders.map((o: any) => (
                        <Tag key={o.orderId} color="green">{o.order.orderNumber}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="Creada">
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{formatDateTime(task.createdAt)}</Text>
                </Descriptions.Item>

                {task.updatedAt && !isEventActivity && (
                  <Descriptions.Item label="Última actualización">
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{formatDateTime(task.updatedAt)}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            ),
          },
          ...(!isEventActivity ? [
            {
              key: 'documents',
              label: `Documentos (${task.documents?.length || 0})`,
              children: <TaskDocumentsPanel taskId={task.id} documents={task.documents} />,
            },
            {
              key: 'comments',
              label: `Comentarios (${task.comments?.length || 0})`,
              children: <TaskCommentThread taskId={task.id} comments={task.comments} />,
            },
          ] : []),
        ]}
      />
    </div>
  )
}
