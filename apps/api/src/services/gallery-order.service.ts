import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import Decimal from 'decimal.js'
import Stripe from 'stripe'
import * as whatsappService from './whatsapp.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' })

export interface CreateGalleryOrderInput {
  tenantId: string
  userId: string
  cartId: string
  shippingAddress: {
    fullName: string
    email: string
    phone: string
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
}

// Generate order number: GAL-YYYY-NNNN
export async function generateOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `GAL-${year}-`
  const last = await prisma.galleryOrder.findFirst({
    where: { tenantId, orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  })
  const lastNum = last ? parseInt(last.orderNumber.replace(prefix, ''), 10) : 0
  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
}

export async function createGalleryOrder(input: CreateGalleryOrderInput) {
  // Get cart with items
  const cart = await prisma.galleryCart.findFirst({
    where: { id: input.cartId, tenantId: input.tenantId, userId: input.userId },
    include: {
      items: {
        include: {
          artwork: {
            include: { artist: true },
          },
        },
      },
    },
  })

  if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Cart not found')
  if (cart.items.length === 0) throw new AppError(400, 'EMPTY_CART', 'Cart is empty')

  // Check inventory and get totals
  let subtotal = new Decimal(0)
  const lineItemsData: any[] = []
  const artistCommissions = new Map<string, Decimal>()

  for (const item of cart.items) {
    // Verify inventory
    if (!item.artwork) throw new AppError(404, 'ARTWORK_NOT_FOUND', 'Artwork not found')
    if (item.artwork.quantity < item.quantity) {
      throw new AppError(400, 'INSUFFICIENT_INVENTORY', `Not enough inventory for ${item.artwork.title}`)
    }

    const unitPrice = new Decimal(item.artwork.price)
    const itemSubtotal = unitPrice.mul(new Decimal(item.quantity))
    subtotal = subtotal.add(itemSubtotal)

    // Calculate commission
    const commissionPct = item.artwork.artistCommissionPercentage || new Decimal(0)
    const commissionAmount = itemSubtotal.mul(commissionPct).div(new Decimal(100))

    lineItemsData.push({
      artworkId: item.artwork.id,
      quantity: item.quantity,
      unitPrice,
      artistCommissionPercentage: commissionPct,
      artistCommissionAmount: commissionAmount,
      subtotal: itemSubtotal,
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(0),
    })

    // Track commission by artist
    const artistId = item.artwork.artistId
    const current = artistCommissions.get(artistId) || new Decimal(0)
    artistCommissions.set(artistId, current.add(commissionAmount))
  }

  // Calculate tax (16% for Mexico, adjustable)
  const taxRate = new Decimal(process.env.TAX_RATE || 0.16)
  const taxAmount = subtotal.mul(taxRate)
  const totalPrice = subtotal.add(taxAmount)

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create order
    const order = await tx.galleryOrder.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        orderNumber: await generateOrderNumber(input.tenantId),
        status: 'PENDING',
        subtotal,
        taxAmount,
        totalPrice,
        discountAmount: new Decimal(0),
        paymentStatus: 'PENDING',
        shippingAddress: input.shippingAddress,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: { lineItems: { include: { artwork: true } } },
    })

    // Reserve inventory
    for (const item of cart.items) {
      await tx.galleryArtwork.update({
        where: { id: item.artworkId },
        data: { quantity: { decrement: item.quantity } },
      })
    }

    return order
  })

  // Send WhatsApp confirmation
  try {
    const phoneNumber = (input.shippingAddress.phone || '').replace(/[^0-9+]/g, '')
    if (phoneNumber) {
      await whatsappService.sendOrderConfirmation(phoneNumber, {
        orderNumber: order.orderNumber,
        total: Number(order.totalPrice),
        itemCount: order.lineItems.length,
      })
    }
  } catch (error) {
    console.error('Failed to send WhatsApp confirmation:', error)
    // Don't fail the order creation if WhatsApp fails
  }

  return order
}

