import Anthropic from '@anthropic-ai/sdk'
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'
import { notifyTaskById } from './collabTasks.controller'
import { fetchObjectData } from '../services/approvalGate.service'

// ─────────────────────────────────────────────────────────────────────────────
// Object data schemas — tell Claude which fields are available per type
// ─────────────────────────────────────────────────────────────────────────────

const OBJECT_DATA_SCHEMAS: Record<string, object> = {
  ORDER: {
    numeroOrden: 'string — número de la orden',
    estado: 'string — QUOTED|CONFIRMED|EXECUTED|INVOICED|CANCELLED',
    esBudget: 'boolean — true si es orden de presupuesto',
    subtotal: 'number — monto sin IVA en MXN',
    total: 'number — monto total con IVA en MXN',
    cliente: 'string — nombre o razón social del CLIENTE de la orden (no confundir con organización)',
    clienteRfc: 'string|null — RFC / Tax ID del cliente de la orden. Vacío = null. Usar para condiciones como "RFC no vacío" o "RFC específico".',
    listaPrecios: 'string — nombre de la lista de precios aplicada',
    organizacion: 'string|null — descripción/nombre de la ORGANIZACIÓN a la que pertenece la orden (ej. "Expo Santa Fe"). Distinto del cliente.',
    organizacionClave: 'string|null — clave corta de la organización (ej. "EXPO-SF")',
    evento: 'string|null — nombre del evento al que pertenece la orden',
    cantidadItems: 'number — número de líneas de la orden',
    fechaCreacion: 'string — fecha YYYY-MM-DD de creación',
  },
  BUDGET_ORDER: {
    numeroOrden: 'string — número de la orden de presupuesto',
    estado: 'string — QUOTED|CONFIRMED|EXECUTED|INVOICED|CANCELLED',
    esBudget: 'boolean — siempre true',
    subtotal: 'number — monto sin IVA en MXN',
    total: 'number — monto total con IVA en MXN',
    cliente: 'string — nombre o razón social del CLIENTE (no confundir con organización)',
    clienteRfc: 'string|null — RFC / Tax ID del cliente. Vacío = null. Usar para condiciones como "RFC no vacío" o "RFC específico".',
    listaPrecios: 'string — nombre de la lista de precios aplicada',
    organizacion: 'string|null — descripción/nombre de la ORGANIZACIÓN (ej. "Expo Santa Fe"). Distinto del cliente.',
    organizacionClave: 'string|null — clave corta de la organización',
    evento: 'string|null — nombre del evento al que pertenece la orden',
    cantidadItems: 'number — número de líneas',
    fechaCreacion: 'string — fecha YYYY-MM-DD de creación',
  },
  EVENT: {
    nombre: 'string',
    estado: 'string (QUOTED|CONFIRMED|IN_EXECUTION|CLOSED|CANCELLED)',
    inicio: 'string (YYYY-MM-DD)',
    fin: 'string (YYYY-MM-DD)',
    lugar: 'string',
  },
  SUPPLIER: {
    nombre: 'string',
    tipo: 'string (DISTRIBUTOR|MANUFACTURER|WHOLESALER|SERVICES)',
    estado: 'string (ACTIVE|INACTIVE|BLOCKED)',
  },
  PURCHASE_ORDER: {
    numero: 'string',
    estado: 'string (DRAFT|CONFIRMED|PARTIALLY_RECEIVED|RECEIVED|INVOICED|CANCELLED)',
    subtotal: 'number (MXN)',
    total: 'number (MXN)',
    proveedor: 'string',
  },
  COLLAB_TASK: {
    titulo: 'string',
    estado: 'string (PENDING|IN_PROGRESS|ON_HOLD|DONE|CANCELLED)',
    prioridad: 'string (LOW|MEDIUM|HIGH|CRITICAL)',
    progreso: 'number (0-100)',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FLOW_STEP_INCLUDE = {
  assigneeUser: { select: { id: true, firstName: true, lastName: true } },
  assigneeProfile: { select: { id: true, name: true } },
}

const REQUEST_INCLUDE = {
  flow: { select: { name: true } },
  triggeredBy: { select: { id: true, firstName: true, lastName: true } },
  steps: {
    orderBy: { order: 'asc' as const },
    include: {
      step: { select: { name: true, stepType: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-advance helper — skips NOTIFICATION steps automatically
// ─────────────────────────────────────────────────────────────────────────────

async function autoAdvanceNotifications(
  tenantId: string,
  triggeredById: string,
  requestId: string,
): Promise<void> {
  // Re-load fresh request state
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: {
      flow: { include: { steps: { orderBy: { order: 'asc' } } } },
      steps: { orderBy: { order: 'asc' } },
    },
  })
  if (!request || request.status !== 'IN_PROGRESS') return

  const currentOrder = request.currentStep ?? 0
  const currentReqStep = request.steps.find(s => s.order === currentOrder && s.status === 'PENDING')
  if (!currentReqStep) return

  const currentFlowStep = request.flow.steps.find(s => s.id === currentReqStep.stepId)
  if (!currentFlowStep || currentFlowStep.stepType !== 'NOTIFICATION') return

  // Auto-approve this notification step
  const now = new Date()
  await prisma.approvalRequestStep.update({
    where: { id: currentReqStep.id },
    data: {
      status: 'APPROVED',
      reviewedAt: now,
      reason: 'Auto-avanzado (paso de notificación)',
    },
  })

  // Auto-complete the linked task if it exists
  if (currentReqStep.taskId) {
    await prisma.collabTask.update({
      where: { id: currentReqStep.taskId },
      data: { status: 'DONE', completedAt: now },
    }).catch(() => {})
  }

  const nextReqStep = request.steps.find(s => s.order === currentOrder + 1)
  if (!nextReqStep) {
    // Last step was a notification — complete the request
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', completedAt: now },
    })
    return
  }

  // Advance to next step
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: { currentStep: nextReqStep.order },
  })

  // Create task for next step
  const nextFlowStep = request.flow.steps.find(s => s.id === nextReqStep.stepId)
  if (nextFlowStep) {
    const taskId = await createTaskForStep(
      tenantId,
      triggeredById,
      request.flow.name,
      nextFlowStep.order,
      nextFlowStep.name,
      nextFlowStep.description,
      request.objectType,
      request.objectId,
      nextFlowStep.assigneeType,
      nextFlowStep.assigneeUserId,
      nextFlowStep.assigneeProfileId,
    )
    if (taskId) {
      await prisma.approvalRequestStep.update({
        where: { id: nextReqStep.id },
        data: { taskId },
      })
    }
  }

  // Recurse in case the next step is also a notification
  await autoAdvanceNotifications(tenantId, triggeredById, requestId)
}

/**
 * Create a CollabTask for the given approval step assignee(s).
 * Returns the taskId of the created task (first one if profile-based multi-assignee).
 */
async function createTaskForStep(
  tenantId: string,
  createdById: string,
  flowName: string,
  stepOrder: number,
  stepName: string,
  stepDescription: string | null | undefined,
  objectType: string,
  objectId: string,
  assigneeType: string,
  assigneeUserId: string | null | undefined,
  assigneeProfileId: string | null | undefined,
): Promise<string | null> {
  const title = `[Aprobación] ${flowName} — Paso ${stepOrder + 1}: ${stepName}`
  const description = `Solicitud de aprobación para ${objectType} ${objectId}. ${stepDescription ?? ''}`

  if (assigneeType === 'USER' && assigneeUserId) {
    const task = await prisma.collabTask.create({
      data: {
        tenantId,
        title,
        description,
        status: 'PENDING',
        priority: 'HIGH',
        createdById,
        assignedToId: assigneeUserId,
      },
    })
    await prisma.collabTaskAssignee.create({ data: { taskId: task.id, userId: assigneeUserId } })
    return task.id
  }

  if (assigneeType === 'PROFILE' && assigneeProfileId) {
    const usersWithProfile = await prisma.user.findMany({
      where: { profileId: assigneeProfileId, tenantId, isActive: true },
      select: { id: true },
    })
    if (usersWithProfile.length === 0) return null

    const task = await prisma.collabTask.create({
      data: {
        tenantId,
        title,
        description,
        status: 'PENDING',
        priority: 'HIGH',
        createdById,
        assignedToId: usersWithProfile[0].id,
      },
    })
    await prisma.collabTaskAssignee.createMany({
      data: usersWithProfile.map(u => ({ taskId: task.id, userId: u.id })),
    })
    return task.id
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule compiler — natural language → JavaScript code (runs ONCE at save time)
// ─────────────────────────────────────────────────────────────────────────────

export async function compileRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { ruleText, objectType } = req.body
    if (!ruleText) throw new AppError(400, 'VALIDATION_ERROR', 'ruleText es requerido')
    if (!objectType) throw new AppError(400, 'VALIDATION_ERROR', 'objectType es requerido')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new AppError(503, 'AI_UNAVAILABLE', 'ANTHROPIC_API_KEY no configurado')

    const schema = OBJECT_DATA_SCHEMAS[objectType] ?? {}

    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Convierte la siguiente regla de negocio a código JavaScript puro.

REGLA: "${ruleText}"

El código es el CUERPO de una función que recibe el parámetro "objectData".
Estructura disponible de objectData para el tipo "${objectType}":
${JSON.stringify(schema, null, 2)}

INSTRUCCIONES CRÍTICAS:
- Responde ÚNICAMENTE con el código JavaScript, sin markdown, sin comentarios, sin función wrapper
- El código debe terminar con "return true;" o "return false;"
- Usa solo operadores básicos: >, <, >=, <=, ===, !==, &&, ||, !
- No uses fetch, require, import, eval ni acceso a variables globales
- USA EXACTAMENTE los nombres de campo del schema anterior — no inventes nombres
- Si la regla menciona múltiples condiciones (Y, O, etc.), inclúyelas TODAS en el código
- DISTINCIÓN IMPORTANTE: "cliente" y "organización" son campos DIFERENTES:
  * "cliente" → objectData.cliente (quién compra)
  * "organización" / "campo de organización" → objectData.organizacion (estructura interna a la que pertenece la orden)

EJEMPLOS:
Regla "monto total mayor a 50000" → return objectData.total > 50000;
Regla "cliente es AFMF Asociación de Flag Football" → return objectData.cliente === 'AFMF Asociación de Flag Football de México';
Regla "cliente contiene AFMF" → return objectData.cliente.includes('AFMF');
Regla "organización sea Expo Santa Fe" → return objectData.organizacion === 'Expo Santa Fe';
Regla "campo de organización sea Expo Santa Fe" → return objectData.organizacion === 'Expo Santa Fe';
Regla "RFC del cliente no sea vacío" → return !!objectData.clienteRfc;
Regla "RFC no sea nulo" → return objectData.clienteRfc !== null && objectData.clienteRfc !== '';
Regla "RFC del cliente sea XAXX010101000" → return objectData.clienteRfc === 'XAXX010101000';
Regla "total mayor a 50000 y cliente sea AFMF y organización sea Expo Santa Fe" → return objectData.total > 50000 && objectData.cliente.includes('AFMF') && objectData.organizacion === 'Expo Santa Fe';
Regla "total mayor a 50000 y organización sea Expo Santa Fe y RFC no vacío y cliente sea AFMF" → return objectData.total > 50000 && objectData.organizacion === 'Expo Santa Fe' && !!objectData.clienteRfc && objectData.cliente.includes('AFMF');
Regla "proveedor activo" → return objectData.estado === 'ACTIVE';
Regla "más de 5 items" → return objectData.cantidadItems > 5;`,
      }],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    // Strip any accidental markdown fences
    const ruleCode = raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim() || 'return true;'

    res.json({ success: true, data: { ruleCode } })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listFlows(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType } = req.query as Record<string, string>
    const where: any = { tenantId: req.user!.tenantId }
    if (objectType) where.objectType = objectType

    const flows = await prisma.approvalFlow.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: FLOW_STEP_INCLUDE,
        },
        _count: { select: { requests: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: flows })
  } catch (err) {
    next(err)
  }
}

export async function createFlow(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, objectType, targetStatus, activationConditionsText, finalEffectsText, autoTrigger, blocksTransition, minAmount, ruleCode, steps = [] } = req.body

    if (!name) throw new AppError(400, 'VALIDATION_ERROR', 'El nombre es requerido')
    if (!objectType) throw new AppError(400, 'VALIDATION_ERROR', 'El tipo de objeto es requerido')
    if (!targetStatus) throw new AppError(400, 'VALIDATION_ERROR', 'El estado destino es requerido')

    const flow = await prisma.$transaction(async (tx) => {
      const created = await tx.approvalFlow.create({
        data: {
          tenantId: req.user!.tenantId,
          name,
          description: description ?? null,
          objectType,
          targetStatus,
          activationConditionsText: activationConditionsText ?? null,
          finalEffectsText: finalEffectsText ?? null,
          autoTrigger: autoTrigger ?? false,
          blocksTransition: blocksTransition !== undefined ? blocksTransition : true,
          minAmount: minAmount != null ? minAmount : null,
          ruleCode: ruleCode ?? null,
          createdById: req.user!.userId,
        },
      })

      if (steps.length > 0) {
        await tx.approvalFlowStep.createMany({
          data: steps.map((s: any, idx: number) => ({
            flowId: created.id,
            order: s.order ?? idx,
            name: s.name,
            description: s.description ?? null,
            stepType: s.stepType ?? 'APPROVAL',
            assigneeType: s.assigneeType,
            assigneeUserId: s.assigneeUserId ?? null,
            assigneeProfileId: s.assigneeProfileId ?? null,
          })),
        })
      }

      return tx.approvalFlow.findUnique({
        where: { id: created.id },
        include: {
          steps: {
            orderBy: { order: 'asc' },
            include: FLOW_STEP_INCLUDE,
          },
        },
      })
    })

    res.status(201).json({ success: true, data: flow })
  } catch (err) {
    next(err)
  }
}

export async function getFlow(req: Request, res: Response, next: NextFunction) {
  try {
    const flow = await prisma.approvalFlow.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: FLOW_STEP_INCLUDE,
        },
        _count: { select: { requests: true } },
      },
    })

    if (!flow) throw new AppError(404, 'NOT_FOUND', 'Flujo de aprobación no encontrado')

    res.json({ success: true, data: flow })
  } catch (err) {
    next(err)
  }
}

export async function updateFlow(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.approvalFlow.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Flujo de aprobación no encontrado')

    const { name, description, activationConditionsText, finalEffectsText, isActive, autoTrigger, blocksTransition, minAmount, ruleCode, steps } = req.body

    const flow = await prisma.$transaction(async (tx) => {
      await tx.approvalFlow.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(activationConditionsText !== undefined && { activationConditionsText }),
          ...(finalEffectsText !== undefined && { finalEffectsText }),
          ...(isActive !== undefined && { isActive }),
          ...(autoTrigger !== undefined && { autoTrigger }),
          ...(blocksTransition !== undefined && { blocksTransition }),
          ...(minAmount !== undefined && { minAmount: minAmount != null ? minAmount : null }),
          ...(ruleCode !== undefined && { ruleCode: ruleCode ?? null }),
        },
      })

      if (steps !== undefined) {
        // Get existing step IDs for this flow
        const existingSteps = await tx.approvalFlowStep.findMany({
          where: { flowId: req.params.id },
          select: { id: true },
        })
        const existingIds = new Set(existingSteps.map(s => s.id))

        // Payload step IDs that already exist in the DB (to be updated, not recreated)
        const payloadIds = new Set(
          steps.filter((s: any) => s.id && existingIds.has(s.id)).map((s: any) => s.id as string)
        )

        // Delete steps that are no longer in the payload and are not referenced by active requests
        const referenced = await tx.approvalRequestStep.findMany({
          where: { step: { flowId: req.params.id } },
          select: { stepId: true },
        })
        const referencedIds = new Set(referenced.map(r => r.stepId))

        const idsToKeep = new Set([...payloadIds, ...referencedIds])
        await tx.approvalFlowStep.deleteMany({
          where: {
            flowId: req.params.id,
            ...(idsToKeep.size > 0 && { id: { notIn: [...idsToKeep] } }),
          },
        })

        // Update existing steps in-place; create new ones
        for (const [idx, s] of (steps as any[]).entries()) {
          const stepData = {
            order: s.order ?? idx,
            name: s.name,
            description: s.description ?? null,
            stepType: s.stepType ?? 'APPROVAL',
            assigneeType: s.assigneeType,
            assigneeUserId: s.assigneeUserId ?? null,
            assigneeProfileId: s.assigneeProfileId ?? null,
          }
          if (s.id && existingIds.has(s.id)) {
            await tx.approvalFlowStep.update({ where: { id: s.id }, data: stepData })
          } else {
            await tx.approvalFlowStep.create({ data: { flowId: req.params.id, ...stepData } })
          }
        }
      }

      return tx.approvalFlow.findUnique({
        where: { id: req.params.id },
        include: {
          steps: {
            orderBy: { order: 'asc' },
            include: FLOW_STEP_INCLUDE,
          },
        },
      })
    })

    res.json({ success: true, data: flow })
  } catch (err) {
    next(err)
  }
}

export async function deleteFlow(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.approvalFlow.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Flujo de aprobación no encontrado')

    // Cascade delete manually: request steps → requests → flow steps → flow
    await prisma.$transaction(async (tx) => {
      // Get all requests for this flow
      const requests = await tx.approvalRequest.findMany({
        where: { flowId: req.params.id },
        select: { id: true },
      })
      const requestIds = requests.map(r => r.id)

      // Delete request steps
      if (requestIds.length > 0) {
        await tx.approvalRequestStep.deleteMany({ where: { requestId: { in: requestIds } } })
        await tx.approvalRequest.deleteMany({ where: { id: { in: requestIds } } })
      }

      // Delete flow steps
      await tx.approvalFlowStep.deleteMany({ where: { flowId: req.params.id } })

      // Delete the flow itself
      await tx.approvalFlow.delete({ where: { id: req.params.id } })
    })

    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────────────────────

export async function listRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType, objectId, status } = req.query as Record<string, string>
    const where: any = { tenantId: req.user!.tenantId }
    if (objectType) where.objectType = objectType
    if (objectId) where.objectId = objectId
    if (status) where.status = status

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: requests })
  } catch (err) {
    next(err)
  }
}

export async function getActiveRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType, objectId } = req.query as Record<string, string>

    if (!objectType || !objectId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'objectType y objectId son requeridos')
    }

    const request = await prisma.approvalRequest.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        objectType: objectType as any,
        objectId,
        status: 'IN_PROGRESS',
      },
      include: {
        flow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: FLOW_STEP_INCLUDE,
            },
          },
        },
        triggeredBy: { select: { id: true, firstName: true, lastName: true } },
        steps: {
          orderBy: { order: 'asc' },
          include: {
            step: { select: { name: true, stepType: true, assigneeType: true, assigneeUserId: true, assigneeProfileId: true } },
            reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    res.json({ success: true, data: request ?? null })
  } catch (err) {
    next(err)
  }
}

export async function triggerRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { flowId, objectType, objectId } = req.body

    if (!flowId || !objectType || !objectId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'flowId, objectType y objectId son requeridos')
    }

    // Check no IN_PROGRESS request already exists for this object
    const existing = await prisma.approvalRequest.findFirst({
      where: { tenantId: req.user!.tenantId, objectType, objectId, status: 'IN_PROGRESS' },
    })
    if (existing) {
      throw new AppError(400, 'CONFLICT', 'Ya existe una solicitud de aprobación en progreso para este objeto')
    }

    // Load the flow with steps
    const flow = await prisma.approvalFlow.findFirst({
      where: { id: flowId, tenantId: req.user!.tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    if (!flow) throw new AppError(404, 'NOT_FOUND', 'Flujo de aprobación no encontrado')
    if (flow.steps.length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'El flujo no tiene pasos definidos')

    const firstStep = flow.steps[0]

    const approvalRequest = await prisma.$transaction(async (tx) => {
      // Create the request
      const request = await tx.approvalRequest.create({
        data: {
          tenantId: req.user!.tenantId,
          flowId,
          objectType,
          objectId,
          status: 'IN_PROGRESS',
          currentStep: 0,
          triggeredById: req.user!.userId,
        },
      })

      // Create all request steps
      const requestSteps = await Promise.all(
        flow.steps.map((s) =>
          tx.approvalRequestStep.create({
            data: {
              requestId: request.id,
              stepId: s.id,
              order: s.order,
              status: 'PENDING',
            },
          })
        )
      )

      // Create CollabTask for first step outside tx (needs full prisma context for profile lookup)
      // We'll update the taskId after the tx
      const firstRequestStep = requestSteps.find(rs => rs.order === firstStep.order)!

      return { request, firstRequestStep, firstStep }
    })

    // Create task for first step (outside transaction to allow profile user lookup)
    const taskId = await createTaskForStep(
      req.user!.tenantId,
      req.user!.userId,
      flow.name,
      firstStep.order,
      firstStep.name,
      firstStep.description,
      objectType,
      objectId,
      firstStep.assigneeType,
      firstStep.assigneeUserId,
      firstStep.assigneeProfileId,
    )

    if (taskId) {
      await prisma.approvalRequestStep.update({
        where: { id: approvalRequest.firstRequestStep.id },
        data: { taskId },
      })
      notifyTaskById(taskId, req.user!.tenantId, 'created')
    }

    // Auto-advance if first step is NOTIFICATION
    await autoAdvanceNotifications(req.user!.tenantId, req.user!.userId, approvalRequest.request.id)

    const result = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequest.request.id },
      include: REQUEST_INCLUDE,
    })

    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function reviewStep(req: Request, res: Response, next: NextFunction) {
  try {
    const { requestId, stepId } = req.params
    const { action, reason } = req.body

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'action debe ser APPROVE o REJECT')
    }

    // Load the request
    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId, tenantId: req.user!.tenantId },
      include: {
        flow: { include: { steps: { orderBy: { order: 'asc' } } } },
        steps: { orderBy: { order: 'asc' } },
      },
    })
    if (!request) throw new AppError(404, 'NOT_FOUND', 'Solicitud de aprobación no encontrada')
    if (request.status !== 'IN_PROGRESS') {
      throw new AppError(400, 'INVALID_STATUS', 'La solicitud no está en progreso')
    }

    // Find the request step
    const requestStep = request.steps.find(s => s.stepId === stepId)
    if (!requestStep) throw new AppError(404, 'NOT_FOUND', 'Paso no encontrado en esta solicitud')
    if (requestStep.status !== 'PENDING') {
      throw new AppError(400, 'INVALID_STATUS', 'Este paso ya fue revisado')
    }

    const now = new Date()

    if (action === 'APPROVE') {
      // Find the next step (by order)
      const nextStep = request.steps.find(s => s.order === requestStep.order + 1)

      // Capture info needed AFTER transaction to create task + notify
      let nextStepTaskInfo: { flowStep: any; reqStepId: string } | null = null

      await prisma.$transaction(async (tx) => {
        // Update current request step
        await tx.approvalRequestStep.update({
          where: { id: requestStep.id },
          data: {
            status: 'APPROVED',
            reviewedById: req.user!.userId,
            reviewedAt: now,
            reason: reason ?? null,
          },
        })

        if (nextStep) {
          // Advance to next step
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { currentStep: nextStep.order },
          })
          // Capture flow step info for post-transaction task creation
          const nextFlowStep = request.flow.steps.find(s => s.id === nextStep.stepId)
          if (nextFlowStep) nextStepTaskInfo = { flowStep: nextFlowStep, reqStepId: nextStep.id }
        } else {
          // No next step — request is fully approved
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED', completedAt: now },
          })
        }
      })

      // Create task OUTSIDE transaction to avoid connection/timeout issues
      if (nextStepTaskInfo) {
        const { flowStep, reqStepId } = nextStepTaskInfo as { flowStep: any; reqStepId: string }
        const taskId = await createTaskForStep(
          req.user!.tenantId,
          req.user!.userId,
          request.flow.name,
          flowStep.order,
          flowStep.name,
          flowStep.description,
          request.objectType,
          request.objectId,
          flowStep.assigneeType,
          flowStep.assigneeUserId,
          flowStep.assigneeProfileId,
        )
        if (taskId) {
          await prisma.approvalRequestStep.update({ where: { id: reqStepId }, data: { taskId } })
          notifyTaskById(taskId, req.user!.tenantId, 'created')
        }
      }

      // Auto-complete the linked CollabTask (DONE = approved)
      if (requestStep.taskId) {
        await prisma.collabTask.update({
          where: { id: requestStep.taskId },
          data: { status: 'DONE', completedAt: now },
        })
      }

      // Auto-advance if next step is NOTIFICATION
      await autoAdvanceNotifications(req.user!.tenantId, req.user!.userId, requestId)
    } else {
      // REJECT: go back to previous step (or reject entirely if step 0)
      const prevStep = request.steps.find(s => s.order === requestStep.order - 1)

      // Capture info needed AFTER transaction to create task + notify
      let prevStepTaskInfo: { flowStep: any; reqStepId: string } | null = null

      await prisma.$transaction(async (tx) => {
        // Update current step to rejected
        await tx.approvalRequestStep.update({
          where: { id: requestStep.id },
          data: {
            status: 'REJECTED',
            reviewedById: req.user!.userId,
            reviewedAt: now,
            reason: reason ?? null,
          },
        })

        if (prevStep) {
          // Go back to previous step
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { currentStep: prevStep.order },
          })

          // Reset previous step to PENDING
          await tx.approvalRequestStep.update({
            where: { id: prevStep.id },
            data: { status: 'PENDING', reviewedById: null, reviewedAt: null, reason: null },
          })

          // Capture flow step info for post-transaction task creation
          const prevFlowStep = request.flow.steps.find(s => s.id === prevStep.stepId)
          if (prevFlowStep) prevStepTaskInfo = { flowStep: prevFlowStep, reqStepId: prevStep.id }
        } else {
          // No previous step — fully rejected
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED', completedAt: now },
          })
        }
      })

      // Create task OUTSIDE transaction to avoid connection/timeout issues
      if (prevStepTaskInfo) {
        const { flowStep, reqStepId } = prevStepTaskInfo as { flowStep: any; reqStepId: string }
        const taskId = await createTaskForStep(
          req.user!.tenantId,
          req.user!.userId,
          request.flow.name,
          flowStep.order,
          flowStep.name,
          flowStep.description,
          request.objectType,
          request.objectId,
          flowStep.assigneeType,
          flowStep.assigneeUserId,
          flowStep.assigneeProfileId,
        )
        if (taskId) {
          await prisma.approvalRequestStep.update({ where: { id: reqStepId }, data: { taskId } })
          notifyTaskById(taskId, req.user!.tenantId, 'created')
        }
      }

      // Auto-cancel the linked CollabTask (CANCELLED = rejected)
      if (requestStep.taskId) {
        await prisma.collabTask.update({
          where: { id: requestStep.taskId },
          data: { status: 'CANCELLED', completedAt: now },
        })
      }
    }

    const result = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    })

    // Audit log on the target object
    const reviewer = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { firstName: true, lastName: true },
    })
    await auditService.log(
      req.user!.tenantId,
      req.user!.userId,
      request.objectType,
      request.objectId,
      'UPDATE',
      null,
      {
        approvalAction: action,
        flowName: request.flow.name,
        stepName: requestStep.step?.name,
        stepOrder: requestStep.order + 1,
        reason: reason ?? null,
        reviewedBy: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : req.user!.email,
      },
      req.ip,
    )

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function cancelRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.params

    const request = await prisma.approvalRequest.findFirst({
      where: { id: requestId, tenantId: req.user!.tenantId },
    })
    if (!request) throw new AppError(404, 'NOT_FOUND', 'Solicitud de aprobación no encontrada')

    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', completedAt: new Date() },
      include: REQUEST_INCLUDE,
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule tester — evaluate compiled ruleCode against a real object
// ─────────────────────────────────────────────────────────────────────────────

export async function testRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType, objectId, ruleCode } = req.body
    if (!objectType || !objectId || !ruleCode) {
      throw new AppError(400, 'VALIDATION_ERROR', 'objectType, objectId y ruleCode son requeridos')
    }

    const objectData = await fetchObjectData(objectType, objectId)
    if (!objectData || Object.keys(objectData).length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Objeto no encontrado')
    }

    let result = false
    let error: string | undefined
    try {
      // eslint-disable-next-line no-new-func
      result = Boolean(new Function('objectData', ruleCode)(objectData))
    } catch (e: any) {
      error = e.message
    }

    res.json({ success: true, data: { result, objectData, error } })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Object search — return objects of a given type for the rule tester selector
// ─────────────────────────────────────────────────────────────────────────────

export async function searchObjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { objectType, q } = req.query as Record<string, string>
    const tenantId = req.user!.tenantId
    let results: Array<{ id: string; label: string }> = []

    if (objectType === 'ORDER' || objectType === 'BUDGET_ORDER') {
      const orders = await prisma.order.findMany({
        where: {
          tenantId,
          isBudgetOrder: objectType === 'BUDGET_ORDER',
          ...(q ? {
            OR: [
              { orderNumber: { contains: q, mode: 'insensitive' } },
              { client: { companyName: { contains: q, mode: 'insensitive' } } },
            ],
          } : {}),
        },
        select: { id: true, orderNumber: true, client: { select: { companyName: true, firstName: true, lastName: true } } },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
      results = orders.map(o => ({
        id: o.id,
        label: `#${o.orderNumber} — ${o.client?.companyName ?? `${o.client?.firstName ?? ''} ${o.client?.lastName ?? ''}`.trim()}`,
      }))
    }

    if (objectType === 'EVENT') {
      const events = await prisma.event.findMany({
        where: {
          tenantId,
          ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        },
        select: { id: true, name: true, code: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
      results = events.map(e => ({ id: e.id, label: `${e.name}${e.code ? ` (${e.code})` : ''}` }))
    }

    if (objectType === 'SUPPLIER') {
      const suppliers = await prisma.supplier.findMany({
        where: {
          tenantId,
          ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        },
        select: { id: true, name: true },
        take: 20,
        orderBy: { name: 'asc' },
      })
      results = suppliers.map(s => ({ id: s.id, label: s.name }))
    }

    if (objectType === 'PURCHASE_ORDER') {
      const pos = await prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          ...(q ? { poNumber: { contains: q, mode: 'insensitive' } } : {}),
        },
        select: { id: true, poNumber: true, supplier: { select: { name: true } } },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
      results = pos.map(p => ({ id: p.id, label: `OC #${p.poNumber} — ${p.supplier?.name ?? ''}` }))
    }

    if (objectType === 'COLLAB_TASK') {
      const tasks = await prisma.collabTask.findMany({
        where: {
          tenantId,
          ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
        },
        select: { id: true, title: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
      results = tasks.map(t => ({ id: t.id, label: t.title }))
    }

    res.json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
}
