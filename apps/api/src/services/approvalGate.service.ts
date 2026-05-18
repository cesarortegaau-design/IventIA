import { prisma } from '../config/database'

interface GateResult {
  blocked: boolean
  requestId?: string
  message: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule executor — runs pre-compiled JS code stored in the flow
// No AI tokens consumed here. Tokens were spent once at rule compilation time.
// ─────────────────────────────────────────────────────────────────────────────

function executeRuleCode(ruleCode: string, objectData: Record<string, any>): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('objectData', ruleCode)
    return Boolean(fn(objectData))
  } catch {
    // On execution error, default to triggering the gate (conservative)
    return true
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Object data fetchers — provide rich context to the AI evaluator
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchObjectData(objectType: string, objectId: string): Promise<Record<string, any>> {
  if (objectType === 'ORDER' || objectType === 'BUDGET_ORDER') {
    const order = await prisma.order.findUnique({
      where: { id: objectId },
      select: {
        orderNumber: true,
        status: true,
        isBudgetOrder: true,
        subtotal: true,
        total: true,
        createdAt: true,
        client: { select: { companyName: true, firstName: true, lastName: true, rfc: true } },
        priceList: { select: { name: true } },
        organizacion: { select: { descripcion: true, clave: true } },
        event: { select: { name: true } },
        _count: { select: { lineItems: true } },
      },
    })
    if (!order) return {}
    return {
      numeroOrden: order.orderNumber,
      estado: order.status,
      esBudget: order.isBudgetOrder,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      cliente: order.client?.companyName ?? `${order.client?.firstName ?? ''} ${order.client?.lastName ?? ''}`.trim(),
      clienteRfc: order.client?.rfc ?? null,
      listaPrecios: order.priceList?.name,
      organizacion: order.organizacion?.descripcion ?? null,
      organizacionClave: order.organizacion?.clave ?? null,
      evento: order.event?.name ?? null,
      cantidadItems: order._count.lineItems,
      fechaCreacion: order.createdAt?.toISOString().slice(0, 10),
    }
  }

  if (objectType === 'EVENT') {
    const event = await prisma.event.findUnique({
      where: { id: objectId },
      select: {
        name: true,
        status: true,
        eventStart: true,
        eventEnd: true,
        venueLocation: true,
      },
    })
    if (!event) return {}
    return {
      nombre: event.name,
      estado: event.status,
      inicio: event.eventStart?.toISOString().slice(0, 10),
      fin: event.eventEnd?.toISOString().slice(0, 10),
      lugar: event.venueLocation,
    }
  }

  if (objectType === 'SUPPLIER') {
    const supplier = await prisma.supplier.findUnique({
      where: { id: objectId },
      select: { name: true, type: true, status: true },
    })
    if (!supplier) return {}
    return { nombre: supplier.name, tipo: supplier.type, estado: supplier.status }
  }

  if (objectType === 'PURCHASE_ORDER') {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: objectId },
      select: {
        poNumber: true,
        status: true,
        subtotal: true,
        total: true,
        supplier: { select: { name: true } },
      },
    })
    if (!po) return {}
    return {
      numero: po.poNumber,
      estado: po.status,
      subtotal: Number(po.subtotal),
      total: Number(po.total),
      proveedor: po.supplier?.name,
    }
  }

  return {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main gate check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a status transition is gated by an approval flow.
 *
 * Evaluation order:
 *  1. Find active autoTrigger flow for objectType+targetStatus
 *  2. Check minAmount condition (structured, fast)
 *  3. Check activationConditionsText via Claude AI (natural language rule)
 *  4. If already APPROVED → allow
 *  5. If IN_PROGRESS → block (return existing requestId)
 *  6. Otherwise → auto-create ApprovalRequest + CollabTask, then block
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

  // Fetch object data once — used for both minAmount and AI evaluation
  const objectData = await fetchObjectData(objectType, objectId)

  // 1. Structured minAmount check (no AI needed)
  if (flow.minAmount !== null && (objectType === 'ORDER' || objectType === 'BUDGET_ORDER')) {
    const total = (objectData.total as number) ?? 0
    if (total < Number(flow.minAmount)) return { blocked: false, message: '' }
  }

  // 2. Execute pre-compiled rule code (zero AI cost — compiled once at save time)
  if (flow.ruleCode?.trim()) {
    const conditionMet = executeRuleCode(flow.ruleCode, objectData)
    if (!conditionMet) return { blocked: false, message: '' }
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// CollabTask creator for approval steps
// ─────────────────────────────────────────────────────────────────────────────

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
