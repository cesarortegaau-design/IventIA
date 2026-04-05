import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'

// ── Greedy interval scheduling → assign "lane" to each booking per resource ──
function assignLanes(bookings: { id: string; startTime: Date; endTime: Date }[]) {
  const sorted = [...bookings].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  const laneEndTimes: Date[] = []
  const lanes: Record<string, number> = {}

  for (const b of sorted) {
    let placed = false
    for (let l = 0; l < laneEndTimes.length; l++) {
      if (b.startTime >= laneEndTimes[l]) {
        lanes[b.id] = l
        laneEndTimes[l] = b.endTime
        placed = true
        break
      }
    }
    if (!placed) {
      lanes[b.id] = laneEndTimes.length
      laneEndTimes.push(b.endTime)
    }
  }

  return { lanes, laneCount: laneEndTimes.length }
}

export async function getBookingCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const {
      dateFrom,
      dateTo,
      resourceType,
      eventId,
      eventStatus,
      resourceSearch,
    } = req.query as Record<string, string>

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ success: false, error: 'dateFrom and dateTo are required' })
    }

    const rangeStart = new Date(dateFrom)
    const rangeEnd   = new Date(dateTo)
    rangeEnd.setHours(23, 59, 59, 999)

    // ── 1. EventSpaces (primary source) ─────────────────────────────────────
    const eventSpaceWhere: any = {
      startTime: { lte: rangeEnd },
      endTime:   { gte: rangeStart },
      event: { tenantId },
    }
    if (eventId)     eventSpaceWhere.eventId = eventId
    if (eventStatus) eventSpaceWhere.event.status = eventStatus
    if (resourceType) eventSpaceWhere.resource = { type: resourceType, isActive: true }

    const eventSpaces = await prisma.eventSpace.findMany({
      where: eventSpaceWhere,
      include: {
        event: {
          select: {
            id: true, code: true, name: true, status: true,
            primaryClient: { select: { companyName: true, firstName: true, lastName: true } },
            _count: { select: { orders: true } },
          },
        },
        resource: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // ── 2. Orders with line items (secondary source) ─────────────────────────
    // Only include orders for events NOT already covered by EventSpaces,
    // OR orders that have explicit startDate/endDate that fall in range.
    const orderWhere: any = {
      tenantId,
      status: { not: 'CANCELLED' },
      startDate: { not: null, lte: rangeEnd },
      endDate:   { not: null, gte: rangeStart },
    }
    if (eventId)     orderWhere.eventId = eventId
    if (eventStatus) orderWhere.event = { status: eventStatus }

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        client: { select: { companyName: true, firstName: true, lastName: true, rfc: true, email: true } },
        event:  { select: { id: true, name: true, code: true, status: true } },
        lineItems: {
          include: { resource: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    })

    // ── 3. Gather all resources involved ─────────────────────────────────────
    const resourceMap = new Map<string, { id: string; code: string; name: string; type: string }>()

    for (const es of eventSpaces) {
      if (!resourceType || es.resource.type === resourceType) {
        resourceMap.set(es.resource.id, es.resource)
      }
    }
    for (const o of orders) {
      for (const li of o.lineItems) {
        if (!resourceType || li.resource.type === resourceType) {
          resourceMap.set(li.resource.id, li.resource)
        }
      }
    }

    // Optional resource name search
    let resources = Array.from(resourceMap.values())
    if (resourceSearch) {
      const q = resourceSearch.toLowerCase()
      resources = resources.filter(r =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      )
    }
    resources.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))

    const resourceIds = new Set(resources.map(r => r.id))

    // ── 4. Build bookings array ───────────────────────────────────────────────
    interface Booking {
      id: string
      resourceId: string
      type: 'EVENT_SPACE' | 'ORDER'
      phase?: string
      startTime: Date
      endTime: Date
      createdAt: Date
      lane: number
      overlapRank: number
      overlapCount: number
      notes?: string | null
      event?: any
      order?: any
      ordersCount?: number
      ordersTotal?: number
    }

    const rawBookings: Omit<Booking, 'lane' | 'overlapRank' | 'overlapCount'>[] = []

    // From EventSpaces
    for (const es of eventSpaces) {
      if (!resourceIds.has(es.resource.id)) continue
      // Count and sum orders for this event that reference this resource
      const relatedOrders = orders.filter(
        o => o.eventId === es.eventId &&
          o.lineItems.some(li => li.resourceId === es.resourceId)
      )
      rawBookings.push({
        id:         es.id,
        resourceId: es.resourceId,
        type:       'EVENT_SPACE',
        phase:      es.phase,
        startTime:  es.startTime,
        endTime:    es.endTime,
        createdAt:  es.createdAt,
        notes:      es.notes,
        event: {
          id:     es.event.id,
          code:   es.event.code,
          name:   es.event.name,
          status: es.event.status,
          primaryClient: es.event.primaryClient,
        },
        ordersCount: relatedOrders.length,
        ordersTotal: relatedOrders.reduce((s, o) => s + Number(o.total), 0),
      })
    }

    // From Orders (only for resources not already covered by EventSpaces for that event)
    const eventSpaceKeys = new Set(eventSpaces.map(es => `${es.eventId}-${es.resourceId}`))

    for (const o of orders) {
      for (const li of o.lineItems) {
        if (!resourceIds.has(li.resourceId)) continue
        const key = `${o.eventId}-${li.resourceId}`
        if (eventSpaceKeys.has(key)) continue // already covered by EventSpace

        const startTime = o.startDate ?? o.event?.eventStart
        const endTime   = o.endDate   ?? o.event?.eventEnd
        if (!startTime || !endTime) continue

        rawBookings.push({
          id:         `order-${o.id}-${li.resourceId}`,
          resourceId: li.resourceId,
          type:       'ORDER',
          startTime:  new Date(startTime),
          endTime:    new Date(endTime),
          createdAt:  o.createdAt,
          order: {
            id:          o.id,
            orderNumber: o.orderNumber,
            status:      o.status,
            total:       Number(o.total),
            client:      o.client,
            lineItems:   o.lineItems.map(l => l.description ?? l.resource.name),
          },
        })
      }
    }

    // ── 5. Assign lanes + overlap rank per resource ──────────────────────────
    const bookingsByResource = new Map<string, typeof rawBookings>()
    for (const b of rawBookings) {
      if (!bookingsByResource.has(b.resourceId)) bookingsByResource.set(b.resourceId, [])
      bookingsByResource.get(b.resourceId)!.push(b)
    }

    const laneCountByResource: Record<string, number> = {}
    const allLanes: Record<string, number> = {}
    // overlapRank: 1-based position within the set of bookings that overlap with
    // this booking on the same resource, sorted chronologically by createdAt.
    const allOverlapRanks:  Record<string, number> = {}
    const allOverlapCounts: Record<string, number> = {}

    for (const [rId, bList] of bookingsByResource.entries()) {
      // Visual lanes (unchanged rendering logic)
      const { lanes, laneCount } = assignLanes(
        bList.map(b => ({ id: b.id, startTime: b.startTime, endTime: b.endTime }))
      )
      Object.assign(allLanes, lanes)
      laneCountByResource[rId] = laneCount

      // Waitlist rank: for each booking, find all bookings it overlaps with
      // (including itself), sort by createdAt, assign 1-based position.
      for (const b of bList) {
        const overlapping = bList
          .filter(other => b.startTime < other.endTime && other.startTime < b.endTime)
          .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())

        const rank = overlapping.findIndex(o => o.id === b.id) + 1
        allOverlapRanks[b.id]  = rank
        allOverlapCounts[b.id] = overlapping.length
      }
    }

    const bookings: Booking[] = rawBookings.map(b => ({
      ...b,
      lane:         allLanes[b.id] ?? 0,
      overlapRank:  allOverlapRanks[b.id]  ?? 1,
      overlapCount: allOverlapCounts[b.id] ?? 1,
      startTime: b.startTime,
      endTime:   b.endTime,
    }))

    // ── 6. Enrich resources with conflict info ────────────────────────────────
    const enrichedResources = resources.map(r => ({
      ...r,
      laneCount:   laneCountByResource[r.id] ?? 0,
      hasConflict: (laneCountByResource[r.id] ?? 0) > 1,
    }))

    const conflictsCount = enrichedResources.filter(r => r.hasConflict).length

    res.json({
      success: true,
      data: {
        resources: enrichedResources,
        bookings:  bookings.map(b => ({
          ...b,
          startTime: b.startTime.toISOString(),
          endTime:   b.endTime.toISOString(),
        })),
        meta: {
          dateFrom:       dateFrom,
          dateTo:         dateTo,
          totalResources: enrichedResources.length,
          totalBookings:  bookings.length,
          conflictsCount,
        },
      },
    })
  } catch (err) {
    next(err)
  }
}
