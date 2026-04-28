import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'

export async function portalListEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId } = req.portalUser!

    const userEvents = await prisma.portalUserEvent.findMany({
      where: { portalUserId },
      include: {
        event: {
          select: {
            id: true, code: true, name: true, status: true,
            eventStart: true, eventEnd: true, setupStart: true, teardownEnd: true,
            venueLocation: true, portalEnabled: true,
            portalSettings: true,
            priceList: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { event: { eventStart: 'desc' } },
    })

    const events = userEvents
      .map((ue) => ue.event)
      .filter((e) => e.portalEnabled)

    res.json({ success: true, data: events })
  } catch (err) {
    next(err)
  }
}

export async function portalGetEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const { eventId } = req.params

    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, portalEnabled: true },
      include: {
        priceList: { select: { id: true, name: true, earlyCutoff: true, normalCutoff: true } },
        documents: { select: { id: true, documentType: true, fileName: true, blobKey: true, createdAt: true } },
        stands: {
          where: { isActive: true },
          select: {
            id: true, code: true, widthM: true, depthM: true, heightM: true, locationNotes: true,
            client: { select: { id: true, companyName: true, firstName: true, lastName: true } },
          },
        },
      },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    res.json({ success: true, data: event })
  } catch (err) {
    next(err)
  }
}

// GET /portal/events/:eventId/floor-plan  — floor plan + stands for portal viewer
export async function portalGetFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const { eventId } = req.params

    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, portalEnabled: true },
      select: { id: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    // Return the most recent floor plan
    const floorPlan = await prisma.floorPlan.findFirst({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    })

    if (!floorPlan) {
      return res.json({ success: true, data: null })
    }

    // Return stands with polygon (exclude BLOCKED from portal)
    const stands = await prisma.stand.findMany({
      where: { eventId, floorPlanId: floorPlan.id, isActive: true, status: { not: 'BLOCKED' } },
      select: {
        id: true, code: true, status: true, polygon: true, dxfEntityIdx: true,
        floorPlanId: true,
        widthM: true, depthM: true, heightM: true, locationNotes: true,
        client: { select: { companyName: true, firstName: true, lastName: true, logoUrl: true } },
      },
    })

    res.json({ success: true, data: { floorPlan, stands } })
  } catch (err) {
    next(err)
  }
}

// GET /portal/events/:eventId/floor-plan/:fpId/content — proxy DXF content
export async function portalGetFloorPlanContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const { eventId, fpId } = req.params

    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, portalEnabled: true },
      select: { id: true },
    })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const fp = await prisma.floorPlan.findFirst({ where: { id: fpId, eventId } })
    if (!fp) throw new AppError(404, 'NOT_FOUND', 'Plano no encontrado')

    const https = await import('https')
    const http = await import('http')
    const zlib = await import('zlib')

    function fetchBuf(url: string, hops = 5): Promise<Buffer> {
      return new Promise((resolve, reject) => {
        const client2 = url.startsWith('https') ? https.default : http.default
        client2.get(url, (proxyRes: any) => {
          const { statusCode, headers } = proxyRes
          if (statusCode >= 300 && statusCode < 400 && headers.location) {
            proxyRes.resume()
            if (hops === 0) { reject(new Error('Too many redirects')); return }
            fetchBuf(headers.location, hops - 1).then(resolve).catch(reject)
            return
          }
          if (statusCode >= 400) { proxyRes.resume(); reject(new Error(`HTTP ${statusCode}`)); return }
          const chunks: Buffer[] = []
          proxyRes.on('data', (chunk: Buffer) => { chunks.push(chunk) })
          proxyRes.on('end', () => resolve(Buffer.concat(chunks)))
          proxyRes.on('error', reject)
        }).on('error', reject)
      })
    }

    const raw = await fetchBuf(fp.fileUrl)

    const buffer = fp.fileName.endsWith('.gz')
      ? await new Promise<Buffer>((resolve, reject) => {
          zlib.default.gunzip(raw, (err, result) => { if (err) reject(err); else resolve(result) })
        })
      : raw
    const content = buffer.toString('utf8')

    res.json({ success: true, data: { content, fileName: fp.fileName } })
  } catch (err) {
    next(err)
  }
}

export async function portalGetCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { portalUserId, tenantId } = req.portalUser!
    const { eventId } = req.params

    const access = await prisma.portalUserEvent.findUnique({
      where: { portalUserId_eventId: { portalUserId, eventId } },
    })
    if (!access) throw new AppError(403, 'FORBIDDEN', 'No tienes acceso a este evento')

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, portalEnabled: true },
      select: { priceListId: true },
    })
    if (!event?.priceListId) {
      return res.json({ success: true, data: [] })
    }

    const items = await prisma.priceListItem.findMany({
      where: {
        priceListId: event.priceListId,
        isActive: true,
        resource: { portalVisible: true, isActive: true },
      },
      include: {
        resource: {
          select: {
            id: true, code: true, name: true, type: true, unit: true,
            portalDesc: true, portalBlobKey: true,
            imageMain: true, imageDesc: true, imageExtra: true,
          },
        },
      },
      orderBy: { resource: { name: 'asc' } },
    })

    // Determine pricing tier based on today vs cutoffs
    const priceList = await prisma.priceList.findUnique({ where: { id: event.priceListId } })
    const now = new Date()
    let tier: 'EARLY' | 'NORMAL' | 'LATE' = 'LATE'
    if (priceList?.earlyCutoff && now <= priceList.earlyCutoff) tier = 'EARLY'
    else if (priceList?.normalCutoff && now <= priceList.normalCutoff) tier = 'NORMAL'

    const catalog = items.map((item) => ({
      id: item.id,
      resource: item.resource,
      tier,
      unitPrice: tier === 'EARLY' ? item.earlyPrice : tier === 'NORMAL' ? item.normalPrice : item.latePrice,
      earlyPrice: item.earlyPrice,
      normalPrice: item.normalPrice,
      latePrice: item.latePrice,
      unit: item.unit,
    }))

    res.json({ success: true, data: catalog })
  } catch (err) {
    next(err)
  }
}
