import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { auditService } from '../services/audit.service'
import { sendGenericNotification, isWhatsAppConfigured } from '../services/whatsapp.service'

const PHASE_LABEL: Record<string, string> = {
  SETUP: 'Montaje', EVENT: 'Evento', TEARDOWN: 'Desmontaje',
}

const ADMIN_URL = 'https://ivent-admin.vercel.app'

// Fire-and-forget: detects conflicts for the saved space and notifies executives via WhatsApp
async function notifyConflicts(savedSpaceId: string, eventId: string, tenantId: string) {
  const tag = `[notifyConflicts:${savedSpaceId.slice(0, 8)}]`
  if (!isWhatsAppConfigured()) {
    console.warn(`${tag} WhatsApp not configured — skipping`)
    return
  }
  try {
    const saved = await prisma.eventSpace.findUnique({
      where: { id: savedSpaceId },
      include: { resource: { select: { id: true, name: true, code: true } } },
    })
    if (!saved) {
      console.warn(`${tag} EventSpace not found`)
      return
    }

    // Find all EventSpaces on the same resource that overlap (excluding itself)
    const conflicts = await prisma.eventSpace.findMany({
      where: {
        id: { not: savedSpaceId },
        resourceId: saved.resourceId,
        startTime: { lt: saved.endTime },
        endTime: { gt: saved.startTime },
      },
      include: {
        event: { select: { id: true, name: true, code: true, executive: true } },
      },
      orderBy: { startTime: 'asc' },
    })
    console.log(`${tag} resource="${saved.resource.name}" conflicts found: ${conflicts.length}`)
    if (conflicts.length === 0) return

    // Gather current event info
    const currentEvent = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, name: true, code: true, executive: true },
    })
    if (!currentEvent) {
      console.warn(`${tag} current event not found (id=${eventId})`)
      return
    }
    console.log(`${tag} currentEvent="${currentEvent.name}" executive="${currentEvent.executive ?? 'null'}"`)

    // Collect all unique executive user IDs across current + conflicting events
    // executive field stores the user ID (UUID) when set via the admin form selector
    const executiveMap = new Map<string, { eventId: string; eventName: string; eventCode: string }>()
    const addExec = (userId: string | null, ev: { id: string; name: string; code: string }) => {
      if (userId && !executiveMap.has(userId))
        executiveMap.set(userId, { eventId: ev.id, eventName: ev.name, eventCode: ev.code })
    }
    addExec(currentEvent.executive, currentEvent)
    for (const c of conflicts) {
      console.log(`${tag} conflict event="${c.event.name}" executive="${c.event.executive ?? 'null'}"`)
      addExec(c.event.executive, c.event)
    }

    if (executiveMap.size === 0) {
      console.warn(`${tag} no executive user IDs found on any involved event — no WhatsApp sent`)
      return
    }

    // Build conflict table
    const fmt      = (d: Date) => d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    const savedPhase = PHASE_LABEL[saved.phase] ?? saved.phase

    const conflictRows = conflicts.map((c, i) =>
      `*${i + 1}. ${c.event.name}* (#${c.event.code})\n` +
      `   📅 Inicio:  ${fmt(c.startTime)}\n` +
      `   📅 Fin:     ${fmt(c.endTime)}\n` +
      `   🕐 Creada:  ${fmt(c.createdAt)}`
    ).join('\n\n')

    // Lookup phones and send
    const userIds = Array.from(executiveMap.keys())
    console.log(`${tag} looking up ${userIds.length} user(s):`, userIds)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, phone: true },
    })
    console.log(`${tag} users found: ${users.length} — with phone: ${users.filter(u => u.phone).length}`)

    await Promise.allSettled(users.map(async u => {
      if (!u.phone) {
        console.warn(`${tag} user ${u.id} has no phone — skipping`)
        return
      }
      const ev = executiveMap.get(u.id)!
      const message =
        `🏢 *Recurso:* ${saved.resource.name} (${savedPhase})\n` +
        `📋 *Evento:* ${currentEvent.name} (#${currentEvent.code})\n` +
        `📅 *Reserva:* ${fmt(saved.startTime)} → ${fmt(saved.endTime)}\n\n` +
        `*Reservas en conflicto (${conflicts.length}):*\n` +
        `─────────────────────\n` +
        conflictRows
      console.log(`${tag} sending WhatsApp to user ${u.id} (${u.phone})`)
      await sendGenericNotification(u.phone, {
        title: '⚠️ Conflicto de espacio detectado',
        message,
        actionUrl: `${ADMIN_URL}/eventos/${ev.eventId}`,
        actionText: 'Ver evento',
      })
    }))
  } catch (err) {
    console.error(`${tag} error:`, err)
  }
}