export async function createStripeCheckoutSession(orderId: string, tenantId: string, baseUrl: string) {
  const order = await prisma.galleryOrder.findFirst({
    where: { id: orderId, tenantId },
    include: {
      lineItems: {
        include: { artwork: true },
      },
    },
  })

  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: order.lineItems.map((item) => ({
      price_data: {
        currency: 'mxn',
        product_data: {
          name: item.artwork.title,
          description: item.artwork.description || '',
          images: item.artwork.mainImage ? [item.artwork.mainImage] : [],
        },
        unit_amount: item.unitPrice.mul(100).toNumber(), // Stripe uses cents
      },
      quantity: item.quantity,
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 500, currency: 'mxn' }, // $5 MXN shipping
          display_name: 'Standard Shipping',
        },
      },
    ],
    billing_address_collection: 'required',
    customer_email: order.shippingAddress.email as any,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout?orderId=${orderId}`,
    metadata: {
      orderId: order.id,
      tenantId,
    },
  })

  // Save session ID
  await prisma.galleryOrder.update({
    where: { id: orderId },
    data: { stripeSessionId: session.id },
  })

  return session
}

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { orderId, tenantId } = session.metadata as any

      // Mark order as paid
      const order = await prisma.galleryOrder.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentStatus: 'PAID',
          stripePaymentIntentId: session.payment_intent as string,
        },
        include: { lineItems: { include: { artwork: { include: { artist: true } } } } },
      })

      // Send WhatsApp payment confirmation
      try {
        const phoneNumber = (order.shippingAddress.phone || '').replace(/[^0-9+]/g, '')
        if (phoneNumber) {
          await whatsappService.sendOrderStatusUpdate(phoneNumber, {
            orderNumber: order.orderNumber,
            status: 'PAID',
            estimatedDelivery: '5-7 business days',
          })
        }
      } catch (error) {
        console.error('Failed to send WhatsApp payment notification:', error)
      }

      // TODO: Create ArtistPayout records for commission tracking
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const { orderId } = charge.metadata as any

      if (orderId) {
        const order = await prisma.galleryOrder.update({
          where: { id: orderId },
          data: {
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
          },
        })

        // Send WhatsApp refund notification
        try {
          const phoneNumber = (order.shippingAddress.phone || '').replace(/[^0-9+]/g, '')
          if (phoneNumber) {
            await whatsappService.sendOrderStatusUpdate(phoneNumber, {
              orderNumber: order.orderNumber,
              status: 'CANCELLED',
            })
          }
        } catch (error) {
          console.error('Failed to send WhatsApp refund notification:', error)
        }
      }
      break
    }
  }
}

export async function getGalleryOrder(id: string, tenantId: string) {
  const order = await prisma.galleryOrder.findFirst({
    where: { id, tenantId },
    include: {
      lineItems: {
        include: { artwork: { include: { artist: true } } },
      },
    },
  })
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found')
  return order
}

export async function listUserOrders(userId: string, tenantId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize

  const [orders, total] = await Promise.all([
    prisma.galleryOrder.findMany({
      where: { userId, tenantId },
      include: { lineItems: { include: { artwork: true } } },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.galleryOrder.count({ where: { userId, tenantId } }),
  ])

  return {
    data: orders,
    meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
  }
}

export async function updateOrderStatus(id: string, tenantId: string, status: string, trackingNumber?: string) {
  const order = await getGalleryOrder(id, tenantId)

  const updated = await prisma.galleryOrder.update({
    where: { id },
    data: {
      status,
      trackingNumber: trackingNumber ?? order.trackingNumber,
    },
    include: { lineItems: { include: { artwork: true } } },
  })

  // Send WhatsApp notification for status change
  try {
    const phoneNumber = (updated.shippingAddress.phone || '').replace(/[^0-9+]/g, '')
    if (phoneNumber && (status === 'SHIPPED' || status === 'DELIVERED')) {
      await whatsappService.sendOrderStatusUpdate(phoneNumber, {
        orderNumber: updated.orderNumber,
        status,
        trackingNumber: trackingNumber,
        estimatedDelivery: status === 'SHIPPED' ? '3-5 business days' : undefined,
      })
    }
  } catch (error) {
    console.error('Failed to send WhatsApp status notification:', error)
  }

  return updated
}
