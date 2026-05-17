import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { getUserDepartmentIds } from '../middleware/departmentScope'
import { auditService } from '../services/audit.service'
import { emailService } from '../services/email.service'
import { sendWhatsAppMessage, isWhatsAppConfigured } from '../services/whatsapp.service'

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const createCollabTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'CANCELLED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  assignedToId: z.string().uuid().optional().nullable(),
  assignedToIds: z.array(z.string().uuid()).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  departmentIds: z.array(z.string().uuid()).default([]),
  orderIds: z.array(z.string().uuid()).default([]),
})

const en = (v: unknown) => (v === '' ? null : v)

// Update schema — permissive: no strict format checks, allows null/empty for all fields
const updateCollabTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.preprocess(en, z.string().optional().nullable()),
  startDate: z.preprocess(en, z.string().optional().nullable()),
  endDate: z.preprocess(en, z.string().optional().nullable()),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  assignedToId: z.preprocess(en, z.string().optional().nullable()),
  assignedToIds: z.array(z.string()).optional().nullable(),
  eventId: z.preprocess(en, z.string().optional().nullable()),
  clientId: z.preprocess(en, z.string().optional().nullable()),
  departmentIds: z.array(z.string()).nullable().optional(),
  orderIds: z.array(z.string()).nullable().optional(),
}).strip()

// ─────────────────────────────────────────────────────────────────────────────
// Include Objects
// ─────────────────────────────────────────────────────────────────────────────