export async function listEventSpaces(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const spaces = await prisma.eventSpace.findMany({
      where: { eventId, event: { tenantId } },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: [{ phase: 'asc' }, { startTime: 'asc' }],
    })

    res.json({ success: true, data: spaces })
  } catch (err) { next(err) }
}

export async function createEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { resourceId, phase, startTime, endTime, notes } = req.body

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' })

    const space = await prisma.eventSpace.create({
      data: { eventId, resourceId, phase, startTime: new Date(startTime), endTime: new Date(endTime), notes },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
    })

    await auditService.log(tenantId, userId, 'EventSpace', space.id, 'CREATE', null, {
      resourceId,
      resourceName: space.resource.name,
      phase: PHASE_LABEL[phase] ?? phase,
      startTime,
      endTime,
      notes: notes ?? null,
    }, req?.ip)

    // Fire-and-forget conflict notification
    notifyConflicts(space.id, eventId, tenantId)

    res.status(201).json({ success: true, data: space })
  } catch (err) { next(err) }
}

export async function updateEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { resourceId, phase, startTime, endTime, notes } = req.body

    const existing = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
      include: { resource: { select: { id: true, name: true } } },
    })
    if (!existing) return res.status(404).json({ success: false, error: 'EventSpace not found' })

    const space = await prisma.eventSpace.update({
      where: { id: spaceId },
      data: { resourceId, phase, startTime: new Date(startTime), endTime: new Date(endTime), notes },
      include: {
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
    })

    await auditService.log(tenantId, userId, 'EventSpace', spaceId, 'UPDATE', {
      resourceId: existing.resourceId,
      resourceName: existing.resource.name,
      phase: PHASE_LABEL[existing.phase] ?? existing.phase,
      startTime: existing.startTime.toISOString(),
      endTime: existing.endTime.toISOString(),
      notes: existing.notes,
    }, {
      resourceId,
      resourceName: space.resource.name,
      phase: PHASE_LABEL[phase] ?? phase,
      startTime,
      endTime,
      notes: notes ?? null,
    }, req?.ip)

    // Fire-and-forget conflict notification
    notifyConflicts(space.id, eventId, tenantId)

    res.json({ success: true, data: space })
  } catch (err) { next(err) }
}

export async function deleteEventSpace(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const existing = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
      include: { resource: { select: { id: true, name: true } } },
    })
    if (!existing) return res.status(404).json({ success: false, error: 'EventSpace not found' })

    await prisma.eventSpace.delete({ where: { id: spaceId } })

    await auditService.log(tenantId, userId, 'EventSpace', spaceId, 'DELETE', {
      resourceId: existing.resourceId,
      resourceName: existing.resource.name,
      phase: PHASE_LABEL[existing.phase] ?? existing.phase,
      startTime: existing.startTime.toISOString(),
      endTime: existing.endTime.toISOString(),
      notes: existing.notes,
    }, null, req?.ip)

    res.json({ success: true })
  } catch (err) { next(err) }
}

/**
 * Diagnostic endpoint — runs the full conflict-notification pipeline synchronously
 * and returns a detailed report WITHOUT sending WhatsApp (dry=true, default) or
 * actually sending it (dry=false via ?send=true query param).
 *
 * GET /api/v1/events/:eventId/spaces/:spaceId/notify-check
 * GET /api/v1/events/:eventId/spaces/:spaceId/notify-check?send=true
 */
