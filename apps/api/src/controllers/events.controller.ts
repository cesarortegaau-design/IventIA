import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { auditService } from '../services/audit.service'
import { getUserOrgIds } from '../middleware/departmentScope'
import { checkApprovalGate } from '../services/approvalGate.service'
import { sendGenericNotification, isWhatsAppConfigured } from '../services/whatsapp.service'
import { PRIVILEGES } from '@iventia/shared'

const createEventSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().nullish(),
  venueLocation: z.string().nullish(),
  setupStart: z.string().datetime().nullish(),
  setupEnd: z.string().datetime().nullish(),
  eventStart: z.string().datetime().nullish(),
  eventEnd: z.string().datetime().nullish(),
  teardownStart: z.string().datetime().nullish(),
  teardownEnd: z.string().datetime().nullish(),
  primaryClientId: z.string().min(1).nullish(),
  priceListId: z.string().min(1).nullish(),
  eventType: z.string().nullish(),
  eventClass: z.string().nullish(),
  eventCategory: z.string().nullish(),
  coordinator: z.string().nullish(),
  executive: z.string().nullish(),
  notes: z.string().nullish(),
  status: z.string().nullish(),
  portalEnabled: z.boolean().nullish(),
  portalSettings: z.any().optional(),
  sportLocalTeamId: z.string().uuid().nullish(),
  sportVisitingTeamId: z.string().uuid().nullish(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(500).default(20),
  status: z.string().optional(),
  eventType: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, pageSize, status, eventType, search, from, to } = listQuerySchema.parse(req.query)
    const tenantId = req.user!.tenantId

    const where: any = { tenantId }
    if (status) where.status = status.includes(',') ? { in: status.split(',') } : status
    if (eventType) where.eventType = eventType
    if (search) where.name = { contains: search, mode: 'insensitive' }
    if (from || to) {
      where.eventStart = {}
      if (from) where.eventStart.gte = new Date(from)
      if (to) where.eventStart.lte = new Date(to)
    }

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { eventStart: 'desc' },
        include: {
          primaryClient: { select: { id: true, companyName: true, firstName: true, lastName: true } },
          priceList: { select: { id: true, name: true } },
          _count: { select: { orders: true, stands: true } },
        },
      }),
    ])

    res.json({ success: true, data: events, meta: { total, page, pageSize } })
  } catch (err) {
    next(err)
  }
}