const COLLAB_TASK_INCLUDE = {
  assignedTo: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  event: { select: { id: true, name: true, code: true } },
  client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
  departments: { include: { department: { select: { id: true, name: true } } } },
  orders: { include: { order: { select: { id: true, orderNumber: true } } } },
  documents: {
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  comments: {
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  approvalRequestStep: {
    include: {
      step: { select: { id: true, name: true, order: true, assigneeType: true, assigneeUserId: true, assigneeProfileId: true } },
      request: {
        select: {
          id: true,
          objectType: true,
          objectId: true,
          flow: { select: { id: true, name: true } },
          triggeredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Object label fetcher — enriches approval task with human-readable object info
// ─────────────────────────────────────────────────────────────────────────────

async function fetchObjectLabel(objectType: string, objectId: string): Promise<string> {
  try {
    if (objectType === 'ORDER' || objectType === 'BUDGET_ORDER') {
      const order = await prisma.order.findUnique({
        where: { id: objectId },
        select: {
          orderNumber: true,
          isBudgetOrder: true,
          event: { select: { name: true } },
          client: { select: { companyName: true, firstName: true, lastName: true } },
        },
      })
      if (!order) return objectId
      const tipo = order.isBudgetOrder ? 'Presupuesto' : 'Orden de Servicio'
      const clientName = order.client?.companyName ?? `${order.client?.firstName ?? ''} ${order.client?.lastName ?? ''}`.trim()
      const parts = [`${tipo} #${order.orderNumber}`]
      if (order.event?.name) parts.push(`Evento: ${order.event.name}`)
      else if (clientName) parts.push(`Cliente: ${clientName}`)
      return parts.join(' — ')
    }
    if (objectType === 'EVENT') {
      const event = await prisma.event.findUnique({
        where: { id: objectId },
        select: { name: true, code: true },
      })
      if (!event) return objectId
      return `Evento: ${event.name}${event.code ? ` (${event.code})` : ''}`
    }
    if (objectType === 'SUPPLIER') {
      const supplier = await prisma.supplier.findUnique({
        where: { id: objectId },
        select: { name: true },
      })
      return supplier ? `Proveedor: ${supplier.name}` : objectId
    }
    if (objectType === 'PURCHASE_ORDER') {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: objectId },
        select: { poNumber: true, supplier: { select: { name: true } } },
      })
      if (!po) return objectId
      return `OC #${po.poNumber}${po.supplier?.name ? ` — ${po.supplier.name}` : ''}`
    }
  } catch {
    // Swallow — don't break task fetch
  }
  return objectId
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility Filter
// ─────────────────────────────────────────────────────────────────────────────

async function buildVisibilityFilter(req: Request) {
  if (req.user!.role === 'ADMIN') return {}
  const deptIds = await getUserDepartmentIds(req)
  if (!deptIds || deptIds.length === 0) return { id: { in: [] } } // no departments = see nothing
  return { departments: { some: { departmentId: { in: deptIds } } } }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification (fire-and-forget)
// ─────────────────────────────────────────────────────────────────────────────

export interface NotifyCollabTaskResult {
  taskId: string
  action: string
  serviceStatus: { emailConfigured: boolean; whatsappConfigured: boolean }
  assigneeIds: string[]
  recipientCount: number
  recipients: Array<{
    id: string; name: string; email?: string | null; phone?: string | null
    notifyTaskEmail: boolean; notifyTaskWhatsapp: boolean
    emailResult: 'sent' | 'skipped' | 'error'; emailSkipReason?: string
    whatsappResult: 'sent' | 'skipped' | 'error'; whatsappSkipReason?: string
  }>
}

export async function notifyCollabTask(
  action: 'created' | 'assigned',
  task: any,
  tenantId: string,
): Promise<NotifyCollabTaskResult> {
  const tag = `[notifyCollabTask task=${task.id} action=${action}]`
  const result: NotifyCollabTaskResult = {
    taskId: task.id,
    action,
    serviceStatus: {
      emailConfigured: !!(process.env.SENDGRID_API_KEY),
      whatsappConfigured: isWhatsAppConfigured(),
    },
    assigneeIds: [],
    recipientCount: 0,
    recipients: [],
  }

  try {
    // ── Resolve object label + URL for linked object ──────────────────────
    let objectLabel: string | undefined
    let objectUrl: string | undefined
    const adminBase = process.env.ADMIN_URL || 'https://ivent-ia-admin.vercel.app'
    const reqStep = task.approvalRequestStep
    if (reqStep?.request?.objectType && reqStep?.request?.objectId) {
      objectLabel = await fetchObjectLabel(reqStep.request.objectType, reqStep.request.objectId)
      const objectRoutes: Record<string, string> = {
        ORDER: '/ordenes',
        BUDGET_ORDER: '/ordenes',
        EVENT: '/eventos',
        SUPPLIER: '/proveedores',
        PURCHASE_ORDER: '/catalogos/ordenes-compra',
      }
      const base = objectRoutes[reqStep.request.objectType]
      if (base) objectUrl = `${adminBase}${base}/${reqStep.request.objectId}`
    } else if (task.event) {
      objectLabel = `Evento: ${task.event.name}`
      objectUrl = `${adminBase}/eventos/${task.event.id}`
    } else if (task.orders?.[0]?.order) {
      objectLabel = `Orden #${task.orders[0].order.orderNumber}`
      objectUrl = `${adminBase}/ordenes/${task.orders[0].order.id}`
    }

    // ── Due date ─────────────────────────────────────────────────────────
    const dueDateFormatted = task.endDate
      ? new Date(task.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : undefined

    // ── Collect recipients with notification preferences ──────────────────
    const recipients = new Map<string, {
      id: string; email?: string | null; phone?: string | null
      firstName: string; lastName: string
      notifyTaskEmail: boolean; notifyTaskWhatsapp: boolean
    }>()

    const assigneeUserIds: string[] = (task.assignees && task.assignees.length > 0)
      ? task.assignees.map((a: any) => a.userId)
      : (task.assignedToId ? [task.assignedToId] : [])

    result.assigneeIds = assigneeUserIds
    console.log(`${tag} assigneeIds=${JSON.stringify(assigneeUserIds)} assignees_length=${task.assignees?.length ?? 'null'} assignedToId=${task.assignedToId}`)

    if (assigneeUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: assigneeUserIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, notifyTaskEmail: true, notifyTaskWhatsapp: true },
      })
      console.log(`${tag} users_found=${users.length} users=${JSON.stringify(users.map(u => ({ id: u.id, email: u.email, notifyTaskEmail: u.notifyTaskEmail, phone: u.phone, notifyTaskWhatsapp: u.notifyTaskWhatsapp })))}`)
      users.forEach(u => recipients.set(u.id, u))
    } else {
      console.warn(`${tag} no assigneeIds found — no notifications will be sent`)
    }

    const deptIds = (task.departments ?? []).map((d: any) => d.departmentId)
    if (deptIds.length > 0) {
      const deptUsers = await prisma.userDepartment.findMany({
        where: { departmentId: { in: deptIds } },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, notifyTaskEmail: true, notifyTaskWhatsapp: true } } },
      })
      deptUsers.forEach(du => recipients.set(du.user.id, du.user))
    }

    result.recipientCount = recipients.size
    console.log(`${tag} total_recipients=${recipients.size} emailConfigured=${result.serviceStatus.emailConfigured} waConfigured=${result.serviceStatus.whatsappConfigured}`)

    // ── Send to each recipient according to their preferences ─────────────
    const taskUrl = `${adminBase}/chat?tab=tareas&taskId=${task.id}`

    for (const [, user] of recipients) {
      const recipientEntry: NotifyCollabTaskResult['recipients'][0] = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        notifyTaskEmail: user.notifyTaskEmail,
        notifyTaskWhatsapp: user.notifyTaskWhatsapp,
        emailResult: 'skipped',
        whatsappResult: 'skipped',
      }

      // Email
      if (!user.notifyTaskEmail) {
        recipientEntry.emailSkipReason = 'notifyTaskEmail=false'
      } else if (!user.email) {
        recipientEntry.emailSkipReason = 'no email address'
      } else if (!result.serviceStatus.emailConfigured) {
        recipientEntry.emailSkipReason = 'SENDGRID_API_KEY not configured'
      } else {
        try {
          await emailService.sendCollabTaskNotification({
            to: user.email,
            recipientName: `${user.firstName} ${user.lastName}`,
            taskTitle: task.title,
            taskDescription: task.description ?? undefined,
            dueDate: dueDateFormatted,
            objectLabel,
            objectUrl,
            taskUrl,
            action,
          })
          recipientEntry.emailResult = 'sent'
          console.log(`${tag} email sent to ${user.email}`)
        } catch (err: any) {
          recipientEntry.emailResult = 'error'
          recipientEntry.emailSkipReason = err?.message ?? String(err)
          console.error(`${tag} email error for ${user.email}:`, err)
        }
      }

      // WhatsApp
      if (!user.notifyTaskWhatsapp) {
        recipientEntry.whatsappSkipReason = 'notifyTaskWhatsapp=false'
      } else if (!user.phone) {
        recipientEntry.whatsappSkipReason = 'no phone number'
      } else if (!result.serviceStatus.whatsappConfigured) {
        recipientEntry.whatsappSkipReason = 'Twilio not configured'
      } else {
        const lines = [
          `${action === 'created' ? '📋 Nueva tarea asignada' : '👤 Tarea asignada'}: *${task.title}*`,
          task.description ? task.description : null,
          dueDateFormatted ? `📅 Vence: ${dueDateFormatted}` : null,
          objectLabel ? `🔗 ${objectLabel}: ${objectUrl ?? ''}` : null,
          `Ver tarea: ${taskUrl}`,
        ].filter(Boolean)
        try {
          await sendWhatsAppMessage({ to: user.phone, message: lines.join('\n') })
          recipientEntry.whatsappResult = 'sent'
          console.log(`${tag} WhatsApp sent to ${user.phone}`)
        } catch (err: any) {
          recipientEntry.whatsappResult = 'error'
          recipientEntry.whatsappSkipReason = err?.message ?? String(err)
          console.error(`${tag} WhatsApp error for ${user.phone}:`, err)
        }
      }

      result.recipients.push(recipientEntry)

      // Log notification record
      const channels: string[] = []
      if (recipientEntry.emailResult === 'sent') channels.push('email')
      if (recipientEntry.whatsappResult === 'sent') channels.push('whatsapp')
      if (channels.length > 0) {
        await prisma.notification.create({
          data: {
            tenantId,
            recipientType: 'USER',
            recipientId: user.id,
            channel: channels.join(','),
            templateKey: `collab_task_${action}`,
            payload: { taskId: task.id, taskTitle: task.title },
            status: 'sent',
            sentAt: new Date(),
          },
        }).catch(err => console.error(`${tag} notification log error:`, err))
      }
    }

    console.log(`${tag} done — result=${JSON.stringify({ recipientCount: result.recipientCount, recipients: result.recipients.map(r => ({ name: r.name, emailResult: r.emailResult, emailSkipReason: r.emailSkipReason, whatsappResult: r.whatsappResult, whatsappSkipReason: r.whatsappSkipReason })) })}`)
  } catch (err) {
    console.error(`${tag} unhandled error:`, err)
    throw err
  }

  return result
}