export async function checkNotifyConflicts(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId
    const doSend = req.query.send === 'true'

    const report: Record<string, unknown> = {
      spaceId,
      eventId,
      tenantId,
      whatsappConfigured: isWhatsAppConfigured(),
      send: doSend,
    }

    const saved = await prisma.eventSpace.findUnique({
      where: { id: spaceId },
      include: { resource: { select: { id: true, name: true, code: true } } },
    })
    if (!saved) return res.status(404).json({ success: false, error: 'EventSpace not found' })
    report.resource = saved.resource.name
    report.phase = saved.phase
    report.startTime = saved.startTime
    report.endTime = saved.endTime

    const conflicts = await prisma.eventSpace.findMany({
      where: {
        id: { not: spaceId },
        resourceId: saved.resourceId,
        startTime: { lt: saved.endTime },
        endTime: { gt: saved.startTime },
      },
      include: {
        event: { select: { id: true, name: true, code: true, executive: true } },
      },
    })
    report.conflictsFound = conflicts.length
    report.conflictEvents = conflicts.map(c => ({
      eventId: c.event.id,
      name: c.event.name,
      code: c.event.code,
      executive: c.event.executive,
      startTime: c.startTime,
      endTime: c.endTime,
    }))

    const currentEvent = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, name: true, code: true, executive: true },
    })
    report.currentEvent = currentEvent
      ? { name: currentEvent.name, code: currentEvent.code, executive: currentEvent.executive }
      : null

    if (!currentEvent) {
      report.outcome = 'ABORT: current event not found'
      return res.json({ success: true, report })
    }

    const executiveMap = new Map<string, string>()
    const addExec = (userId: string | null, label: string) => {
      if (userId) executiveMap.set(userId, label)
    }
    addExec(currentEvent.executive, `current event (${currentEvent.name})`)
    for (const c of conflicts) addExec(c.event.executive, `conflict event (${c.event.name})`)

    report.executiveCandidates = Array.from(executiveMap.entries()).map(([id, src]) => ({ id, src }))

    if (executiveMap.size === 0) {
      report.outcome = 'ABORT: no executive user IDs on any involved event (field may contain free text, not UUID)'
      return res.json({ success: true, report })
    }

    const userIds = Array.from(executiveMap.keys())
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true, isActive: true },
    })
    report.usersFound = users.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      phone: u.phone ?? null,
      isActive: u.isActive,
    }))
    report.usersWithPhone = users.filter(u => u.phone).length

    if (users.filter(u => u.phone).length === 0) {
      report.outcome = 'ABORT: no users found with a phone number'
      return res.json({ success: true, report })
    }

    if (!doSend) {
      report.outcome = 'DRY RUN — would send to: ' + users.filter(u => u.phone).map(u => u.phone).join(', ')
      return res.json({ success: true, report })
    }

    // Actually send
    if (!isWhatsAppConfigured()) {
      report.outcome = 'ABORT: WhatsApp env vars not configured'
      return res.json({ success: true, report })
    }

    const fmt = (d: Date) => d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    const savedPhase = PHASE_LABEL[saved.phase] ?? saved.phase
    const sortedConflicts = [...conflicts].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    const conflictRows = sortedConflicts.map((c, i) =>
      `*${i + 1}. ${c.event.name}* (#${c.event.code})\n` +
      `   📅 Inicio:  ${fmt(c.startTime)}\n` +
      `   📅 Fin:     ${fmt(c.endTime)}\n` +
      `   🕐 Creada:  ${fmt(c.createdAt)}`
    ).join('\n\n')
    const message =
      `🏢 *Recurso:* ${saved.resource.name} (${savedPhase})\n` +
      `📋 *Evento:* ${currentEvent.name} (#${currentEvent.code})\n` +
      `📅 *Reserva:* ${fmt(saved.startTime)} → ${fmt(saved.endTime)}\n\n` +
      `*Reservas en conflicto (${conflicts.length}):*\n` +
      `─────────────────────\n` +
      conflictRows

    const sendResults = await Promise.allSettled(
      users.filter(u => u.phone).map(async u => {
        await sendGenericNotification(u.phone!, {
          title: '⚠️ Conflicto de espacio detectado',
          message,
          actionUrl: `${ADMIN_URL}/eventos/${eventId}`,
          actionText: 'Ver evento',
        })
        return u.phone
      })
    )
    report.sendResults = sendResults.map((r, i) => ({
      phone: users.filter(u => u.phone)[i]?.phone,
      status: r.status,
      error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
    }))
    report.outcome = 'SENT'

    res.json({ success: true, report })
  } catch (err) { next(err) }
}

export async function getEventSpaceAudit(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, spaceId } = req.params
    const tenantId = req.user!.tenantId

    const space = await prisma.eventSpace.findFirst({
      where: { id: spaceId, eventId, event: { tenantId } },
    })
    // Also allow querying deleted spaces (audit logs survive deletion)
    if (!space) {
      const count = await prisma.auditLog.count({
        where: { entityType: 'EventSpace', entityId: spaceId, tenantId },
      })
      if (count === 0) return res.status(404).json({ success: false, error: 'EventSpace not found' })
    }

    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'EventSpace', entityId: spaceId, tenantId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ success: true, data: logs })
  } catch (err) { next(err) }
}
