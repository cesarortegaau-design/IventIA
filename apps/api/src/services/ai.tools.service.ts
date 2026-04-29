import { prisma } from '../config/database'
import { generateOrderNumber } from './order.service'

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

// ── Shared helpers ────────────────────────────────────────────────────────────

async function copySpaces(sourceEventId: string, targetEventId: string, offsetMs: number) {
  const spaces = await prisma.eventSpace.findMany({ where: { eventId: sourceEventId } })
  if (spaces.length === 0) return 0
  await prisma.eventSpace.createMany({
    data: spaces.map(s => ({
      eventId: targetEventId,
      resourceId: s.resourceId,
      phase: s.phase,
      startTime: new Date(s.startTime.getTime() + offsetMs),
      endTime: new Date(s.endTime.getTime() + offsetMs),
      notes: s.notes,
    })),
  })
  return spaces.length
}

async function copyOrders(sourceEventId: string, targetEventId: string, tenantId: string, userId: string, offsetMs: number) {
  const orders = await prisma.order.findMany({
    where: { eventId: sourceEventId, tenantId, status: { not: 'CANCELLED' } },
    include: { lineItems: true },
  })
  let copied = 0
  for (const src of orders) {
    const orderNumber = await generateOrderNumber(tenantId)
    const newOrder = await prisma.order.create({
      data: {
        tenantId,
        eventId: targetEventId,
        clientId: src.clientId,
        billingClientId: src.billingClientId,
        priceListId: src.priceListId,
        pricingTier: src.pricingTier,
        orderNumber,
        status: 'QUOTED',
        subtotal: src.subtotal,
        discountPct: src.discountPct,
        discountAmount: src.discountAmount,
        taxPct: src.taxPct,
        taxAmount: src.taxAmount,
        total: src.total,
        prospectedTotal: src.prospectedTotal,
        notes: src.notes,
        departamento: src.departamento,
        organizacionId: src.organizacionId,
        startDate: src.startDate ? new Date(src.startDate.getTime() + offsetMs) : null,
        endDate: src.endDate ? new Date(src.endDate.getTime() + offsetMs) : null,
        createdById: userId,
      },
    })
    if (src.lineItems.length > 0) {
      await prisma.orderLineItem.createMany({
        data: src.lineItems.map(li => ({
          orderId: newOrder.id,
          resourceId: li.resourceId,
          description: li.description,
          pricingTier: li.pricingTier,
          unitPrice: li.unitPrice,
          quantity: li.quantity,
          discountPct: li.discountPct,
          lineTotal: li.lineTotal,
          timeUnit: li.timeUnit,
          detail: li.detail,
          observations: li.observations,
          sortOrder: li.sortOrder,
        })),
      })
    }
    copied++
  }
  return copied
}

// ── Tool: copy_event ──────────────────────────────────────────────────────────
export async function toolCopyEvent(
  input: {
    sourceEventId: string
    newStartDate: string
    newName?: string
    copySpaces?: boolean
    copyOrders?: boolean
  },
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

  let spacesCount = 0
  let ordersCount = 0

  if (input.copySpaces) {
    spacesCount = await copySpaces(src.id, newEvent.id, offsetMs)
  }
  if (input.copyOrders) {
    ordersCount = await copyOrders(src.id, newEvent.id, tenantId, userId, offsetMs)
  }

  return {
    id: newEvent.id, code: newEvent.code, name: newEvent.name, status: newEvent.status,
    eventStart: newEvent.eventStart?.toISOString().slice(0, 10) ?? null,
    spacesCopiadas: spacesCount,
    ordenesCopidas: ordersCount,
    adminUrl: `/events/${newEvent.id}`,
  }
}

// ── Tool: copy_event_spaces ───────────────────────────────────────────────────
export async function toolCopyEventSpaces(
  input: { sourceEventId: string; targetEventId: string },
  tenantId: string,
) {
  const [src, tgt] = await Promise.all([
    prisma.event.findFirst({ where: { id: input.sourceEventId, tenantId }, select: { id: true, name: true, eventStart: true } }),
    prisma.event.findFirst({ where: { id: input.targetEventId, tenantId }, select: { id: true, name: true, eventStart: true } }),
  ])
  if (!src) throw new Error(`Evento origen no encontrado`)
  if (!tgt) throw new Error(`Evento destino no encontrado`)

  const offsetMs =
    src.eventStart && tgt.eventStart
      ? tgt.eventStart.getTime() - src.eventStart.getTime()
      : 0

  const count = await copySpaces(src.id, tgt.id, offsetMs)
  return {
    copied: count,
    sourceEvent: src.name,
    targetEvent: tgt.name,
    adminUrl: `/events/${tgt.id}`,
  }
}

// ── Tool: copy_event_orders ───────────────────────────────────────────────────
export async function toolCopyEventOrders(
  input: { sourceEventId: string; targetEventId: string },
  tenantId: string,
  userId: string,
) {
  const [src, tgt] = await Promise.all([
    prisma.event.findFirst({ where: { id: input.sourceEventId, tenantId }, select: { id: true, name: true, eventStart: true } }),
    prisma.event.findFirst({ where: { id: input.targetEventId, tenantId }, select: { id: true, name: true, eventStart: true } }),
  ])
  if (!src) throw new Error(`Evento origen no encontrado`)
  if (!tgt) throw new Error(`Evento destino no encontrado`)

  const offsetMs =
    src.eventStart && tgt.eventStart
      ? tgt.eventStart.getTime() - src.eventStart.getTime()
      : 0

  const count = await copyOrders(src.id, tgt.id, tenantId, userId, offsetMs)
  return {
    copied: count,
    sourceEvent: src.name,
    targetEvent: tgt.name,
    adminUrl: `/events/${tgt.id}`,
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

  const orderNumber = await generateOrderNumber(tenantId)

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
