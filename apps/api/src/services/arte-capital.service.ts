import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import Decimal from 'decimal.js'

// Generate sequential arte capital order number: ACO-YYYY-NNNN
export async function generateArteCapitalOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `ACO-${year}-`
  const last = await prisma.artCapitalOrder.findFirst({
    where: { tenantId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  })
  const lastNum = last ? parseInt(last.orderNumber.replace(prefix, ''), 10) : 0
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
}

export interface CreateArteCapitalProductInput {
  tenantId: string
  artistId: string
  createdById: string
  title: string
  description?: string
  price: number
  category?: string
  membershipTierId?: string
  images?: Array<{ imageUrl: string; isMainImage?: boolean }>
}

export async function createArteCapitalProduct(input: CreateArteCapitalProductInput) {
  // Verify artist exists and is active
  const artist = await prisma.artCapitalArtist.findUnique({
    where: { id: input.artistId },
  })

  if (!artist || !artist.isActive) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found or inactive')
  }

  // Verify user is the artist
  if (artist.userId !== input.createdById) {
    throw new AppError(403, 'NOT_ARTIST', 'Only the artist can create products')
  }

  const product = await prisma.artCapitalProduct.create({
    data: {
      tenantId: input.tenantId,
      artistId: input.artistId,
      createdById: input.createdById,
      title: input.title,
      description: input.description,
      price: new Decimal(input.price),
      category: input.category,
      membershipTierId: input.membershipTierId,
      status: 'PENDING_APPROVAL',
    },
    include: { images: true, createdBy: true },
  })

  // Upload images if provided
  if (input.images && input.images.length > 0) {
    await prisma.artCapitalProductImage.createMany({
      data: input.images.map((img, idx) => ({
        productId: product.id,
        uploadedById: input.createdById,
        imageUrl: img.imageUrl,
        displayOrder: idx,
        isMainImage: img.isMainImage ?? idx === 0,
      })),
    })
  }

  return product
}

export interface ApproveProductInput {
  productId: string
  approvedById: string
}

export async function approveArteCapitalProduct(input: ApproveProductInput) {
  const product = await prisma.artCapitalProduct.update({
    where: { id: input.productId },
    data: {
      status: 'APPROVED',
      approvedById: input.approvedById,
      approvedAt: new Date(),
    },
  })

  return product
}

export interface RejectProductInput {
  productId: string
  approvedById: string
  rejectionReason: string
}

export async function rejectArteCapitalProduct(input: RejectProductInput) {
  const product = await prisma.artCapitalProduct.update({
    where: { id: input.productId },
    data: {
      status: 'REJECTED',
      approvedById: input.approvedById,
      approvedAt: new Date(),
      rejectionReason: input.rejectionReason,
    },
  })

  return product
}

export async function getArteCapitalProductById(productId: string) {
  const product = await prisma.artCapitalProduct.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      artist: { include: { user: true } },
      membershipTier: true,
    },
  })

  if (!product) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found')
  }

  return product
}

export async function listArteCapitalProducts(
  tenantId: string,
  filters?: {
    status?: string
    artistId?: string
    category?: string
    isActive?: boolean
    page?: number
    pageSize?: number
  }
) {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = { tenantId }

  if (filters?.status) where.status = filters.status
  if (filters?.artistId) where.artistId = filters.artistId
  if (filters?.category) where.category = filters.category
  if (filters?.isActive !== undefined) where.isActive = filters.isActive

  const [total, products] = await Promise.all([
    prisma.artCapitalProduct.count({ where }),
    prisma.artCapitalProduct.findMany({
      where,
      include: {
        images: { orderBy: { displayOrder: 'asc' }, take: 1 },
        artist: { include: { user: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { products, total, page, pageSize }
}

export async function getArtistProfile(userId: string) {
  const artist = await prisma.artCapitalArtist.findUnique({
    where: { userId },
    include: { user: true },
  })

  if (!artist) {
    throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found')
  }

  return artist
}

export async function updateArtistProfile(userId: string, data: any) {
  const artist = await prisma.artCapitalArtist.update({
    where: { userId },
    data: {
      galleryName: data.galleryName,
      bankAccount: data.bankAccount,
      bankName: data.bankName,
    },
  })

  return artist
}
