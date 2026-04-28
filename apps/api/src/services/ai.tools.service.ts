import { prisma } from '../config/database'

// ── Tool: search_events ───────────────────────────────────────────────────────
export async function toolSearchEvents(
  input: { query: string; status?: string },
  tenantId: string,
) {
  const where: any = { tenantId, name: { contains: input.query, mode: 'insensitive' } }
  if (input.status) where.status = input.status
  const events = await prisma.event.findMany({
    where,
    orderBy: { eventStart: 'desc' },
    take: 10,
    select: { id: true, code: true, name: true, status: true, eventStart: true, eventEnd: true, venueLocation: true },
  })
  return events.map(e => ({
    id: e.id, code: e.code, name: e.name, status: e.status,
    eventStart: e.eventStart?.toISOString().slice(0, 10) ?? null,
    eventEnd: e.eventEnd?.toISOString().slice(0, 10) ?? null,
    venueLocation: e.venueLocation,
  }))
}

// ── Tool: copy_event ──────────────────────────────────────────────────────────
export async function toolCopyEvent(
  input: { sourceEventId: string; newStartDate: string; newName?: string },
  tenantId: string,
  userId: string,
) {
  const src = await prisma.event.findFirst({ where: { id: input.sourceEventId, tenantId } })
  if (!src) throw new Error(`Evento con id ${input.sourceEventId} no encontrado`)

  const srcStart = src.eventStart ? new Date(src.eventStart) : null
  const newStart = new Date(input.newStartDate)
  const offsetMs = srcStart ? newStart.getTime() - srcStart.getTime() : 0
  const shift = (d: Date | null) => d ? new Date(d.getTime() + offsetMs) : null

  const yearMatch = src.code?.match(/(\d{4})$/)
  const baseCode = src.code ?? 'EVT'
  const newCode = yearMatch
    ? baseCode.replace(/\d{4}$/, String(newStart.getFullYear()))
    : `${baseCode}-COPY`

  // If generated code already exists, append a suffix to avoid the unique constraint
  const codeExists = await prisma.event.findFirst({ where: { tenantId, code: newCode } })
  const finalCode = codeExists ? `${newCode}-2` : newCode

  const newEvent = await prisma.event.create({
    data: {
      tenantId,
      name: input.newName ?? src.name,
      code: finalCode,
      createdById: userId,
      description: src.description,
      venueLocation: src.venueLocation,
      setupStart: shift(src.setupStart),
      setupEnd: shift(src.setupEnd),
      eventStart: newStart,
      eventEnd: shift(src.eventEnd),
      teardownStart: shift(src.teardownStart),
      teardownEnd: shift(src.teardownEnd),
      primaryClientId: src.primaryClientId,
      priceListId: src.priceListId,
      eventType: src.eventType,
      eventClass: src.eventClass,
      eventCategory: src.eventCategory,
      coordinator: src.coordinator,
      executive: src.executive,
      status: 'QUOTED',
    },
  })

  return {
    id: newEvent.id, code: newEvent.code, name: newEvent.name, status: newEvent.status,
    eventStart: newEvent.eventStart?.toISOString().slice(0, 10) ?? null,
    adminUrl: `/events/${newEvent.id}`,
  }
}

// ── Tool: check_space_availability ────────────────────────────────────────────
export async function toolCheckSpaceAvailability(
  input: { resourceId?: string; startDate: string; endDate: string },
  tenantId: string,
) {
  const start = new Date(input.startDate)
  const end = new Date(input.endDate)
  const where: any = {
    event: { tenantId },
    startTime: { lte: end },
    endTime: { gte: start },
  }
  if (input.resourceId) where.resourceId = input.resourceId

  const conflicts = await prisma.eventSpace.findMany({
    where, take: 20,
    select: {
      startTime: true, endTime: true, phase: true,
      resource: { select: { name: true } },
      event: { select: { name: true, code: true } },
    },
  })

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map(c => ({
      eventCode: c.event.code, eventName: c.event.name,
      resource: c.resource.name, phase: c.phase,
      from: c.startTime?.toISOString().slice(0, 10),
      to: c.endTime?.toISOString().slice(0, 10),
    })),
  }
}

// ── Tool: create_order ────────────────────────────────────────────────────────
export async function toolCreateOrder(
  input: { eventId: string; clientId: string; notes?: string },
  tenantId: string,
  userId: string,
) {
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, tenantId },
    select: { id: true, name: true, code: true, priceListId: true },
  })
  if (!event) throw new Error(`Evento con id ${input.eventId} no encontrado`)
  if (!event.priceListId) throw new Error(`El evento no tiene lista de precios asignada`)

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, tenantId },
    select: { id: true, companyName: true },
  })
  if (!client) throw new Error(`Cliente con id ${input.clientId} no encontrado`)

  const count = await prisma.order.count({ where: { tenantId } })
  const orderNumber = `OS-${String(count + 1).padStart(5, '0')}`

  const order = await prisma.order.create({
    data: {
      tenantId, eventId: input.eventId, clientId: input.clientId,
      priceListId: event.priceListId,
      pricingTier: 'NORMAL',
      orderNumber, status: 'QUOTED',
      notes: input.notes,
      createdById: userId,
    },
  })

  return {
    id: order.id, orderNumber: order.orderNumber, status: order.status,
    eventName: event.name, clientName: client.companyName,
    adminUrl: `/events/${input.eventId}`,
  }
}
