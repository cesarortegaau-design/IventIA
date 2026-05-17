import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, Descriptions, Progress, Button, Space, Spin, Popconfirm, Tag, Avatar, Typography, Divider, Empty, Modal, Select, App, Alert, Input } from 'antd'
import { DeleteOutlined, EditOutlined, ThunderboltOutlined, CheckCircleFilled, CloseCircleFilled, ClockCircleOutlined, LinkOutlined, UserOutlined } from '@ant-design/icons'
import { TaskDocumentsPanel } from './TaskDocumentsPanel'
import { TaskCommentThread } from './TaskCommentThread'
import { approvalFlowsApi } from '../../../api/approvalFlows'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const { Text } = Typography
const { TextArea } = Input

function formatDateTime(date: string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Map objectType → admin route (labels come from backend objectLabel)
const OBJECT_ROUTE: Record<string, (id: string) => string> = {
  ORDER:          id => `/ordenes/${id}`,
  BUDGET_ORDER:   id => `/ordenes/${id}`,
  EVENT:          id => `/eventos/${id}`,
  SUPPLIER:       _id => `/catalogos/proveedores`,
  PURCHASE_ORDER: id => `/catalogos/ordenes-compra/${id}`,
  COLLAB_TASK:    id => `/chat`,
}

export function TaskDetailDrawer({ task, isLoading, statusConfig, priorityConfig, isEventActivity, onEdit, onDelete, isDeletingis, onEditEventActivity, onStatusChange }: any) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [availableFlows, setAvailableFlows] = useState<any[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState<string | undefined>()
  const [triggering, setTriggering] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

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

  // Approval step review mutation (for approval tasks)
  const reviewMutation = useMutation({
    mutationFn: ({ stepId, requestId, action, reason }: { stepId: string; requestId: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      approvalFlowsApi.reviewStep(requestId, stepId, action, reason),
    onSuccess: () => {
      message.success('Revisión registrada')
      queryClient.invalidateQueries({ queryKey: ['collab-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['collab-task', task?.id] })
      onStatusChange?.()
    },
    onError: (e: any) => {
      message.error(e.response?.data?.error?.message ?? 'Error al procesar la revisión')
      queryClient.invalidateQueries({ queryKey: ['collab-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['collab-task', task?.id] })
    },
  })

  if (isLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
  }

  if (!task) {
    return <Empty description="Tarea no encontrada" />
  }

  const status = statusConfig[task.status as keyof typeof statusConfig]
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig]

  // Approval step data
  const approvalStep = task.approvalRequestStep
  const isApprovalTask = !!approvalStep
  const stepStatus: string = approvalStep?.status ?? ''
  const isApproved = stepStatus === 'APPROVED'
  const isRejected = stepStatus === 'REJECTED'
  const isPending  = stepStatus === 'PENDING'
  const flowName    = approvalStep?.request?.flow?.name ?? 'Flujo de aprobación'
  const stepName    = approvalStep?.step?.name ?? ''
  const stepType    = (approvalStep?.step?.stepType ?? 'APPROVAL') as 'APPROVAL' | 'NOTIFICATION'
  const isNotification = stepType === 'NOTIFICATION'
  const reviewedBy  = approvalStep?.reviewedBy
  const triggeredBy = approvalStep?.request?.triggeredBy
  const objectType   = approvalStep?.request?.objectType as string | undefined
  const objectId     = approvalStep?.request?.objectId as string | undefined
  const objectLabel  = approvalStep?.objectLabel as string | undefined
  const objectRoute  = objectType && objectId ? OBJECT_ROUTE[objectType]?.(objectId) : undefined
  const requestId    = approvalStep?.request?.id
  const stepId       = approvalStep?.stepId

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
            {!isApprovalTask && (
              <Button icon={<ThunderboltOutlined />} size="small" onClick={openTriggerModal}>
                ⚡ Flujo de aprobación
              </Button>
            )}
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

      {/* ── Approval task card ────────────────────────────────────────────── */}
      {isApprovalTask && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            borderRadius: 10,
            border: `2px solid ${isApproved ? '#b7eb8f' : isRejected ? '#ffccc7' : '#faad14'}`,
            background: isApproved ? '#f6ffed' : isRejected ? '#fff2f0' : '#fffbe6',
            padding: '16px 18px',
          }}>
            {/* Status header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {isApproved && <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />}
              {isRejected && <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />}
              {isPending  && <ClockCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />}
              <Text strong style={{ fontSize: 14, color: isApproved ? '#389e0d' : isRejected ? '#cf1322' : '#d48806' }}>
                {isNotification ? '🔔 Notificación' : '✅ Autorización'} —{' '}
                {isApproved ? (isNotification ? 'Notificado' : 'Aprobado') : isRejected ? 'Rechazado' : 'Pendiente de revisión'}
              </Text>
            </div>

            {/* Flow + step */}
            <Text style={{ fontSize: 12, color: '#595959', display: 'block', marginBottom: 6 }}>
              Flujo: <strong>{flowName}</strong>
              {stepName && <> · Paso: <strong>{stepName}</strong></>}
            </Text>

            {/* Triggered by */}
            {triggeredBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <UserOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#595959' }}>
                  Solicitado por <strong>{triggeredBy.firstName} {triggeredBy.lastName}</strong>
                </Text>
              </div>
            )}

            {/* Object link */}
            {objectRoute && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isPending ? 14 : 0 }}>
                <LinkOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto', fontSize: 12, textAlign: 'left', whiteSpace: 'normal' }}
                  onClick={() => navigate(objectRoute)}
                >
                  {objectLabel ?? objectType} →
                </Button>
              </div>
            )}

            {/* Review result */}
            {(isApproved || isRejected) && reviewedBy && (
              <Text style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginTop: 4 }}>
                {isApproved ? 'Aprobado' : 'Rechazado'} por <strong>{reviewedBy.firstName} {reviewedBy.lastName}</strong>
                {approvalStep.reviewedAt && ` — ${new Date(approvalStep.reviewedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                {approvalStep.reason && ` · "${approvalStep.reason}"`}
              </Text>
            )}

            {/* Action buttons — only when pending */}
            {isPending && requestId && stepId && (
              isNotification ? (
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    Este es un paso de notificación. El flujo avanza automáticamente.
                  </Text>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <Button
                    type="primary"
                    icon={<CheckCircleFilled />}
                    style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
                    loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ requestId, stepId, action: 'APPROVE' })}
                  >
                    Aprobar
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleFilled />}
                    style={{ fontWeight: 600 }}
                    loading={reviewMutation.isPending}
                    onClick={() => { setRejectReason(''); setRejectModalOpen(true) }}
                  >
                    Rechazar
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      )}

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

      {/* Reject reason modal */}
      <Modal
        title="Rechazar paso de aprobación"
        open={rejectModalOpen}
        onOk={() => {
          if (!requestId || !stepId) return
          reviewMutation.mutate({ requestId, stepId, action: 'REJECT', reason: rejectReason || undefined })
          setRejectModalOpen(false)
        }}
        onCancel={() => setRejectModalOpen(false)}
        okText="Confirmar rechazo"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
      >
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
          Puedes agregar un motivo de rechazo (opcional). El flujo regresará al paso anterior.
        </Text>
        <TextArea
          rows={3}
          placeholder="Motivo del rechazo..."
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
        />
      </Modal>

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