/**
 * Admin endpoint: test the notification for a specific task synchronously.
 * Returns the full diagnostic result without side-effects.
 */
export async function testTaskNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId: req.user!.tenantId },
      include: COLLAB_TASK_INCLUDE,
    })
    if (!task) throw new AppError(404, 'NOT_FOUND', 'Tarea no encontrada')

    const result = await notifyCollabTask('created', task, req.user!.tenantId)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

/**
 * Fetch a task by ID and send its creation notification.
 * Used externally (e.g. from approvalFlows controller) after task creation.
 */
export async function notifyTaskById(taskId: string, tenantId: string, action: 'created' | 'assigned' = 'created') {
  try {
    const task = await prisma.collabTask.findUnique({
      where: { id: taskId },
      include: COLLAB_TASK_INCLUDE,
    })
    if (task) await notifyCollabTask(action, task, tenantId)
  } catch (err) {
    console.error('notifyTaskById error:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export async function listCollabTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, priority, departmentId, eventId, clientId, search, page = '1', pageSize = '20' } = req.query
    const tenantId = req.user!.tenantId

    const where: any = { tenantId, ...await buildVisibilityFilter(req) }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (departmentId) {
      where.departments = { some: { departmentId: departmentId as string } }
    }
    if (eventId) where.eventId = eventId
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const total = await prisma.collabTask.count({ where })

    const tasks = await prisma.collabTask.findMany({
      where,
      include: COLLAB_TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(pageSize as string),
      take: parseInt(pageSize as string),
    })

    res.json({ success: true, data: tasks, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) })
  } catch (err) {
    next(err)
  }
}

