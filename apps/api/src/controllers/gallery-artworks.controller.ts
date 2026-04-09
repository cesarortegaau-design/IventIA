import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../middleware/errorHandler'
import * as artworkService from '../services/gallery-artwork.service'
import { prisma } from '../config/database'

// Helper to get tenant ID from auth or query, default to first tenant
async function getTenantId(req: Request): Promise<string> {
  if (req.user?.tenantId) return req.user.tenantId
  if (req.query.tenantId) return req.query.tenantId as string
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) throw new AppError(400, 'NO_TENANT', 'No tenant found')
  return tenant.id
}

const createArtworkSchema = z.object({
  artistId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  collectionId: z.string().optional(),
  locationId: z.string().optional(),
  mediums: z.array(z.string()).default([]),
  styles: z.array(z.string()).default([]),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  depthCm: z.number().positive().optional(),
  mainImage: z.string().url().optional(),
  galleryImages: z.array(z.string().url()).default([]),
})

const updateArtworkSchema = createArtworkSchema.partial().extend({
  status: z.enum(['AVAILABLE', 'SOLD', 'RESERVED', 'ARCHIVED']).optional(),
})

const listArtworksSchema = z.object({
  artistId: z.string().optional(),
  collectionId: z.string().optional(),
  locationId: z.string().optional(),
  styles: z.string().optional(),
  mediums: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export async function createArtwork(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const data = createArtworkSchema.parse(req.body)

    const artwork = await artworkService.createArtwork({ ...data, tenantId })

    res.status(201).json({
      success: true,
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
}

export async function getArtwork(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req)
    const { id } = req.params

    const artwork = await artworkService.getArtwork(id, tenantId)

    res.json({
      success: true,
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
}

export async function listArtworks(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req)
    const query = listArtworksSchema.parse(req.query)

    const result = await artworkService.listArtworks({
      ...query,
      tenantId,
      styles: query.styles?.split(','),
      mediums: query.mediums?.split(','),
    })

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateArtwork(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params
    const data = updateArtworkSchema.parse(req.body)

    const artwork = await artworkService.updateArtwork(id, tenantId, data)

    res.json({
      success: true,
      data: artwork,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteArtwork(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    await artworkService.softDeleteArtwork(id, tenantId)

    res.json({
      success: true,
      message: 'Artwork archived',
    })
  } catch (error) {
    next(error)
  }
}

export async function getRelatedArtworks(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req)
    const { id } = req.params
    const limit = Math.min(parseInt(req.query.limit as string) || 4, 20)

    const artworks = await artworkService.getRelatedArtworks(id, tenantId, limit)

    res.json({
      success: true,
      data: artworks,
    })
  } catch (error) {
    next(error)
  }
}
