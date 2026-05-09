import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'

const ACTIVITY_INCLUDE = {
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy:  { select: { id: true, firstName: true, lastName: true } },
  space:      { select: { id: true, phase: true, startTime: true, endTime: true, resource: { select: { id: true, name: true } } } },
  order:      { select: { id: true, orderNumber: true, status: true } },
  crmTask:    { select: { id: true, title: true, status: true } },
  activityDepartments: {
    include: { department: { select: { id: true, name: true } } },
  },
  activityOrders: {
    include: { order: { select: { id: true, orderNumber: true, status: true } } },
  },
  documents: {
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  children: {
    include: {
      assignedTo:          { select: { id: true, firstName: true, lastName: true } },
      order:               { select: { id: true, orderNumber: true, status: true } },
      activityDepartments: { include: { department: { select: { id: true, name: true } } } },
      activityOrders:      { include: { order: { select: { id: true, orderNumber: true, status: true } } } },
    },
    orderBy: [{ position: 'asc' as const }, { startDate: 'asc' as const }],
  },
}

const createActivitySchema = z.object({
  title:             z.string().min(1).max(300),
  description:       z.string().optional().nullable(),
  activityType:      z.enum(['TASK','MILESTONE','PHASE','MEETING','REHEARSAL','LOGISTICS','CATERING','TECHNICAL','SECURITY','CUSTOM']).default('TASK'),
  status:            z.enum(['PENDING','IN_PROGRESS','DONE','CANCELLED','BLOCKED']).default('PENDING'),
  priority:          z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  startDate:         z.string().datetime().optional().nullable(),
  endDate:           z.string().datetime().optional().nullable(),
  durationMins:      z.coerce.number().int().positive().optional().nullable(),
  assignedToId:      z.string().uuid().optional().nullable(),
  spaceId:           z.string().uuid().optional().nullable(),
  orderId:           z.string().uuid().optional().nullable(),
  crmTaskId:         z.string().uuid().optional().nullable(),
  autoCreateCrmTask: z.boolean().optional(),
  color:             z.string().max(30).optional().nullable(),
  position:          z.coerce.number().int().default(0),
  parentId:          z.string().uuid().optional().nullable(),
  notes:             z.string().optional().nullable(),
  departmentIds:     z.array(z.string().uuid()).optional().default([]),
  orderIds:          z.array(z.string().uuid()).optional().default([]),
})

const updateActivitySchema = createActivitySchema.partial()

const bulkReorderSchema = z.array(
  z.object({ id: z.string().uuid(), position: z.coerce.number().int() })
).min(1)

const importRowSchema = z.object({
  posicion:     z.coerce.number().int().default(0),
  titulo:       z.string().min(1).max(300),
  tipo:         z.string().optional(),
  estado:       z.string().optional(),
  prioridad:    z.string().optional(),
  fecha_inicio: z.string().optional().nullable(),
  fecha_fin:    z.string().optional().nullable(),
  duracion_min: z.coerce.number().int().positive().optional().nullable(),
  notas:        z.string().optional().nullable(),
})

const TYPE_MAP: Record<string, string> = {
  tarea: 'TASK', hito: 'MILESTONE', fase: 'PHASE', reunion: 'MEETING',
  ensayo: 'REHEARSAL', logistica: 'LOGISTICS', catering: 'CATERING',
  tecnico: 'TECHNICAL', seguridad: 'SECURITY', personalizado: 'CUSTOM',
}

const STATUS_MAP: Record<string, string> = {
  pendiente: 'PENDING', en_progreso: 'IN_PROGRESS', listo: 'DONE',
  cancelado: 'CANCELLED', bloqueado: 'BLOCKED',
}

const PRIORITY_MAP: Record<string, string> = {
  baja: 'LOW', media: 'MEDIUM', alta: 'HIGH', critica: 'CRITICAL',
}

function normalizeEnum(value: string | undefined, map: Record<string, string>, validValues: string[], fallback: string): string {
  if (!value) return fallback
  const upper = value.toUpperCase()
  if (validValues.includes(upper)) return upper
  return map[value.toLowerCase().replace(/\s+/g, '_')] ?? fallback
}

export async function listEventActivities(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const activities = await prisma.eventActivity.findMany({
      where:   { eventId, tenantId, parentId: null },
      include: ACTIVITY_INCLUDE,
      orderBy: [{ position: 'asc' }, { startDate: 'asc' }],
    })

    res.json({ success: true, data: activities })
  } catch (err) {
    next(err)
  }
}

