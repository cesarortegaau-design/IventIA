import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

// ── TicketEvent ───────────────────────────────────────────────────────────────

export async function getTicketEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const te = await prisma.ticketEvent.findUnique({
      where: { eventId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { seats: { orderBy: [{ row: 'asc' }, { number: 'asc' }] } },
        },
      },
    })
    res.json({ success: true, data: te ?? null })
  } catch (err) { next(err) }
}

export async function upsertTicketEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const { mode, priceListId, slug, active, description, imageUrl, mapImageUrl } = req.body

    if (slug) {
      const existing = await prisma.ticketEvent.findFirst({ where: { slug, NOT: { eventId } } })
      if (existing) throw new AppError(409, 'SLUG_TAKEN', 'El slug ya está en uso')
    }

    // Build update payload with only defined fields
    const updateData: Record<string, any> = {}
    if (mode !== undefined) updateData.mode = mode
    if (priceListId !== undefined) updateData.priceListId = priceListId
    if (slug !== undefined) updateData.slug = slug
    if (active !== undefined) updateData.active = active
    if (description !== undefined) updateData.description = description
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (mapImageUrl !== undefined) updateData.mapImageUrl = mapImageUrl

    const existing = await prisma.ticketEvent.findUnique({ where: { eventId } })

    let te
    if (existing) {
      te = await prisma.ticketEvent.update({
        where: { eventId },
        data: updateData,
        include: { sections: { orderBy: { sortOrder: 'asc' } } },
      })
    } else {
      te = await prisma.ticketEvent.create({
        data: {
          tenantId,
          eventId,
          mode: mode ?? 'SECTION',
          priceListId: priceListId ?? null,
          slug: slug ?? '',
          active: active ?? false,
          description: description ?? null,
          imageUrl: imageUrl ?? null,
          mapImageUrl: mapImageUrl ?? null,
        },
        include: { sections: { orderBy: { sortOrder: 'asc' } } },
      })
    }
    res.json({ success: true, data: te })
  } catch (err) { next(err) }
}

// ── TicketSection ─────────────────────────────────────────────────────────────

export async function createSection(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const te = await prisma.ticketEvent.findFirst({ where: { eventId, tenantId } })
    if (!te) throw new AppError(404, 'NOT_FOUND', 'Portal de boletos no encontrado')

    const { name, colorHex, capacity, price, resourceId, mapPolygon, sortOrder } = req.body
    const section = await prisma.ticketSection.create({
      data: { ticketEventId: te.id, name, colorHex: colorHex || '#6B46C1', capacity: Number(capacity ?? 0), price: Number(price ?? 0), resourceId: resourceId || null, mapPolygon: mapPolygon ?? null, sortOrder: Number(sortOrder ?? 0) },
    })
    res.status(201).json({ success: true, data: section })
  } catch (err) { next(err) }
}

export async function updateSection(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, sectionId } = req.params
    const tenantId = req.user!.tenantId
    const te = await prisma.ticketEvent.findFirst({ where: { eventId, tenantId } })
    if (!te) throw new AppError(404, 'NOT_FOUND', 'Portal de boletos no encontrado')

    const { name, colorHex, capacity, price, resourceId, mapPolygon, sortOrder } = req.body
    const section = await prisma.ticketSection.update({
      where: { id: sectionId },
      data: { name, colorHex, capacity, price, resourceId: resourceId || null, mapPolygon: mapPolygon ?? null, sortOrder },
    })
    res.json({ success: true, data: section })
  } catch (err) { next(err) }
}

export async function deleteSection(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, sectionId } = req.params
    const tenantId = req.user!.tenantId
    const te = await prisma.ticketEvent.findFirst({ where: { eventId, tenantId } })
    if (!te) throw new AppError(404, 'NOT_FOUND', 'Portal de boletos no encontrado')

    await prisma.ticketSection.delete({ where: { id: sectionId } })
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── TicketSeat (bulk generate for SEAT mode) ──────────────────────────────────

export async function generateSeats(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, sectionId } = req.params
    const tenantId = req.user!.tenantId
    const te = await prisma.ticketEvent.findFirst({ where: { eventId, tenantId } })
    if (!te) throw new AppError(404, 'NOT_FOUND', 'Portal de boletos no encontrado')

    const { rows, seatsPerRow } = req.body as { rows: string[]; seatsPerRow: number }
    if (!rows?.length || !seatsPerRow) throw new AppError(400, 'MISSING_FIELDS', 'rows y seatsPerRow son requeridos')

    // Delete existing seats for this section
    await prisma.ticketSeat.deleteMany({ where: { sectionId } })

    const data = rows.flatMap(row =>
      Array.from({ length: seatsPerRow }, (_, i) => ({ sectionId, row, number: i + 1, status: 'AVAILABLE' }))
    )
    await prisma.ticketSeat.createMany({ data })

    const seats = await prisma.ticketSeat.findMany({
      where: { sectionId },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    })
    res.json({ success: true, data: seats })
  } catch (err) { next(err) }
}

// ── TicketOrders (admin view) ─────────────────────────────────────────────────

export async function listTicketOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const te = await prisma.ticketEvent.findFirst({ where: { eventId, tenantId } })
    if (!te) throw new AppError(404, 'NOT_FOUND', 'Portal de boletos no encontrado')

    const orders = await prisma.ticketOrder.findMany({
      where: { ticketEventId: te.id },
      include: { items: { include: { section: true, seat: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: orders })
  } catch (err) { next(err) }
}