export async function createCollabTask(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validated = createCollabTaskSchema.parse(req.body)

    // Resolve assignee ids: prefer assignedToIds array, fall back to single assignedToId
    const assigneeIds = validated.assignedToIds?.length
      ? validated.assignedToIds
      : (validated.assignedToId ? [validated.assignedToId] : [])
    const primaryAssigneeId = assigneeIds[0] ?? null

    const task = await prisma.$transaction(async tx => {
      // Create task
      const newTask = await tx.collabTask.create({
        data: {
          tenantId,
          title: validated.title,
          description: validated.description,
          startDate: validated.startDate ? new Date(validated.startDate) : null,
          endDate: validated.endDate ? new Date(validated.endDate) : null,
          status: validated.status,
          priority: validated.priority,
          progress: validated.progress,
          assignedToId: primaryAssigneeId,
          createdById: userId,
          eventId: validated.eventId,
          clientId: validated.clientId,
        },
      })

      // Create assignee links
      if (assigneeIds.length > 0) {
        await tx.collabTaskAssignee.createMany({
          data: assigneeIds.map(uid => ({ taskId: newTask.id, userId: uid })),
          skipDuplicates: true,
        })
      }

      // Create department links
      if (validated.departmentIds.length > 0) {
        await tx.collabTaskDepartment.createMany({
          data: validated.departmentIds.map(deptId => ({
            taskId: newTask.id,
            departmentId: deptId,
          })),
        })
      }

      // Create order links
      if (validated.orderIds.length > 0) {
        await tx.collabTaskOrder.createMany({
          data: validated.orderIds.map(orderId => ({
            taskId: newTask.id,
            orderId,
          })),
        })
      }

      return newTask
    })

    // Fetch full task with includes
    const fullTask = await prisma.collabTask.findUnique({
      where: { id: task.id },
      include: COLLAB_TASK_INCLUDE,
    })

    // Audit
    await auditService.log(tenantId, userId, 'CollabTask', task.id, 'CREATE', null, {
      title: task.title,
      assignedToId: task.assignedToId,
      departmentCount: validated.departmentIds.length,
    }, req?.ip)

    // Notify (fire-and-forget — don't block the HTTP response)
    notifyCollabTask('created', fullTask, tenantId).catch(err => console.error('[createCollabTask] notification error:', err))

    res.status(201).json({ success: true, data: fullTask })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.flatten() })
    }
    next(err)
  }
}

