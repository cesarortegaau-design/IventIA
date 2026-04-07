import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as arteAuthService from '../services/arte-capital-auth.service'
import * as arteCapitalService from '../services/arte-capital.service'
import * as arteMembershipService from '../services/arte-membership.service'
import * as artePaymentService from '../services/arte-payment.service'
import * as arteAuditService from '../services/arte-audit.service'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { PaymentMethod } from '@prisma/client'

// ─── Auth Schemas ─────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  userRole: z.enum(['ARTIST', 'COLLECTOR']),
  phone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── Product Schemas ──────────────────────────────────────────────────────

const createProductSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().optional(),
  membershipTierId: z.string().optional(),
  images: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        isMainImage: z.boolean().optional(),
      })
    )
    .optional(),
})

const approveProductSchema = z.object({
  approvedById: z.string().uuid(),
})

const rejectProductSchema = z.object({
  approvedById: z.string().uuid(),
  rejectionReason: z.string().min(1),
})

// ─── Membership Schemas ───────────────────────────────────────────────────

const createMembershipSchema = z.object({
  tierId: z.string().uuid(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  autoRenew: z.boolean().optional(),
})

// ─── Order & Payment Schemas ──────────────────────────────────────────────

const createOrderSchema = z.object({
  lineItems: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive().int(),
    })
  ),
  membershipTierId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

const addPaymentSchema = z.object({
  method: z.enum(['CASH', 'TRANSFER', 'CREDIT_CARD', 'CHECK', 'SWIFT']),
  amount: z.number().positive(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Auth Controllers ─────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body)
    const tenantId = req.headers['x-tenant-id'] as string || 'default'

    const result = await arteAuthService.arteCapitalRegister({
      ...input,
      tenantId,
    })

    res.status(201).json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const tenantId = req.headers['x-tenant-id'] as string || 'default'

    const result = await arteAuthService.arteCapitalLogin(email, password, tenantId)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const result = await arteAuthService.arteCapitalRefreshToken(refreshToken)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.artCapitalUser.findUnique({
      where: { id: req.arteCapitalUser!.artCapitalUserId },
      include: { artist: true },
    })

    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

// ─── Product Controllers ──────────────────────────────────────────────────

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProductSchema.parse(req.body)
    const userId = req.arteCapitalUser!.artCapitalUserId
    const tenantId = req.arteCapitalUser!.tenantId

    // Get artist profile
    const artist = await prisma.artCapitalArtist.findUnique({
      where: { userId },
    })

    if (!artist) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist profile not found')

    const product = await arteCapitalService.createArteCapitalProduct({
      tenantId,
      artistId: artist.id,
      createdById: userId,
      ...input,
    })

    await arteAuditService.logArteCapitalAudit({
      tenantId,
      userId,
      entityType: 'PRODUCT',
      entityId: product.id,
      action: 'CREATED',
      newValues: { title: product.title, status: product.status },
    })

    res.status(201).json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const product = await arteCapitalService.getArteCapitalProductById(productId)
    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.arteCapitalUser!.tenantId
    const { status, artistId, category, page = 1, pageSize = 20 } = req.query

    // Public endpoint shows only approved products
    const filters = {
      status: (req.arteCapitalUser?.userRole === 'ADMIN' ? status : 'APPROVED') as string,
      artistId: artistId as string,
      category: category as string,
      isActive: true,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    }

    const result = await arteCapitalService.listArteCapitalProducts(tenantId, filters)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function approveProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const { approvedById } = approveProductSchema.parse(req.body)

    const product = await arteCapitalService.approveArteCapitalProduct({
      productId,
      approvedById,
    })

    await arteAuditService.logArteCapitalAudit({
      tenantId: req.arteCapitalUser!.tenantId,
      userId: req.arteCapitalUser!.artCapitalUserId,
      entityType: 'PRODUCT',
      entityId: productId,
      action: 'APPROVED',
      newValues: { status: 'APPROVED' },
    })

    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

export async function rejectProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const { approvedById, rejectionReason } = rejectProductSchema.parse(req.body)

    const product = await arteCapitalService.rejectArteCapitalProduct({
      productId,
      approvedById,
      rejectionReason,
    })

    await arteAuditService.logArteCapitalAudit({
      tenantId: req.arteCapitalUser!.tenantId,
      userId: req.arteCapitalUser!.artCapitalUserId,
      entityType: 'PRODUCT',
      entityId: productId,
      action: 'REJECTED',
      newValues: { status: 'REJECTED', rejectionReason },
    })

    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
}

// ─── Membership Controllers ───────────────────────────────────────────────

export async function getMembershipTiers(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.arteCapitalUser!.tenantId

    const tiers = await prisma.artCapitalMembershipTier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    res.json({ success: true, data: tiers })
  } catch (err) {
    next(err)
  }
}

