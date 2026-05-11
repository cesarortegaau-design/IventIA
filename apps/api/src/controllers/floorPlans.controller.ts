import { Request, Response, NextFunction } from 'express'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import zlib from 'zlib'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const busboy = require('busboy') as typeof import('busboy')
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { deleteFromCloudinary } from '../lib/cloudinary'
import cloudinary from '../lib/cloudinary'

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

// POST /events/:eventId/floor-plans/upload  (multipart/form-data, field: 'file')
// Streams the DXF directly from the HTTP request to Cloudinary — no in-memory buffering,
// so large files (50 MB+) are handled without OOM errors on the API server.
export async function uploadFloorPlanFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params
    const tenantId = req.user!.tenantId
    const userId   = req.user!.userId

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } })
    if (!event) throw new AppError(404, 'NOT_FOUND', 'Evento no encontrado')

    const floorPlan = await new Promise<any>((resolve, reject) => {
      const bb = busboy({ headers: req.headers, limits: { fileSize: 200 * 1024 * 1024 } })
      let fileStarted = false

      bb.on('file', (_field: string, fileStream: NodeJS.ReadableStream, info: { filename: string }) => {
        if (fileStarted) { (fileStream as NodeJS.ReadableStream & { resume(): void }).resume(); return }
        fileStarted = true

        const originalName = info.filename || 'plano.dxf'

        // Pipe the incoming file stream directly into Cloudinary — zero memory buffer
        const cloudStream = cloudinary.uploader.upload_stream(
          { folder: 'iventia/floor-plans', resource_type: 'raw', timeout: 600_000 },
          (error, result) => {
            if (error || !result) {
              console.error('[uploadFloorPlanFile] Cloudinary error:', error)
              reject(error ?? new Error('Error al subir a Cloudinary'))
              return
            }
            prisma.floorPlan.create({
              data: {
                eventId,
                name: originalName.replace(/\.[^.]+$/, ''),
                fileUrl: result.secure_url,
                fileName: originalName,
                uploadedById: userId,
              },
            }).then(resolve).catch(reject)
          },
        )

        fileStream.pipe(cloudStream as unknown as NodeJS.WritableStream)
        fileStream.on('error', reject)
        cloudStream.on('error', reject)
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

    // Extract the public_id from the stored Cloudinary URL.
    // Raw files may be stored under /raw/upload/ or /image/upload/ — normalise first.
    const normalizedUrl = fp.fileUrl.replace(
      /res\.cloudinary\.com\/([^/]+)\/image\/upload\//,
      'res.cloudinary.com/$1/raw/upload/'
    )

    // Use the Cloudinary Upload API's authenticated download endpoint instead of a
    // signed delivery URL.  Delivery-URL signing is fragile for files with compound
    // extensions (.dxf.gz) because the SDK strips the last extension when computing
    // the signature, causing a mismatch → 401.  The /raw/download API endpoint uses
    // the same Upload-API signature (sha1 of sorted params + secret) and is always
    // authorised by the API key/secret regardless of account delivery settings.
    let fileUrl = normalizedUrl
    try {
      const pubMatch = normalizedUrl.match(/\/(?:raw|image)\/upload\/(?:v\d+\/)?(.+)$/)
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME
      const apiKey    = process.env.CLOUDINARY_API_KEY
      const apiSecret = process.env.CLOUDINARY_API_SECRET
      if (pubMatch && cloudName && apiKey && apiSecret) {
        const publicId  = pubMatch[1]
        const timestamp = Math.round(Date.now() / 1000)
        // Params must be sorted alphabetically before signing (Cloudinary Upload API rule)
        const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`
        const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex')
        const dlUrl = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/raw/download`)
        dlUrl.searchParams.set('public_id', publicId)
        dlUrl.searchParams.set('api_key',   apiKey)
        dlUrl.searchParams.set('timestamp', String(timestamp))
        dlUrl.searchParams.set('signature', signature)
        fileUrl = dlUrl.toString()
      }
    } catch {
      // fallback to the normalised URL — may still work on accounts with public delivery
    }

    let raw: Buffer
    try {
      raw = await fetchUrlAsBuffer(fileUrl)
    } catch (fetchErr: any) {
      console.error('[getFloorPlanContent] Failed to fetch from Cloudinary:', fetchErr?.message, 'URL:', fileUrl.slice(0, 100))
      throw new AppError(502, 'FILE_FETCH_FAILED', `No se pudo obtener el archivo desde Cloudinary: ${fetchErr?.message ?? 'error desconocido'}`)
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
