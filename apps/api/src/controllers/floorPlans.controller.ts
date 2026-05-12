import { Request, Response, NextFunction } from 'express'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import zlib from 'zlib'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const busboy = require('busboy') as typeof import('busboy')
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { deleteFromStorage, uploadToStorage, getPresignedUploadUrl, getPresignedDownloadUrl } from '../lib/storage'
import { env } from '../config/env'

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

// GET /events/:eventId/floor-plans/sign?filename=xxx
// Returns a presigned R2 PUT URL so the browser uploads directly (no size bottleneck on the server)
export async function getFloorPlanUploadSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const { filename } = req.query as { filename?: string }
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
      throw new AppError(503, 'R2_NOT_CONFIGURED', 'R2 no está configurado en el servidor')
    }

    const cleanFilename = (filename || 'plano.dxf').replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `floor-plans/${tenantId}/${eventId}/${Date.now()}-${cleanFilename}`
    const uploadUrl = await getPresignedUploadUrl(key, 'application/octet-stream', 300)

    res.json({ success: true, data: { uploadUrl, key, publicUrl: `${env.R2_PUBLIC_URL}/${key}` } })
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

// POST /events/:eventId/floor-plans/upload  (multipart/form-data, field: 'file')
// Streams the DXF directly from the HTTP request to R2 — no in-memory buffering,
// so large files (50 MB+) are handled without OOM errors on the API server.
export async function uploadFloorPlanFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
      throw new AppError(503, 'R2_NOT_CONFIGURED', 'R2 no está configurado en el servidor')
    }

    const floorPlan = await new Promise<any>((resolve, reject) => {
      const bb = busboy({ headers: req.headers, limits: { fileSize: 200 * 1024 * 1024 } })
      let fileStarted = false

      bb.on('file', (_field: string, fileStream: NodeJS.ReadableStream, info: { filename: string }) => {
        if (fileStarted) { (fileStream as NodeJS.ReadableStream & { resume(): void }).resume(); return }
        fileStarted = true

        const originalName = info.filename || 'plano.dxf'
        const chunks: Buffer[] = []

        fileStream.on('data', (chunk: Buffer) => { chunks.push(chunk) })
        fileStream.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks)
            const cleanFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
            const key = `floor-plans/${tenantId}/${eventId}/${Date.now()}-${cleanFilename}`

            // Upload to R2
            await uploadToStorage(buffer, key, 'application/octet-stream')
            const fileUrl = `${env.R2_PUBLIC_URL}/${key}`

            // Create DB record
            const fp = await prisma.floorPlan.create({
              data: {
                eventId,
                name: originalName.replace(/\.[^.]+$/, ''),
                fileUrl,
                fileName: originalName,
                uploadedById: userId,
              },
            })
            resolve(fp)
          } catch (err) {
            console.error('[uploadFloorPlanFile] R2 upload error:', err)
            reject(new AppError(502, 'UPLOAD_FAILED', 'Error al subir archivo a R2'))
          }
        })
        fileStream.on('error', reject)
      })

      bb.on('error', (err: Error) => { console.error('[uploadFloorPlanFile] Busboy error:', err); reject(err) })
      bb.on('close', () => {
        if (!fileStarted) reject(new AppError(400, 'MISSING_FILE', 'Se requiere un archivo DXF en el campo "file"'))
      })

      ;(req as NodeJS.ReadableStream).pipe(bb as unknown as NodeJS.WritableStream)
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

    await deleteFromStorage(fp.fileUrl)
    await prisma.floorPlan.delete({ where: { id: fpId } })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// GET /events/:eventId/floor-plans/:fpId/content
// Proxies the DXF file content from R2 (or Cloudinary for backwards compatibility) to avoid browser CORS issues
export async function getFloorPlanContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, fpId } = req.params
    const tenantId = req.user!.tenantId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const fp = await prisma.floorPlan.findFirst({ where: { id: fpId, eventId } })
    if (!fp) throw new AppError(404, 'NOT_FOUND', 'Plano no encontrado')

    let fileUrl: string

    // Detect if this is an R2 URL or Cloudinary URL
    const isCloudinary = fp.fileUrl.includes('cloudinary.com')
    const isR2 = fp.fileUrl.includes('.r2.dev') || (env.R2_PUBLIC_URL && fp.fileUrl.startsWith(env.R2_PUBLIC_URL))

    if (isR2) {
      // R2 URL: extract key from URL and get presigned download URL
      try {
        const key = fp.fileUrl.replace(`${env.R2_PUBLIC_URL}/`, '')
        fileUrl = await getPresignedDownloadUrl(key, 3600)
      } catch (signErr: any) {
        console.error('[getFloorPlanContent] R2 presigned URL generation failed:', signErr?.message)
        throw new AppError(502, 'FILE_FETCH_FAILED', `No se pudo generar URL de descarga: ${signErr?.message ?? 'error desconocido'}`)
      }
    } else if (isCloudinary) {
      // Backwards compatibility: Cloudinary URL
      const normalizedUrl = fp.fileUrl.replace(
        /res\.cloudinary\.com\/([^/]+)\/image\/upload\//,
        'res.cloudinary.com/$1/raw/upload/'
      )

      fileUrl = normalizedUrl
      try {
        const pubMatch = normalizedUrl.match(/\/(?:raw|image)\/upload\/(?:v\d+\/)?(.+)$/)
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME
        const apiKey    = process.env.CLOUDINARY_API_KEY
        const apiSecret = process.env.CLOUDINARY_API_SECRET
        if (pubMatch && cloudName && apiKey && apiSecret) {
          const publicId  = pubMatch[1]
          const timestamp = Math.round(Date.now() / 1000)
          const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`
          const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex')
          const qs = `public_id=${encodeURIComponent(publicId).replace(/%2F/gi, '/')}&api_key=${encodeURIComponent(apiKey)}&timestamp=${timestamp}&signature=${signature}`
          fileUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?${qs}`
        }
      } catch {
        // fallback to normalised URL
      }
    } else {
      throw new AppError(400, 'UNKNOWN_STORAGE', 'URL de almacenamiento desconocida')
    }

    let raw: Buffer
    try {
      raw = await fetchUrlAsBuffer(fileUrl)
    } catch (fetchErr: any) {
      const source = isR2 ? 'R2' : 'Cloudinary'
      console.error(`[getFloorPlanContent] Failed to fetch from ${source}:`, fetchErr?.message)
      throw new AppError(502, 'FILE_FETCH_FAILED', `No se pudo obtener el archivo: ${fetchErr?.message ?? 'error desconocido'}`)
    }

    let buffer: Buffer
    try {
      buffer = fp.fileName.endsWith('.gz') ? await gunzip(raw) : raw
    } catch (gzErr: any) {
      console.error('[getFloorPlanContent] Decompression failed:', gzErr?.message)
      throw new AppError(422, 'DECOMPRESS_FAILED', 'Error al descomprimir el archivo. Puede estar corrupto.')
    }

    // Try UTF-8 first; fall back to latin1 for older DXF files with extended ASCII
    let content: string
    const utf8 = buffer.toString('utf8')
    // Detect common UTF-8 corruption: replacement character U+FFFD indicates bad decode
    content = utf8.includes('\uFFFD') ? buffer.toString('latin1') : utf8

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
        reject(new Error(`HTTP ${statusCode} al obtener el archivo desde Cloudinary. Verifica que el archivo exista y sea accesible.`))
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