export async function getCollabTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const tenantId = req.user!.tenantId

    const visibilityFilter = await buildVisibilityFilter(req)
    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...visibilityFilter },
      include: COLLAB_TASK_INCLUDE,
    })

    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    // Enrich approval step with human-readable object label
    let data: any = task
    if (task.approvalRequestStep?.request?.objectType && task.approvalRequestStep?.request?.objectId) {
      const objectLabel = await fetchObjectLabel(
        task.approvalRequestStep.request.objectType,
        task.approvalRequestStep.request.objectId,
      )
      data = { ...task, approvalRequestStep: { ...task.approvalRequestStep, objectLabel } }
    }

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function updateCollabTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validated = updateCollabTaskSchema.parse(req.body)

    const existingTask = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
    })

    if (!existingTask) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    // Resolve assignee ids: prefer assignedToIds array, fall back to single assignedToId
    const hasAssigneeUpdate = validated.assignedToIds !== undefined || validated.assignedToId !== undefined
    const assigneeIds = validated.assignedToIds?.length
      ? validated.assignedToIds
      : (validated.assignedToId ? [validated.assignedToId] : (validated.assignedToIds === null ? [] : undefined))
    const primaryAssigneeId = assigneeIds !== undefined
      ? (assigneeIds.length > 0 ? assigneeIds[0] : null)
      : undefined

    const updatedTask = await prisma.$transaction(async tx => {
      // Update task
      const updated = await tx.collabTask.update({
        where: { id: taskId },
        data: {
          title: validated.title,
          description: validated.description,
          startDate: validated.startDate === null ? null : (validated.startDate ? new Date(validated.startDate) : undefined),
          endDate: validated.endDate === null ? null : (validated.endDate ? new Date(validated.endDate) : undefined),
          status: validated.status,
          priority: validated.priority,
          progress: validated.progress,
          assignedToId: primaryAssigneeId,
          eventId: validated.eventId,
          clientId: validated.clientId,
          completedAt: validated.status === 'DONE' && !existingTask.completedAt ? new Date() : undefined,
        },
      })

      // Update assignee links if provided
      if (assigneeIds !== undefined) {
        await tx.collabTaskAssignee.deleteMany({ where: { taskId } })
        if (assigneeIds.length > 0) {
          await tx.collabTaskAssignee.createMany({
            data: assigneeIds.map(uid => ({ taskId, userId: uid })),
            skipDuplicates: true,
          })
        }
      }

      // Update department links if provided (null or array = reset)
      const deptIds = validated.departmentIds
      if (deptIds !== undefined) {
        await tx.collabTaskDepartment.deleteMany({ where: { taskId } })
        if (deptIds && deptIds.length > 0) {
          await tx.collabTaskDepartment.createMany({
            data: deptIds.map(deptId => ({ taskId, departmentId: deptId })),
          })
        }
      }

      // Update order links if provided (null or array = reset)
      const oIds = validated.orderIds
      if (oIds !== undefined) {
        await tx.collabTaskOrder.deleteMany({ where: { taskId } })
        if (oIds && oIds.length > 0) {
          await tx.collabTaskOrder.createMany({
            data: oIds.map(orderId => ({ taskId, orderId })),
          })
        }
      }

      return updated
    })

    // Fetch full task with includes
    const fullTask = await prisma.collabTask.findUnique({
      where: { id: taskId },
      include: COLLAB_TASK_INCLUDE,
    })

    // Audit
    await auditService.log(tenantId, userId, 'CollabTask', taskId, 'UPDATE', existingTask, updatedTask, req?.ip)

    // Notify if assignees changed (fire-and-forget — don't block the HTTP response)
    if (assigneeIds !== undefined && assigneeIds.length > 0) {
      notifyCollabTask('assigned', fullTask, tenantId).catch(err => console.error('[updateCollabTask] notification error:', err))
    }

    res.json({ success: true, data: fullTask })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: err.flatten() })
    }
    next(err)
  }
}

export async function deleteCollabTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
    })

    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    await prisma.collabTask.delete({ where: { id: taskId } })

    // Audit
    await auditService.log(tenantId, userId, 'CollabTask', taskId, 'DELETE', task, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────────────────────────────────────

export async function listCollabTaskComments(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const tenantId = req.user!.tenantId

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
      select: { id: true },
    })
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    const comments = await prisma.collabTaskComment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ success: true, data: comments })
  } catch (err) {
    next(err)
  }
}

export async function addCollabTaskComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params
    const { content } = req.body
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    if (!content || typeof content !== 'string') {
      throw new AppError(400, 'INVALID_CONTENT', 'Content is required')
    }

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
      select: { id: true },
    })
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    const comment = await prisma.collabTaskComment.create({
      data: {
        taskId,
        tenantId,
        authorId: userId,
        content,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    })

    res.status(201).json({ success: true, data: comment })
  } catch (err) {
    next(err)
  }
}

export async function deleteCollabTaskComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId, commentId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const task = await prisma.collabTask.findFirst({
      where: { id: taskId, tenantId, ...await buildVisibilityFilter(req) },
      select: { id: true },
    })
    if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')

    const comment = await prisma.collabTaskComment.findFirst({
      where: { id: commentId, taskId },
    })
    if (!comment) throw new AppError(404, 'COMMENT_NOT_FOUND', 'Comment not found')

    // Only comment author or admin can delete
    if (comment.authorId !== userId && req.user!.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Cannot delete another user\'s comment')
    }

    await prisma.collabTaskComment.delete({ where: { id: commentId } })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Activities (Assigned to current user)
// ─────────────────────────────────────────────────────────────────────────────

export async function listMyEventActivities(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.id

    const activities = await prisma.eventActivity.findMany({
      where: { tenantId, assignedToId: userId },
      include: {
        event: { select: { id: true, name: true, code: true } },
        activityDepartments: {
          include: { department: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ endDate: 'asc' }, { startDate: 'asc' }],
    })

    res.json({ success: true, data: activities })
  } catch (err) {
    next(err)
  }
}
