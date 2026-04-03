import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

// ─── Interactions ────────────────────────────────────────────────────────────

const interactionSchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'NOTE']),
  subject: z.string().min(1).max(300),
  notes: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
})

export async function listInteractions(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params
    const tenantId = req.user!.tenantId
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')

    const interactions = await prisma.clientInteraction.findMany({
      where: { clientId, tenantId },
      orderBy: { occurredAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        tasks: { select: { id: true, title: true, status: true, dueDate: true } },
      },
    })
    res.json({ success: true, data: interactions })
  } catch (err) {
    next(err)
  }
}

export async function createInteraction(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params
    const tenantId = req.user!.tenantId
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')

    const data = interactionSchema.parse(req.body)
    const interaction = await prisma.clientInteraction.create({
      data: {
        tenantId,
        clientId,
        type: data.type,
        subject: data.subject,
        notes: data.notes,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        createdById: req.user!.userId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.status(201).json({ success: true, data: interaction })
  } catch (err) {
    next(err)
  }
}

export async function updateInteraction(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, id } = req.params
    const tenantId = req.user!.tenantId
    const existing = await prisma.clientInteraction.findFirst({ where: { id, clientId, tenantId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Interaction not found')

    const data = interactionSchema.partial().parse(req.body)
    const interaction = await prisma.clientInteraction.update({
      where: { id },
      data: {
        ...data,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.json({ success: true, data: interaction })
  } catch (err) {
    next(err)
  }
}

export async function deleteInteraction(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, id } = req.params
    const tenantId = req.user!.tenantId
    const existing = await prisma.clientInteraction.findFirst({ where: { id, clientId, tenantId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Interaction not found')
    await prisma.clientInteraction.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  interactionId: z.string().uuid().optional(),
})

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params
    const tenantId = req.user!.tenantId
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')

    const tasks = await prisma.clientTask.findMany({
      where: { clientId, tenantId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.json({ success: true, data: tasks })
  } catch (err) {
    next(err)
  }
}

export async function listMyTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { status } = req.query as Record<string, string>
    const where: any = { tenantId, assignedToId: userId }
    if (status) where.status = status

    const tasks = await prisma.clientTask.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }],
      include: {
        client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.json({ success: true, data: tasks })
  } catch (err) {
    next(err)
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params
    const tenantId = req.user!.tenantId
    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')

    const data = taskSchema.parse(req.body)
    const task = await prisma.clientTask.create({
      data: {
        tenantId,
        clientId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assignedToId: data.assignedToId,
        interactionId: data.interactionId,
        createdById: req.user!.userId,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.status(201).json({ success: true, data: task })
  } catch (err) {
    next(err)
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, id } = req.params
    const tenantId = req.user!.tenantId
    const existing = await prisma.clientTask.findFirst({ where: { id, clientId, tenantId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Task not found')

    const data = taskSchema.partial().parse(req.body)
    const task = await prisma.clientTask.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.json({ success: true, data: task })
  } catch (err) {
    next(err)
  }
}

export async function completeTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, id } = req.params
    const tenantId = req.user!.tenantId
    const existing = await prisma.clientTask.findFirst({ where: { id, clientId, tenantId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Task not found')

    const task = await prisma.clientTask.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    res.json({ success: true, data: task })
  } catch (err) {
    next(err)
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, id } = req.params
    const tenantId = req.user!.tenantId
    const existing = await prisma.clientTask.findFirst({ where: { id, clientId, tenantId } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Task not found')
    await prisma.clientTask.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─── Client 360 ──────────────────────────────────────────────────────────────

export async function getClientSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params
    const tenantId = req.user!.tenantId

    const [client, interactions, tasks, orders, events] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, tenantId },
        include: { contacts: { where: { isActive: true } }, portalUser: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } } },
      }),
      prisma.clientInteraction.findMany({
        where: { clientId, tenantId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.clientTask.findMany({
        where: { clientId, tenantId, status: 'PENDING' },
        orderBy: { dueDate: 'asc' },
        include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.order.findMany({
        where: { clientId, tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, event: { select: { id: true, name: true } } },
      }),
      prisma.event.findMany({
        where: { primaryClientId: clientId, tenantId },
        orderBy: { eventStart: 'desc' },
        take: 5,
        select: { id: true, code: true, name: true, status: true, eventStart: true, eventEnd: true },
      }),
    ])

    if (!client) throw new AppError(404, 'CLIENT_NOT_FOUND', 'Client not found')

    res.json({
      success: true,
      data: { client, interactions, tasks, orders, events },
    })
  } catch (err) {
    next(err)
  }
}