export async function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const tenantId = req.user!.tenantId

    const [event, orderAgg, activeCount, pendingCount, teamRows] = await Promise.all([
      prisma.event.findFirst({
        where: { id, tenantId },
        include: {
          primaryClient: { select: { id: true, companyName: true, firstName: true, lastName: true } },
          priceList: { select: { id: true, name: true } },
          documents: true,
          ticketEvent: { include: { sections: true } },
          _count: { select: { orders: true } },
        },
      }),
      prisma.order.aggregate({
        where: { eventId: id, tenantId },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.count({ where: { eventId: id, tenantId, status: { notIn: ['CANCELLED', 'CREDIT_NOTE'] } } }),
      prisma.order.count({ where: { eventId: id, tenantId, status: 'QUOTED' } }),
      prisma.order.findMany({
        where: { eventId: id, tenantId, assignedToId: { not: null } },
        select: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
        distinct: ['assignedToId'],
      }),
    ])

    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    res.json({
      success: true,
      data: {
        ...event,
        orderSummary: {
          count: orderAgg._count.id,
          totalRevenue: Number(orderAgg._sum.total ?? 0),
          activeCount,
          pendingCount,
          team: teamRows.map(r => r.assignedTo).filter(Boolean),
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function getEventOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIds = await getUserOrgIds(req)
    const where: any = { eventId: req.params.id }
    if (orgIds !== null) where.organizacionId = { in: orgIds }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
        stand: { select: { id: true, code: true } },
        organizacion: { select: { id: true, clave: true, descripcion: true } },
        contract: { select: { id: true, contractNumber: true, description: true, status: true, totalAmount: true, paidAmount: true, client: { select: { id: true, companyName: true, firstName: true, lastName: true } } } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
}

export async function getEventHeader(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
      select: {
        id: true, code: true, name: true, status: true, description: true,
        setupStart: true, setupEnd: true, eventStart: true, eventEnd: true,
        teardownStart: true, teardownEnd: true,
        primaryClientId: true, priceListId: true,
        eventType: true, eventClass: true, eventCategory: true,
        coordinator: true, executive: true, notes: true,
        venue: true, expectedAttendance: true,
        portalEnabled: true, portalSettings: true,
        sportLocalTeamId: true, sportVisitingTeamId: true,
      },
    })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
    res.json({ success: true, data: event })
  } catch (err) {
    next(err)
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEventSchema.parse(req.body)
    const tenantId = req.user!.tenantId

    // Generate event code: EVN-YYYY-NNN
    const year = new Date().getFullYear()
    const prefix = `EVN-${year}-`
    const last = await prisma.event.findFirst({
      where: { tenantId, code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    })
    const lastNum = last ? parseInt(last.code.replace(prefix, ''), 10) : 0
    const code = `${prefix}${String(lastNum + 1).padStart(3, '0')}`

    const event = await prisma.event.create({
      data: {
        ...data,
        tenantId,
        code,
        setupStart: data.setupStart ? new Date(data.setupStart) : undefined,
        setupEnd: data.setupEnd ? new Date(data.setupEnd) : undefined,
        eventStart: data.eventStart ? new Date(data.eventStart) : undefined,
        eventEnd: data.eventEnd ? new Date(data.eventEnd) : undefined,
        teardownStart: data.teardownStart ? new Date(data.teardownStart) : undefined,
        teardownEnd: data.teardownEnd ? new Date(data.teardownEnd) : undefined,
        createdById: req.user!.userId,
      },
    })

    await auditService.log(tenantId, req.user!.userId, 'Event', event.id, 'CREATE', null, {
      code: event.code,
      name: event.name,
      status: event.status,
      description: event.description,
      venueLocation: event.venueLocation,
      eventStart: event.eventStart?.toISOString(),
      eventEnd: event.eventEnd?.toISOString(),
      setupStart: event.setupStart?.toISOString(),
      setupEnd: event.setupEnd?.toISOString(),
      teardownStart: event.teardownStart?.toISOString(),
      teardownEnd: event.teardownEnd?.toISOString(),
    }, req?.ip)

    res.status(201).json({ success: true, data: event })
  } catch (err) {
    next(err)
  }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEventSchema.partial().parse(req.body)
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...data,
        setupStart: data.setupStart ? new Date(data.setupStart) : undefined,
        setupEnd: data.setupEnd ? new Date(data.setupEnd) : undefined,
        eventStart: data.eventStart ? new Date(data.eventStart) : undefined,
        eventEnd: data.eventEnd ? new Date(data.eventEnd) : undefined,
        teardownStart: data.teardownStart ? new Date(data.teardownStart) : undefined,
        teardownEnd: data.teardownEnd ? new Date(data.teardownEnd) : undefined,
      },
    })

    const oldValues: any = {
      name: event.name,
      status: event.status,
      description: event.description,
      venueLocation: event.venueLocation,
      eventStart: event.eventStart?.toISOString(),
      eventEnd: event.eventEnd?.toISOString(),
      setupStart: event.setupStart?.toISOString(),
      setupEnd: event.setupEnd?.toISOString(),
      teardownStart: event.teardownStart?.toISOString(),
      teardownEnd: event.teardownEnd?.toISOString(),
    }
    const newValues: any = {
      name: updated.name,
      status: updated.status,
      description: updated.description,
      venueLocation: updated.venueLocation,
      eventStart: updated.eventStart?.toISOString(),
      eventEnd: updated.eventEnd?.toISOString(),
      setupStart: updated.setupStart?.toISOString(),
      setupEnd: updated.setupEnd?.toISOString(),
      teardownStart: updated.teardownStart?.toISOString(),
      teardownEnd: updated.teardownEnd?.toISOString(),
    }

    await auditService.log(req.user!.tenantId, req.user!.userId, 'Event', req.params.id, 'UPDATE', oldValues, newValues, req?.ip)

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

// Per-status privilege requirements for status transitions
const STATUS_PRIVILEGE: Record<string, string> = {
  CONFIRMED:    PRIVILEGES.EVENT_CONFIRM,
  IN_EXECUTION: PRIVILEGES.EVENT_EXECUTE,
  CLOSED:       PRIVILEGES.EVENT_CLOSE,
  CANCELLED:    PRIVILEGES.EVENT_CANCEL,
}

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED:    'Confirmar evento',
  IN_EXECUTION: 'Pasar a ejecución',
  CLOSED:       'Cerrar evento',
  CANCELLED:    'Cancelar evento',
}

async function userHasPrivilege(tenantId: string, userId: string, privilegeKey: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { role: true, profile: { select: { privileges: { where: { privilegeKey }, select: { id: true } } } } },
  })
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return (user.profile?.privileges.length ?? 0) > 0
}