export async function createEventActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId    = req.user!.tenantId
    const userId      = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true, primaryClientId: true } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const data = createActivitySchema.parse(req.body)

    // Auto-create CRM task if requested
    let crmTaskId = data.crmTaskId ?? null
    if (data.autoCreateCrmTask && event.primaryClientId) {
      const task = await prisma.clientTask.create({
        data: {
          tenantId,
          clientId:    event.primaryClientId,
          title:       data.title,
          description: data.description ?? null,
          dueDate:     data.endDate ? new Date(data.endDate) : null,
          assignedToId: data.assignedToId ?? null,
          createdById: userId,
        },
      })
      crmTaskId = task.id
    }

    const activity = await prisma.$transaction(async (tx) => {
      const a = await tx.eventActivity.create({
        data: {
          tenantId,
          eventId,
          title:        data.title,
          description:  data.description ?? null,
          activityType: data.activityType as any,
          status:       data.status as any,
          priority:     data.priority as any,
          startDate:    data.startDate ? new Date(data.startDate) : null,
          endDate:      data.endDate   ? new Date(data.endDate)   : null,
          durationMins: data.durationMins ?? null,
          assignedToId: data.assignedToId ?? null,
          spaceId:      data.spaceId   ?? null,
          orderId:      data.orderId   ?? null,
          crmTaskId,
          color:        data.color     ?? null,
          position:     data.position,
          parentId:     data.parentId  ?? null,
          notes:        data.notes     ?? null,
          createdById:  userId,
        },
      })

      if (data.departmentIds?.length) {
        await tx.eventActivityDepartment.createMany({
          data: data.departmentIds.map(dId => ({ activityId: a.id, departmentId: dId })),
        })
      }

      // Merge explicit orderId (backward compat) into orderIds junction
      const allOrderIds = [...(data.orderIds ?? [])]
      if (data.orderId && !allOrderIds.includes(data.orderId)) {
        allOrderIds.push(data.orderId)
      }
      if (allOrderIds.length) {
        await tx.eventActivityOrder.createMany({
          data: allOrderIds.map(oId => ({ activityId: a.id, orderId: oId })),
        })
      }

      return tx.eventActivity.findUniqueOrThrow({ where: { id: a.id }, include: ACTIVITY_INCLUDE })
    })

    await auditService.log(tenantId, userId, 'EventActivity', activity.id, 'CREATE', null, {
      eventId, title: activity.title, activityType: activity.activityType, status: activity.status,
    }, req?.ip)

    res.status(201).json({ success: true, data: activity })
  } catch (err) {
    next(err)
  }
}

function activityStatusToCrmStatus(status: string): 'PENDING' | 'DONE' | 'CANCELLED' {
  if (status === 'DONE')      return 'DONE'
  if (status === 'CANCELLED') return 'CANCELLED'
  return 'PENDING'
}

