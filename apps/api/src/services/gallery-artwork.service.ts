import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import Decimal from 'decimal.js'

export interface CreateArtworkInput {
  tenantId: string
  artistId: string
  title: string
  description?: string
  price: number | string
  quantity?: number
  collectionId?: string
  locationId?: string
  mediums?: string[]
  styles?: string[]
  widthCm?: number
  heightCm?: number
  depthCm?: number
  mainImage?: string
  galleryImages?: string[]
}

export interface UpdateArtworkInput extends Partial<CreateArtworkInput> {
  status?: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'ARCHIVED'
}

export async function createArtwork(input: CreateArtworkInput) {
  // Verify artist exists
  const artist = await prisma.galleryArtist.findFirst({
    where: { id: input.artistId, tenantId: input.tenantId, isActive: true },
  })
  if (!artist) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found')

  // Get current artist membership for commission
  const membership = await prisma.galleryMembership.findFirst({
    where: {
      artistId: input.artistId,
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  })

  const artwork = await prisma.galleryArtwork.create({
    data: {
      tenantId: input.tenantId,
      artistId: input.artistId,
      title: input.title,
      description: input.description,
      price: new Decimal(input.price),
      quantity: input.quantity ?? 1,
      collectionId: input.collectionId,
      locationId: input.locationId,
      mediums: input.mediums ?? [],
      styles: input.styles ?? [],
      widthCm: input.widthCm ? new Decimal(input.widthCm) : null,
      heightCm: input.heightCm ? new Decimal(input.heightCm) : null,
      depthCm: input.depthCm ? new Decimal(input.depthCm) : null,
      mainImage: input.mainImage,
      galleryImages: input.galleryImages ?? [],
      artistCommissionPercentage: membership ? membership.commissionPercentage : null,
      status: 'AVAILABLE',
    },
    include: { artist: true, collection: true, location: true },
  })

  return artwork
}

export async function getArtwork(id: string, tenantId: string) {
  const artwork = await prisma.galleryArtwork.findFirst({
    where: { id, tenantId, isActive: true },
    include: { artist: true, collection: true, location: true },
  })
  if (!artwork) throw new AppError(404, 'ARTWORK_NOT_FOUND', 'Artwork not found')
  return artwork
}

export interface ListArtworksOptions {
  tenantId: string
  artistId?: string
  collectionId?: string
  locationId?: string
  styles?: string[]
  mediums?: string[]
  minPrice?: number
  maxPrice?: number
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export async function listArtworks(options: ListArtworksOptions) {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = { tenantId: options.tenantId, isActive: true }

  if (options.artistId) where.artistId = options.artistId
  if (options.collectionId) where.collectionId = options.collectionId
  if (options.locationId) where.locationId = options.locationId
  if (options.status) where.status = options.status

  if (options.minPrice || options.maxPrice) {
    where.price = {}
    if (options.minPrice) where.price.gte = new Decimal(options.minPrice)
    if (options.maxPrice) where.price.lte = new Decimal(options.maxPrice)
  }

  if (options.search) {
    where.OR = [
      { title: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ]
  }

  // Filter by styles and mediums (JSON array contains)
  if (options.styles?.length) {
    where.styles = { hasSome: options.styles }
  }
  if (options.mediums?.length) {
    where.mediums = { hasSome: options.mediums }
  }

  const [artworks, total] = await Promise.all([
    prisma.galleryArtwork.findMany({
      where,
      include: { artist: true, collection: true, location: true },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.galleryArtwork.count({ where }),
  ])

  return {
    data: artworks,
    meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
  }
}

export async function updateArtwork(id: string, tenantId: string, input: UpdateArtworkInput) {
  const artwork = await getArtwork(id, tenantId)

  const updateData: any = {
    title: input.title ?? artwork.title,
    description: input.description ?? artwork.description,
    status: input.status ?? artwork.status,
  }

  if (input.price) updateData.price = new Decimal(input.price)
  if (input.quantity !== undefined) updateData.quantity = input.quantity
  if (input.collectionId) updateData.collectionId = input.collectionId
  if (input.locationId) updateData.locationId = input.locationId
  if (input.mediums) updateData.mediums = input.mediums
  if (input.styles) updateData.styles = input.styles
  if (input.widthCm) updateData.widthCm = new Decimal(input.widthCm)
  if (input.heightCm) updateData.heightCm = new Decimal(input.heightCm)
  if (input.depthCm) updateData.depthCm = new Decimal(input.depthCm)
  if (input.mainImage) updateData.mainImage = input.mainImage
  if (input.galleryImages) updateData.galleryImages = input.galleryImages

  const updated = await prisma.galleryArtwork.update({
    where: { id },
    data: updateData,
    include: { artist: true, collection: true, location: true },
  })

  return updated
}

export async function softDeleteArtwork(id: string, tenantId: string) {
  return updateArtwork(id, tenantId, { status: 'ARCHIVED' })
}

export async function getRelatedArtworks(artworkId: string, tenantId: string, limit = 4) {
  const artwork = await getArtwork(artworkId, tenantId)

  const related = await prisma.galleryArtwork.findMany({
    where: {
      tenantId,
      isActive: true,
      id: { not: artworkId },
      OR: [
        { artistId: artwork.artistId },
        { collectionId: artwork.collectionId },
        { styles: { hasSome: artwork.styles as string[] } },
      ],
    },
    include: { artist: true, collection: true },
    take: limit,
  })

  return related
}

export async function checkInventory(artworkId: string, quantity: number): Promise<boolean> {
  const artwork = await prisma.galleryArtwork.findUnique({ where: { id: artworkId } })
  if (!artwork) return false
  return artwork.quantity >= quantity
}

export async function reserveInventory(artworkId: string, quantity: number) {
  const updated = await prisma.galleryArtwork.update({
    where: { id: artworkId },
    data: { quantity: { decrement: quantity } },
  })
  return updated.quantity >= 0
}