export async function createMembership(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createMembershipSchema.parse(req.body)
    const userId = req.arteCapitalUser!.artCapitalUserId

    const membership = await arteMembershipService.createMembership({
      userId,
      ...input,
    })

    res.status(201).json({ success: true, data: membership })
  } catch (err) {
    next(err)
  }
}

export async function getUserMembership(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.arteCapitalUser!.artCapitalUserId
    const membership = await arteMembershipService.getUserActiveMembership(userId)

    res.json({ success: true, data: membership })
  } catch (err) {
    next(err)
  }
}

// ─── Order Controllers ────────────────────────────────────────────────────

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body)
    const userId = req.arteCapitalUser!.artCapitalUserId
    const tenantId = req.arteCapitalUser!.tenantId

    // Fetch all line item products
    const products = await prisma.artCapitalProduct.findMany({
      where: {
        id: { in: input.lineItems.map((li) => li.productId) },
        status: 'APPROVED',
      },
    })

    if (products.length !== input.lineItems.length) {
      throw new AppError(400, 'INVALID_PRODUCTS', 'Some products not found or not approved')
    }

    // Calculate totals
    let subtotal = 0
    input.lineItems.forEach((li) => {
      const product = products.find((p) => p.id === li.productId)!
      subtotal += Number(product.price) * li.quantity
    })

    const taxAmount = subtotal * 0.16 // 16% default tax
    const total = subtotal + taxAmount

    // Create order
    const orderNumber = await arteCapitalService.generateArteCapitalOrderNumber(tenantId)
    const order = await prisma.artCapitalOrder.create({
      data: {
        tenantId,
        userId,
        orderNumber,
        status: 'QUOTED',
        subtotal,
        taxAmount,
        total,
        notes: input.notes,
        lineItems: {
          create: input.lineItems.map((li) => {
            const product = products.find((p) => p.id === li.productId)!
            const itemSubtotal = Number(product.price) * li.quantity
            const itemTax = itemSubtotal * 0.16
            return {
              productId: li.productId,
              quantity: li.quantity,
              unitPrice: product.price,
              taxAmount: itemTax,
              subtotal: itemSubtotal + itemTax,
            }
          }),
        },
      },
      include: { lineItems: true },
    })

    await arteAuditService.logArteCapitalAudit({
      tenantId,
      userId,
      entityType: 'ORDER',
      entityId: order.id,
      action: 'CREATED',
      newValues: { status: 'QUOTED', total },
    })

    res.status(201).json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
}

export async function getUserOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.arteCapitalUser!.artCapitalUserId
    const { page = 1, pageSize = 10 } = req.query

    const where = { userId }
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)

    const [total, orders] = await Promise.all([
      prisma.artCapitalOrder.count({ where }),
      prisma.artCapitalOrder.findMany({
        where,
        include: { lineItems: { include: { product: true } }, payments: true },
        skip,
        take: parseInt(pageSize as string),
        orderBy: { createdAt: 'desc' },
      }),
    ])

    res.json({ success: true, data: { orders, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } })
  } catch (err) {
    next(err)
  }
}

// ─── Payment Controllers ──────────────────────────────────────────────────

export async function addPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params
    const input = addPaymentSchema.parse(req.body)
    const userId = req.arteCapitalUser!.artCapitalUserId

    const payment = await artePaymentService.addArteCapitalPayment({
      orderId,
      userId,
      method: input.method as PaymentMethod,
      amount: input.amount,
      reference: input.reference,
      notes: input.notes,
    })

    res.status(201).json({ success: true, data: payment })
  } catch (err) {
    next(err)
  }
}

export async function getArtistEarnings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.arteCapitalUser!.artCapitalUserId

    const artist = await prisma.artCapitalArtist.findUnique({
      where: { userId },
    })

    if (!artist) throw new AppError(404, 'ARTIST_NOT_FOUND', 'Artist not found')

    const earnings = await artePaymentService.getArtistEarnings(artist.id)

    res.json({ success: true, data: earnings })
  } catch (err) {
    next(err)
  }
}
