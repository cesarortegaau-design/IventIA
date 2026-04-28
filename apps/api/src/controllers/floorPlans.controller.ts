import { Request, Response, NextFunction } from 'express'
import https from 'https'
import http from 'http'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { uploadToCloudinary, deleteFromCloudinary } from '../lib/cloudinary'

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

// POST /events/:eventId/floor-plans
export async function uploadFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No se recibió ningún archivo')

    const ext = req.file.originalname.split('.').pop()?.toLowerCase()
    if (!['dxf'].includes(ext ?? '')) {
      throw new AppError(400, 'INVALID_FILE', 'Solo se permiten archivos DXF')
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(k => !process.env[k]).join(', ')
      console.error(`[floor-plans] Cloudinary env vars missing: ${missing}`)
      throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', `Cloudinary no está configurado en el servidor. Variables faltantes: ${missing}`)
    }

    const name = (req.body.name as string)?.trim() || req.file.originalname.replace(/\.[^.]+$/, '')

    console.log(`[floor-plans] Uploading "${req.file.originalname}" (${req.file.size} bytes) to Cloudinary for event ${eventId}`)
    let url: string
    try {
      const result = await uploadToCloudinary(req.file.buffer, 'iventia/floor-plans', 'raw')
      url = result.url
      console.log(`[floor-plans] Upload OK: ${url}`)
    } catch (cloudErr: any) {
      console.error('[floor-plans] Cloudinary upload error:', cloudErr)
      throw new AppError(502, 'UPLOAD_FAILED', `Error al subir a Cloudinary: ${cloudErr?.message ?? cloudErr}`)
    }

    const floorPlan = await prisma.floorPlan.create({
      data: {
        eventId,
        name,
        fileUrl: url,
        fileName: req.file.originalname,
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

    const content = await fetchUrlAsText(fp.fileUrl)

    res.json({ success: true, data: { content, fileName: fp.fileName } })
  } catch (err) {
    next(err)
  }
}

function fetchUrlAsText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (proxyRes) => {
      let data = ''
      proxyRes.setEncoding('utf8')
      proxyRes.on('data', (chunk) => { data += chunk })
      proxyRes.on('end', () => resolve(data))
      proxyRes.on('error', reject)
    }).on('error', reject)
  })
}
