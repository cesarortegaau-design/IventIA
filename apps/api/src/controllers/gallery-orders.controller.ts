import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../middleware/errorHandler'
import * as orderService from '../services/gallery-order.service'
import Stripe from 'stripe'

const createOrderSchema = z.object({
  cartId: z.string().min(1),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(1).default('MX'),
  }),
})

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().optional(),
})

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.id
    const data = createOrderSchema.parse(req.body)

    const order = await orderService.createGalleryOrder({
      tenantId,
      userId,
      ...data,
    })

    res.status(201).json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const order = await orderService.getGalleryOrder(id, tenantId)

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

export async function listUserOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.id
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 20)

    const result = await orderService.listUserOrders(userId, tenantId, page, pageSize)

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params
    const data = updateOrderSchema.parse(req.body)

    const order = await orderService.updateOrderStatus(id, tenantId, data.status, data.trackingNumber)

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    next(error)
  }
}

export async function createCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId
    const { orderId } = req.params

    const baseUrl = `${req.protocol}://${req.get('host')}`
    const session = await orderService.createStripeCheckoutSession(orderId, tenantId, baseUrl)

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      throw new AppError(500, 'WEBHOOK_SECRET_NOT_SET', 'Stripe webhook secret not configured')
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
    } catch (err) {
      throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature')
    }

    await orderService.handleStripeWebhook(event)

    res.json({
      success: true,
      received: true,
    })
  } catch (error) {
    next(error)
  }
}

export async function checkoutSessionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.query

    if (!sessionId) {
      throw new AppError(400, 'SESSION_ID_REQUIRED', 'Session ID is required')
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' })
    const session = await stripe.checkout.sessions.retrieve(sessionId as string)

    res.json({
      success: true,
      data: {
        status: session.payment_status,
        orderId: session.metadata?.orderId,
        customerEmail: session.customer_email,
      },
    })
  } catch (error) {
    next(error)
  }
}
