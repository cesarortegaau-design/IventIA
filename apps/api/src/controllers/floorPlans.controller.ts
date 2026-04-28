import { Request, Response, NextFunction } from 'express'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import zlib from 'zlib'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { deleteFromCloudinary } from '../lib/cloudinary'

// GET /events/:eventId/floor-plans
export async function listFloorPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const floorPlans = await prisma.floorPlan.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: floorPlans })
  } catch (err) {
    next(err)
  }
}

// GET /events/:eventId/floor-plans/sign
// Returns a Cloudinary signed-upload payload so the browser uploads directly (no size bottleneck on the server)
export async function getFloorPlanUploadSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const apiKey    = process.env.CLOUDINARY_API_KEY
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME

    if (!apiSecret || !apiKey || !cloudName) {
      throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Cloudinary no está configurado en el servidor')
    }

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'iventia/floor-plans'
    // Params must be sorted alphabetically before signing
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex')

    res.json({ success: true, data: { timestamp, signature, apiKey, cloudName, folder } })
  } catch (err) {
    next(err)
  }
}

// POST /events/:eventId/floor-plans  (JSON body: { fileUrl, fileName, name? })
// Called after the browser has uploaded directly to Cloudinary
export async function createFloorPlanRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const { fileUrl, fileName, name } = req.body as { fileUrl?: string; fileName?: string; name?: string }
    if (!fileUrl || !fileName) throw new AppError(400, 'MISSING_FIELDS', 'fileUrl y fileName son requeridos')

    const floorPlan = await prisma.floorPlan.create({
      data: {
        eventId,
        name: name?.trim() || fileName.replace(/\.[^.]+$/, ''),
        fileUrl,
        fileName,
        uploadedById: userId,
      },
    })

    res.status(201).json({ success: true, data: floorPlan })
  } catch (err) {
    next(err)
  }
}

// DELETE /events/:eventId/floor-plans/:fpId
export async function deleteFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, fpId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const fp = await prisma.floorPlan.findFirst({ where: { id: fpId, eventId } })
    if (!fp) throw new AppError(404, 'NOT_FOUND', 'Plano no encontrado')

    await deleteFromCloudinary(fp.fileUrl, 'raw')
    await prisma.floorPlan.delete({ where: { id: fpId } })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// GET /events/:eventId/floor-plans/:fpId/content
// Proxies the DXF file content from Cloudinary to avoid browser CORS issues
export async function getFloorPlanContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, fpId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const fp = await prisma.floorPlan.findFirst({ where: { id: fpId, eventId } })
    if (!fp) throw new AppError(404, 'NOT_FOUND', 'Plano no encontrado')

    const raw = await fetchUrlAsBuffer(fp.fileUrl)
    const buffer = fp.fileName.endsWith('.gz') ? await gunzip(raw) : raw
    const content = buffer.toString('utf8')

    res.json({ success: true, data: { content, fileName: fp.fileName } })
  } catch (err) {
    next(err)
  }
}

function fetchUrlAsBuffer(url: string, redirectsLeft = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (proxyRes) => {
      const { statusCode, headers } = proxyRes
      // Follow redirects
      if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
        proxyRes.resume() // discard body
        if (redirectsLeft === 0) { reject(new Error('Too many redirects')); return }
        fetchUrlAsBuffer(headers.location, redirectsLeft - 1).then(resolve).catch(reject)
        return
      }
      if (statusCode && statusCode >= 400) {
        proxyRes.resume()
        reject(new Error(`Failed to fetch file: HTTP ${statusCode}`))
        return
      }
      const chunks: Buffer[] = []
      proxyRes.on('data', (chunk: Buffer) => { chunks.push(chunk) })
      proxyRes.on('end', () => resolve(Buffer.concat(chunks)))
      proxyRes.on('error', reject)
    }).on('error', reject)
  })
}

function gunzip(buf: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buf, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
