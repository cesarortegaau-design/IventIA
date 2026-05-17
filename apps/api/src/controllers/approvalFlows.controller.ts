import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

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
      step: { select: { name: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
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
    const { name, description, objectType, targetStatus, activationConditionsText, finalEffectsText, autoTrigger, blocksTransition, minAmount, steps = [] } = req.body

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

    const { name, description, activationConditionsText, finalEffectsText, isActive, autoTrigger, blocksTransition, minAmount, steps } = req.body

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
        },
      })

      if (steps !== undefined) {
        // Only delete steps that are NOT referenced by any request step (FK constraint guard)
        const referenced = await tx.approvalRequestStep.findMany({
          where: { step: { flowId: req.params.id } },
          select: { stepId: true },
        })
        const referencedIds = new Set(referenced.map(r => r.stepId))

        await tx.approvalFlowStep.deleteMany({
          where: {
            flowId: req.params.id,
            ...(referencedIds.size > 0 && { id: { notIn: [...referencedIds] } }),
          },
        })

        if (steps.length > 0) {
          await tx.approvalFlowStep.createMany({
            data: steps.map((s: any, idx: number) => ({
              flowId: req.params.id,
              order: s.order ?? idx,
              name: s.name,
              description: s.description ?? null,
              assigneeType: s.assigneeType,
              assigneeUserId: s.assigneeUserId ?? null,
              assigneeProfileId: s.assigneeProfileId ?? null,
            })),
          })
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

    const inProgress = await prisma.approvalRequest.count({
      where: { flowId: req.params.id, status: 'IN_PROGRESS' },
    })
    if (inProgress > 0) {
      throw new AppError(400, 'CONFLICT', 'No se puede eliminar un flujo con solicitudes en progreso')
    }

    await prisma.approvalFlow.delete({ where: { id: req.params.id } })

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
            step: { select: { name: true, assigneeType: true, assigneeUserId: true, assigneeProfileId: true } },
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
    }

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

          // Find the flow step for the next request step
          const nextFlowStep = request.flow.steps.find(s => s.id === nextStep.stepId)!

          // Create task for next step
          const taskId = await createTaskForStep(
            req.user!.tenantId,
            req.user!.userId,
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
            await tx.approvalRequestStep.update({
              where: { id: nextStep.id },
              data: { taskId },
            })
          }
        } else {
          // No next step — request is fully approved
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED', completedAt: now },
          })
        }
      })

      // Auto-complete the linked CollabTask (DONE = approved)
      if (requestStep.taskId) {
        await prisma.collabTask.update({
          where: { id: requestStep.taskId },
          data: { status: 'DONE', completedAt: now },
        })
      }
    } else {
      // REJECT: go back to previous step (or reject entirely if step 0)
      const prevStep = request.steps.find(s => s.order === requestStep.order - 1)

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

          // Find the flow step for the previous request step
          const prevFlowStep = request.flow.steps.find(s => s.id === prevStep.stepId)!

          // Create new task for prev step assignee
          const taskId = await createTaskForStep(
            req.user!.tenantId,
            req.user!.userId,
            request.flow.name,
            prevFlowStep.order,
            prevFlowStep.name,
            prevFlowStep.description,
            request.objectType,
            request.objectId,
            prevFlowStep.assigneeType,
            prevFlowStep.assigneeUserId,
            prevFlowStep.assigneeProfileId,
          )

          if (taskId) {
            await tx.approvalRequestStep.update({
              where: { id: prevStep.id },
              data: { taskId },
            })
          }
        } else {
          // No previous step — fully rejected
          await tx.approvalRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED', completedAt: now },
          })
        }
      })

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
