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
  eventId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  departmentIds: z.array(z.string().uuid()).default([]),
  orderIds: z.array(z.string().uuid()).default([]),
})

const updateCollabTaskSchema = createCollabTaskSchema.partial()

// ─────────────────────────────────────────────────────────────────────────────
// Include Objects
// ─────────────────────────────────────────────────────────────────────────────

const COLLAB_TASK_INCLUDE = {
  assignedTo: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
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

async function notifyCollabTask(
  action: 'created' | 'assigned',
  task: any,
  req: Request
) {
  // Fire and forget: don't await, don't block response
  Promise.allSettled([
    (async () => {
      const tenantId = req.user!.tenantId

      // Collect recipients
      const recipients = new Map<string, { email?: string; phone?: string; firstName: string; lastName: string }>()

      // Add assigned user if any
      if (task.assignedToId) {
        const user = await prisma.user.findUnique({
          where: { id: task.assignedToId },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        })
        if (user) {
          recipients.set(user.id, user)
        }
      }

      // Add all users in assigned departments
      const deptIds = task.departments.map((d: any) => d.departmentId)
      if (deptIds.length > 0) {
        const deptUsers = await prisma.userDepartment.findMany({
          where: { departmentId: { in: deptIds } },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
        })
        deptUsers.forEach(du => {
          recipients.set(du.user.id, du.user)
        })
      }

      // Send notifications to each recipient
      const taskUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/chat?tab=tareas&taskId=${task.id}`
      const subjectLine = action === 'created' ? `Nueva tarea asignada: ${task.title}` : `Tarea asignada: ${task.title}`
      const actionText = action === 'created' ? 'ha sido creada' : 'te ha sido asignada'

      for (const [, user] of recipients) {
        // Email
        if (user.email) {
          emailService.sendCollabTaskNotification({
            to: user.email,
            recipientName: `${user.firstName} ${user.lastName}`,
            taskTitle: task.title,
            taskUrl,
            action,
          }).catch(err => console.error('Email notification error:', err))
        }

        // WhatsApp
        if (user.phone && isWhatsAppConfigured()) {
          const message = `${action === 'created' ? '📋' : '👤'} Tarea: ${task.title} ${actionText}`
          sendWhatsAppMessage({
            to: user.phone,
            message,
          }).catch(err => console.error('WhatsApp notification error:', err))
        }

        // Log notification
        await prisma.notification.create({
          data: {
            tenantId,
            recipientType: 'USER',
            recipientId: user.id,
            channel: user.email ? 'email' : 'whatsapp',
            templateKey: `collab_task_${action}`,
            payload: { taskId: task.id, taskTitle: task.title },
            status: 'sent',
            sentAt: new Date(),
          },
        }).catch(err => console.error('Notification log error:', err))
      }
    })(),
  ]).catch(err => console.error('Notification error:', err))
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
          assignedToId: validated.assignedToId,
          createdById: userId,
          eventId: validated.eventId,
          clientId: validated.clientId,
        },
      })

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

    // Notify
    await notifyCollabTask('created', fullTask, req)

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
    res.json({ success: true, data: task })
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

    const updatedTask = await prisma.$transaction(async tx => {
      // Update task
      const updated = await tx.collabTask.update({
        where: { id: taskId },
        data: {
          title: validated.title,
          description: validated.description,
          startDate: validated.startDate ? new Date(validated.startDate) : undefined,
          endDate: validated.endDate ? new Date(validated.endDate) : undefined,
          status: validated.status,
          priority: validated.priority,
          progress: validated.progress,
          assignedToId: validated.assignedToId,
          eventId: validated.eventId,
          clientId: validated.clientId,
          completedAt: validated.status === 'DONE' && !existingTask.completedAt ? new Date() : undefined,
        },
      })

      // Update department links if provided
      if (validated.departmentIds) {
        await tx.collabTaskDepartment.deleteMany({ where: { taskId } })
        if (validated.departmentIds.length > 0) {
          await tx.collabTaskDepartment.createMany({
            data: validated.departmentIds.map(deptId => ({
              taskId,
              departmentId: deptId,
            })),
          })
        }
      }

      // Update order links if provided
      if (validated.orderIds) {
        await tx.collabTaskOrder.deleteMany({ where: { taskId } })
        if (validated.orderIds.length > 0) {
          await tx.collabTaskOrder.createMany({
            data: validated.orderIds.map(orderId => ({
              taskId,
              orderId,
            })),
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

    // Notify if assigned user changed
    if (validated.assignedToId && validated.assignedToId !== existingTask.assignedToId) {
      await notifyCollabTask('assigned', fullTask, req)
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
