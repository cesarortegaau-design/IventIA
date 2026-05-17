import { prisma } from '../config/database'

interface GateResult {
  blocked: boolean
  requestId?: string
  message: string
}

/**
 * Check if a status transition is gated by an approval flow.
 *
 * If an active autoTrigger flow exists for this objectType+targetStatus and
 * blocksTransition is true:
 *   - Already APPROVED for this object → allow (blocked: false)
 *   - IN_PROGRESS already → block with existing requestId
 *   - Otherwise → auto-create ApprovalRequest + CollabTask, then block
 */
export async function checkApprovalGate(
  tenantId: string,
  triggeredById: string,
  objectType: string,
  objectId: string,
  targetStatus: string,
): Promise<GateResult> {
  const flow = await prisma.approvalFlow.findFirst({
    where: {
      tenantId,
      objectType: objectType as any,
      targetStatus,
      autoTrigger: true,
      isActive: true,
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  if (!flow || !flow.blocksTransition) return { blocked: false, message: '' }

  // Already approved for this object+flow → let it through
  const approved = await prisma.approvalRequest.findFirst({
    where: { tenantId, flowId: flow.id, objectType: objectType as any, objectId, status: 'APPROVED' },
    orderBy: { completedAt: 'desc' },
  })
  if (approved) return { blocked: false, message: '' }

  // IN_PROGRESS → block, return existing requestId
  const inProgress = await prisma.approvalRequest.findFirst({
    where: { tenantId, flowId: flow.id, objectType: objectType as any, objectId, status: 'IN_PROGRESS' },
  })
  if (inProgress) {
    return {
      blocked: true,
      requestId: inProgress.id,
      message: `Transición a "${targetStatus}" bloqueada — el flujo de aprobación "${flow.name}" está en progreso.`,
    }
  }

  if (flow.steps.length === 0) return { blocked: false, message: '' }

  // Auto-create request + step instances
  const request = await prisma.$transaction(async (tx) => {
    const req = await tx.approvalRequest.create({
      data: {
        tenantId,
        flowId: flow.id,
        objectType: objectType as any,
        objectId,
        status: 'IN_PROGRESS',
        currentStep: 0,
        triggeredById,
      },
    })
    await Promise.all(
      flow.steps.map((s) =>
        tx.approvalRequestStep.create({
          data: { requestId: req.id, stepId: s.id, order: s.order, status: 'PENDING' },
        })
      )
    )
    return req
  })

  // Create CollabTask for first step (outside tx)
  const firstStep = flow.steps[0]
  const taskId = await createTaskForStep(tenantId, triggeredById, flow.name, firstStep, objectType, objectId)

  if (taskId) {
    const firstReqStep = await prisma.approvalRequestStep.findFirst({
      where: { requestId: request.id, order: firstStep.order },
    })
    if (firstReqStep) {
      await prisma.approvalRequestStep.update({ where: { id: firstReqStep.id }, data: { taskId } })
    }
  }

  return {
    blocked: true,
    requestId: request.id,
    message: `Transición a "${targetStatus}" bloqueada — se inició automáticamente el flujo "${flow.name}". Debe ser aprobado antes de continuar.`,
  }
}

async function createTaskForStep(
  tenantId: string,
  createdById: string,
  flowName: string,
  step: any,
  objectType: string,
  objectId: string,
): Promise<string | null> {
  const title = `[Aprobación] ${flowName} — Paso ${step.order + 1}: ${step.name}`
  const description = `Solicitud de aprobación para ${objectType} ${objectId}. ${step.description ?? ''}`

  if (step.assigneeType === 'USER' && step.assigneeUserId) {
    const task = await prisma.collabTask.create({
      data: { tenantId, title, description, status: 'PENDING', priority: 'HIGH', createdById, assignedToId: step.assigneeUserId },
    })
    await prisma.collabTaskAssignee.create({ data: { taskId: task.id, userId: step.assigneeUserId } })
    return task.id
  }

  if (step.assigneeType === 'PROFILE' && step.assigneeProfileId) {
    const users = await prisma.user.findMany({
      where: { profileId: step.assigneeProfileId, tenantId, isActive: true },
      select: { id: true },
    })
    if (users.length === 0) return null
    const task = await prisma.collabTask.create({
      data: { tenantId, title, description, status: 'PENDING', priority: 'HIGH', createdById, assignedToId: users[0].id },
    })
    await prisma.collabTaskAssignee.createMany({
      data: users.map((u) => ({ taskId: task.id, userId: u.id })),
    })
    return task.id
  }

  return null
}
