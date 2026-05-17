import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, Typography, Button, Space, Spin, Alert, Tag, Tooltip,
  Input, Modal,
} from 'antd'
import {
  ThunderboltOutlined, CheckCircleFilled, CloseCircleFilled,
  ClockCircleFilled, LoadingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { approvalFlowsApi } from '../api/approvalFlows'
import { useAuthStore } from '../stores/authStore'

const { Text, Title } = Typography
const { TextArea } = Input

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ApprovalPanelProps {
  objectType: string
  objectId: string
  onStatusChange?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Step status icons
// ─────────────────────────────────────────────────────────────────────────────

function StepStatusIcon({ status, isCurrent }: { status: string; isCurrent: boolean }) {
  if (status === 'APPROVED') {
    return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
  }
  if (status === 'REJECTED') {
    return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
  }
  if (isCurrent) {
    return (
      <span style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: '#1890ff',
        boxShadow: '0 0 0 3px rgba(24,144,255,0.25)',
        animation: 'approval-panel-pulse 2s infinite',
        flexShrink: 0,
      }} />
    )
  }
  return <ClockCircleFilled style={{ color: '#bfbfbf', fontSize: 16 }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function ApprovalPanel({ objectType, objectId, onStatusChange }: ApprovalPanelProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectingStepId, setRejectingStepId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const queryKey = ['approval-active', objectType, objectId]

  const { data: request, isLoading } = useQuery<any>({
    queryKey,
    queryFn: () => approvalFlowsApi.getActiveRequest(objectType, objectId),
    // Poll every 5s when no active request (to pick up auto-triggered flows quickly),
    // every 30s once a request is active.
    refetchInterval: (query) => (query.state.data ? 30000 : 5000),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ stepId, action, reason }: { stepId: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      approvalFlowsApi.reviewStep(request.id, stepId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onStatusChange?.()
    },
  })

  if (isLoading) {
    return (
      <div style={{ padding: 12, textAlign: 'center' }}>
        <Spin indicator={<LoadingOutlined />} size="small" />
      </div>
    )
  }

  // If no active request, render nothing
  if (!request) return null

  const currentStepOrder = request.currentStep ?? 0
  const steps: any[] = request.steps ?? []

  // Find the current pending request step
  const currentRequestStep = steps.find(
    (s: any) => s.order === currentStepOrder && s.status === 'PENDING'
  )

  // Check if the current user is the assignee for the current step
  const isMyStep = (() => {
    if (!currentRequestStep || !user) return false
    const flowStep = currentRequestStep.step
    if (!flowStep) return false

    if (flowStep.assigneeType === 'USER') {
      return flowStep.assigneeUserId === user.id
    }
    if (flowStep.assigneeType === 'PROFILE') {
      return user.profileId === flowStep.assigneeProfileId
    }
    // ADMIN can always review
    return user.role === 'ADMIN'
  })()

  const handleApprove = () => {
    if (!currentRequestStep) return
    reviewMutation.mutate({ stepId: currentRequestStep.stepId, action: 'APPROVE' })
  }

  const handleOpenReject = () => {
    if (!currentRequestStep) return
    setRejectingStepId(currentRequestStep.stepId)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = () => {
    if (!rejectingStepId) return
    reviewMutation.mutate({
      stepId: rejectingStepId,
      action: 'REJECT',
      reason: rejectReason || undefined,
    })
    setRejectModalOpen(false)
    setRejectingStepId(null)
  }

  return (
    <>
      <style>{`
        @keyframes approval-panel-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(24,144,255,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(24,144,255,0.08); }
        }
        @keyframes approval-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250,173,20,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(250,173,20,0); }
        }
      `}</style>

      {/* Floating window — fixed top-right, shows active approval state */}
      {(() => {
        const currentStep = steps.find((s: any) => s.order === currentStepOrder && s.status === 'PENDING')
        const totalSteps = steps.length
        return (
          <div style={{
            position: 'fixed',
            top: 70,
            right: 24,
            zIndex: 1100,
            background: '#fff',
            border: '2px solid #faad14',
            borderRadius: 10,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            minWidth: 240,
            maxWidth: 320,
            overflow: 'hidden',
            animation: 'approval-badge-pulse 2s infinite',
          }}>
            {/* Header strip */}
            <div style={{
              background: '#faad14',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}>
              <ThunderboltOutlined style={{ color: '#fff', fontSize: 14 }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                Aprobación en curso
              </span>
            </div>
            {/* Body */}
            <div style={{ padding: '10px 14px' }}>
              {request.flow?.name && (
                <div style={{ fontSize: 12, color: '#595959', marginBottom: 6, fontWeight: 600 }}>
                  {request.flow.name}
                </div>
              )}
              {currentStep ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 12, color: '#1890ff', fontWeight: 600 }}>
                    Paso {currentStep.order + 1} de {totalSteps}: {currentStep.step?.name}
                  </div>
                  {currentStep.step?.assigneeType && (
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      Esperando revisión del responsable asignado
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Procesando…</div>
              )}
              {/* Mini step dots */}
              {totalSteps > 1 && (
                <div style={{ display: 'flex', gap: 5, marginTop: 8, alignItems: 'center' }}>
                  {steps.map((s: any) => {
                    const done = s.status === 'APPROVED'
                    const active = s.order === currentStepOrder && s.status === 'PENDING'
                    const rejected = s.status === 'REJECTED'
                    return (
                      <div key={s.id} title={`Paso ${s.order + 1}: ${s.step?.name}`} style={{
                        width: active ? 12 : 8,
                        height: active ? 12 : 8,
                        borderRadius: '50%',
                        background: done ? '#52c41a' : rejected ? '#ff4d4f' : active ? '#faad14' : '#d9d9d9',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }} />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <Card
        style={{
          borderLeft: '4px solid #faad14',
          background: '#fffbe6',
          marginBottom: 20,
          borderRadius: 8,
        }}
        bodyStyle={{ padding: '14px 18px' }}
        size="small"
      >
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0, color: '#d48806' }}>
            <ThunderboltOutlined style={{ marginRight: 6 }} />
            Proceso de aprobación en curso — {request.flow?.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Iniciado por {request.triggeredBy?.firstName} {request.triggeredBy?.lastName}{' '}
            el {dayjs(request.createdAt).format('D MMM YYYY, HH:mm')}
          </Text>
        </div>

        {/* Steps timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((s: any) => {
            const isCurrent = s.order === currentStepOrder && s.status === 'PENDING'

            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: isCurrent ? '#e6f7ff' : 'transparent',
                  border: isCurrent ? '1px solid #91d5ff' : '1px solid transparent',
                }}
              >
                <div style={{ paddingTop: 1, flexShrink: 0 }}>
                  <StepStatusIcon status={s.status} isCurrent={isCurrent} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 13 }}>
                      Paso {s.order + 1}: {s.step?.name}
                    </Text>
                    {s.step?.stepType === 'NOTIFICATION' ? (
                      <Tag color="blue" style={{ fontSize: 11 }}>🔔 Notificación</Tag>
                    ) : (
                      <Tag color="purple" style={{ fontSize: 11 }}>✅ Autorización</Tag>
                    )}
                    <Tag
                      color={
                        s.status === 'APPROVED' ? 'success' :
                        s.status === 'REJECTED' ? 'error' :
                        isCurrent ? 'processing' : 'default'
                      }
                      style={{ fontSize: 11 }}
                    >
                      {s.status === 'APPROVED' ? (s.step?.stepType === 'NOTIFICATION' ? 'Notificado' : 'Aprobado') :
                       s.status === 'REJECTED' ? 'Rechazado' :
                       isCurrent ? 'En revisión' : 'Pendiente'}
                    </Tag>
                  </div>

                  {(s.status === 'APPROVED' || s.status === 'REJECTED') && s.reviewedBy && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Por {s.reviewedBy.firstName} {s.reviewedBy.lastName}
                      {s.reviewedAt && ` — ${dayjs(s.reviewedAt).format('D MMM, HH:mm')}`}
                      {s.reason && ` — "${s.reason}"`}
                    </Text>
                  )}
                </div>

                {/* Action buttons for current user's pending step */}
                {isCurrent && isMyStep && (
                  <Space size={6} style={{ flexShrink: 0 }}>
                    <Button
                      size="small"
                      type="primary"
                      loading={reviewMutation.isPending}
                      onClick={handleApprove}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={reviewMutation.isPending}
                      onClick={handleOpenReject}
                    >
                      Rechazar
                    </Button>
                  </Space>
                )}

                {isCurrent && !isMyStep && (
                  <Tooltip title="Esperando revisión del responsable asignado">
                    <Tag color="blue" style={{ fontSize: 11 }}>Esperando revisión</Tag>
                  </Tooltip>
                )}
              </div>
            )
          })}
        </div>

        {reviewMutation.isError && (
          <Alert
            type="error"
            message={(reviewMutation.error as any)?.response?.data?.message ?? 'Error al procesar la revisión'}
            style={{ marginTop: 10 }}
            showIcon
          />
        )}
      </Card>

      {/* Reject reason modal */}
      <Modal
        title="Rechazar paso"
        open={rejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => setRejectModalOpen(false)}
        okText="Confirmar rechazo"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Puedes agregar un motivo de rechazo (opcional). El flujo regresará al paso anterior.
          </Text>
        </div>
        <TextArea
          rows={3}
          placeholder="Motivo del rechazo..."
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
        />
      </Modal>
    </>
  )
}