// Fire-and-forget: on event confirmation, scan all its spaces for conflicts
// and notify executives of conflicting events via WhatsApp
async function notifyConflictsOnConfirmation(eventId: string, tenantId: string) {
  const tag = `[notifyOnConfirm:${eventId.slice(0, 8)}]`
  if (!isWhatsAppConfigured()) {
    console.warn(`${tag} WhatsApp not configured — skipping`)
    return
  }
  try {
    const confirmedEvent = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, name: true, code: true },
    })
    if (!confirmedEvent) { console.warn(`${tag} event not found`); return }
    console.log(`${tag} confirmed event="${confirmedEvent.name}"`)

    const spaces = await prisma.eventSpace.findMany({
      where: { eventId },
      include: { resource: { select: { id: true, name: true } } },
    })
    console.log(`${tag} spaces: ${spaces.length}`)
    if (spaces.length === 0) return

    const fmt = (d: Date) => d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

    // For each space, find conflicting reservations from OTHER events
    const executiveMap = new Map<string, { eventId: string; eventName: string; spaceSummaries: string[] }>()

    for (const space of spaces) {
      const conflicts = await prisma.eventSpace.findMany({
        where: {
          id: { not: space.id },
          resourceId: space.resourceId,
          startTime: { lt: space.endTime },
          endTime: { gt: space.startTime },
          eventId: { not: eventId },
        },
        include: {
          event: { select: { id: true, name: true, code: true, executive: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
      console.log(`${tag} space="${space.resource.name}" conflicts: ${conflicts.length}`)

      for (const c of conflicts) {
        console.log(`${tag}   conflict event="${c.event.name}" executive="${c.event.executive ?? 'null'}"`)
        if (!c.event.executive) continue
        const existing = executiveMap.get(c.event.executive)
        const spaceRow =
          `🏢 *${space.resource.name}* vs *${c.event.name}* (#${c.event.code})\n` +
          `   📅 Inicio conflicto:  ${fmt(c.startTime)}\n` +
          `   📅 Fin conflicto:     ${fmt(c.endTime)}\n` +
          `   🕐 Reserva creada:    ${fmt(c.createdAt)}`
        if (existing) {
          existing.spaceSummaries.push(spaceRow)
        } else {
          executiveMap.set(c.event.executive, {
            eventId: c.event.id,
            eventName: c.event.name,
            spaceSummaries: [spaceRow],
          })
        }
      }
    }

    console.log(`${tag} executives to notify: ${executiveMap.size}`)
    if (executiveMap.size === 0) {
      console.warn(`${tag} no executives found — check that conflicting events have a user set in the executive field`)
      return
    }

    const userIds = Array.from(executiveMap.keys())
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, phone: true },
    })
    console.log(`${tag} users found: ${users.length} — with phone: ${users.filter(u => u.phone).length}`)

    await Promise.allSettled(users.map(async u => {
      if (!u.phone) { console.warn(`${tag} user ${u.id} has no phone`); return }
      const info = executiveMap.get(u.id)!
      const rows = info.spaceSummaries.join('\n\n')
      const message =
        `⚠️ El evento *${confirmedEvent.name}* (#${confirmedEvent.code}) fue *CONFIRMADO* y tiene espacios en conflicto con reservas de tu evento *${info.eventName}*:\n\n` +
        `─────────────────────\n` +
        rows + `\n─────────────────────\n\n` +
        `Por favor revisa y coordina las reservas afectadas.`
      console.log(`${tag} sending WhatsApp to ${u.phone}`)
      await sendGenericNotification(u.phone, {
        title: '🔔 Evento confirmado con conflictos',
        message,
        actionUrl: `https://ivent-admin.vercel.app/eventos/${info.eventId}`,
        actionText: 'Ver evento afectado',
      })
    }))
  } catch (err) {
    console.error(`${tag} error:`, err)
  }
}

export async function updateEventStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = z.object({ status: z.string() }).parse(req.body)
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, tenantId },
    })
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

    // Enforce per-status privilege
    const requiredPrivilege = STATUS_PRIVILEGE[status]
    if (requiredPrivilege) {
      const allowed = await userHasPrivilege(tenantId, userId, requiredPrivilege)
      if (!allowed) {
        throw new AppError(403, 'FORBIDDEN',
          `No tienes el privilegio necesario para "${STATUS_LABEL[status] ?? status}". Contacta a un administrador.`)
      }
    }

    const gate = await checkApprovalGate(tenantId, userId, 'EVENT', req.params.id, status)
    if (gate.blocked) throw new AppError(422, 'APPROVAL_REQUIRED', gate.message)

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: status as any },
    })

    await auditService.log(tenantId, userId, 'Event', req.params.id, 'UPDATE',
      { status: event.status },
      { status: updated.status },
      req?.ip)

    // On confirmation, notify executives of conflicting spaces
    if (status === 'CONFIRMED') {
      notifyConflictsOnConfirmation(req.params.id, tenantId)
    }

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}