export async function updateEventActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, activityId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const existing = await prisma.eventActivity.findFirst({ where: { id: activityId, eventId, tenantId } })
    if (!existing) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found')

    let data
    try {
      data = updateActivitySchema.parse(req.body)
    } catch (err: any) {
      if (err.errors) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: err.errors.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
            value: e.value,
          })),
        })
      }
      throw err
    }

    // Resolve effective crmTaskId (may be created below)
    let resolvedCrmTaskId = existing.crmTaskId

    // If autoCreateCrmTask toggled on and no CRM task linked yet, create one
    if (data.autoCreateCrmTask && !existing.crmTaskId) {
      const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { primaryClientId: true } })
      if (event?.primaryClientId) {
        const effectiveTitle  = data.title ?? existing.title
        const effectiveEnd    = data.endDate !== undefined ? data.endDate : existing.endDate?.toISOString()
        const effectiveAssign = data.assignedToId !== undefined ? data.assignedToId : existing.assignedToId
        const task = await prisma.clientTask.create({
          data: {
            tenantId,
            clientId:     event.primaryClientId,
            title:        effectiveTitle,
            description:  (data.description ?? existing.description) ?? null,
            dueDate:      effectiveEnd ? new Date(effectiveEnd) : null,
            assignedToId: effectiveAssign ?? null,
            createdById:  userId,
          },
        })
        resolvedCrmTaskId = task.id
      }
    }

    // If a CRM task is linked (existing or just created), sync it
    if (resolvedCrmTaskId) {
      const crmUpdate: any = {}
      if (data.title        !== undefined) crmUpdate.title        = data.title
      if (data.description  !== undefined) crmUpdate.description  = data.description
      if (data.endDate      !== undefined) crmUpdate.dueDate      = data.endDate ? new Date(data.endDate) : null
      if (data.assignedToId !== undefined) crmUpdate.assignedToId = data.assignedToId
      if (data.status       !== undefined) {
        crmUpdate.status      = activityStatusToCrmStatus(data.status)
        crmUpdate.completedAt = data.status === 'DONE' ? new Date() : null
      }
      if (Object.keys(crmUpdate).length > 0) {
        await prisma.clientTask.update({ where: { id: resolvedCrmTaskId }, data: crmUpdate })
      }
    }

    // Sync departments
    if (data.departmentIds !== undefined) {
      await prisma.eventActivityDepartment.deleteMany({ where: { activityId } })
      if (data.departmentIds.length > 0) {
        await prisma.eventActivityDepartment.createMany({
          data: data.departmentIds.map(dId => ({ activityId, departmentId: dId })),
        })
      }
    }

    // Sync orders (junction table)
    if (data.orderIds !== undefined) {
      await prisma.eventActivityOrder.deleteMany({ where: { activityId } })
      if (data.orderIds.length > 0) {
        await prisma.eventActivityOrder.createMany({
          data: data.orderIds.map(oId => ({ activityId, orderId: oId })),
        })
      }
    }

    const updated = await prisma.eventActivity.update({
      where: { id: activityId },
      data: {
        ...(data.title        !== undefined && { title:        data.title }),
        ...(data.description  !== undefined && { description:  data.description }),
        ...(data.activityType !== undefined && { activityType: data.activityType as any }),
        ...(data.status       !== undefined && { status:       data.status as any }),
        ...(data.priority     !== undefined && { priority:     data.priority as any }),
        ...(data.startDate    !== undefined && { startDate:    data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate      !== undefined && { endDate:      data.endDate   ? new Date(data.endDate)   : null }),
        ...(data.durationMins !== undefined && { durationMins: data.durationMins }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.spaceId      !== undefined && { spaceId:      data.spaceId }),
        ...(data.orderId      !== undefined && { orderId:      data.orderId }),
        crmTaskId: resolvedCrmTaskId,
        ...(data.color    !== undefined && { color:    data.color }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.notes    !== undefined && { notes:    data.notes }),
      },
      include: ACTIVITY_INCLUDE,
    })

    await auditService.log(tenantId, userId, 'EventActivity', activityId, 'UPDATE',
      { status: existing.status, title: existing.title },
      { status: updated.status,  title: updated.title  },
      req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteEventActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, activityId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const existing = await prisma.eventActivity.findFirst({ where: { id: activityId, eventId, tenantId } })
    if (!existing) throw new AppError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found')

    await prisma.eventActivity.delete({ where: { id: activityId } })

    await auditService.log(tenantId, userId, 'EventActivity', activityId, 'DELETE',
      { title: existing.title, status: existing.status }, null, req?.ip)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function bulkReorderActivities(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId    = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const positions = bulkReorderSchema.parse(req.body)

    await prisma.$transaction(
      positions.map(({ id, position }) =>
        prisma.eventActivity.updateMany({
          where: { id, eventId, tenantId },
          data:  { position },
        })
      )
    )

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function exportActivitiesCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId    = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true, code: true } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const activities = await prisma.eventActivity.findMany({
      where:   { eventId, tenantId },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        space:      { select: { resource: { select: { name: true } } } },
        order:      { select: { orderNumber: true } },
      },
      orderBy: [{ position: 'asc' }, { startDate: 'asc' }],
    })

    const header = 'posicion,titulo,tipo,estado,prioridad,fecha_inicio,fecha_fin,duracion_min,asignado_a,espacio,orden,notas'
    const rows = activities.map(a => {
      const cols = [
        a.position,
        `"${(a.title ?? '').replace(/"/g, '""')}"`,
        a.activityType,
        a.status,
        a.priority,
        a.startDate ? a.startDate.toISOString() : '',
        a.endDate   ? a.endDate.toISOString()   : '',
        a.durationMins ?? '',
        a.assignedTo ? `"${a.assignedTo.firstName} ${a.assignedTo.lastName}"` : '',
        a.space?.resource?.name ? `"${a.space.resource.name}"` : '',
        a.order?.orderNumber ?? '',
        `"${(a.notes ?? '').replace(/"/g, '""')}"`,
      ]
      return cols.join(',')
    })

    const csv = '\uFEFF' + [header, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${event.code}-timeline.csv"`)
    res.send(csv)
  } catch (err) {
    next(err)
  }
}

export async function importActivitiesCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId    = req.user!.tenantId
    const userId      = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const rows = z.array(importRowSchema).min(1).parse(req.body)

    const created = await prisma.$transaction(
      rows.map(row =>
        prisma.eventActivity.create({
          data: {
            tenantId,
            eventId,
            title:        row.titulo,
            activityType: normalizeEnum(row.tipo,      TYPE_MAP,     ['TASK','MILESTONE','PHASE','MEETING','REHEARSAL','LOGISTICS','CATERING','TECHNICAL','SECURITY','CUSTOM'], 'TASK') as any,
            status:       normalizeEnum(row.estado,    STATUS_MAP,   ['PENDING','IN_PROGRESS','DONE','CANCELLED','BLOCKED'], 'PENDING') as any,
            priority:     normalizeEnum(row.prioridad, PRIORITY_MAP, ['LOW','MEDIUM','HIGH','CRITICAL'], 'MEDIUM') as any,
            startDate:    row.fecha_inicio ? new Date(row.fecha_inicio) : null,
            endDate:      row.fecha_fin    ? new Date(row.fecha_fin)    : null,
            durationMins: row.duracion_min ?? null,
            notes:        row.notas        ?? null,
            position:     row.posicion,
            createdById:  userId,
          },
        })
      )
    )

    res.status(201).json({ success: true, data: { created: created.length } })
  } catch (err) {
    next(err)
  }
}
