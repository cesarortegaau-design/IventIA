import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import * as artworkService from './gallery-artwork.service'

export async function getOrCreateCart(userId: string, tenantId: string) {
  let cart = await prisma.galleryCart.findFirst({
    where: { userId, tenantId },
    include: {
      items: {
        include: {
          artwork: { include: { artist: true } },
          galleryClass: { include: { instructor: true, location: true } },
        },
      },
    },
  })

  if (!cart) {
    cart = await prisma.galleryCart.create({
      data: { userId, tenantId },
      include: {
        items: {
          include: {
            artwork: { include: { artist: true } },
            galleryClass: { include: { instructor: true, location: true } },
          },
        },
      },
    })
  }

  return cart
}

export async function getCart(userId: string, tenantId: string) {
  const cart = await prisma.galleryCart.findFirst({
    where: { userId, tenantId },
    include: {
      items: {
        include: {
          artwork: { include: { artist: true } },
          galleryClass: { include: { instructor: true, location: true } },
        },
      },
    },
  })

  if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Cart not found')
  return cart
}

export async function addToCart(
  userId: string,
  tenantId: string,
  artworkId: string,
  quantity: number,
  eventData?: { type: string; classId: string }
) {
  // Get or create cart
  const cart = await getOrCreateCart(userId, tenantId)

  if (eventData?.classId) {
    // Handle event/class item
    const galleryClass = await prisma.galleryClass.findFirst({
      where: { id: eventData.classId, tenantId, isActive: true, status: 'ACTIVE' },
    })
    if (!galleryClass) throw new AppError(404, 'CLASS_NOT_FOUND', 'Event not found or unavailable')

    // Check if item already in cart
    const existing = await prisma.galleryCartItem.findFirst({
      where: { cartId: cart.id, classId: eventData.classId },
    })

    let item
    if (existing) {
      // Update quantity
      item = await prisma.galleryCartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { galleryClass: { include: { instructor: true, location: true } } },
      })
    } else {
      // Create new item
      item = await prisma.galleryCartItem.create({
        data: {
          cartId: cart.id,
          classId: eventData.classId,
          quantity,
        },
        include: { galleryClass: { include: { instructor: true, location: true } } },
      })
    }

    return item
  } else {
    // Handle artwork item
    // Verify artwork exists and is available
    const artwork = await prisma.galleryArtwork.findFirst({
      where: { id: artworkId, tenantId, isActive: true, status: 'AVAILABLE' },
    })
    if (!artwork) throw new AppError(404, 'ARTWORK_NOT_FOUND', 'Artwork not found or unavailable')

    // Check inventory
    const available = await artworkService.checkInventory(artworkId, quantity)
    if (!available) throw new AppError(400, 'INSUFFICIENT_INVENTORY', 'Not enough inventory')

    // Check if item already in cart
    const existing = await prisma.galleryCartItem.findFirst({
      where: { cartId: cart.id, artworkId },
    })

    let item
    if (existing) {
      // Update quantity
      const newQuantity = existing.quantity + quantity
      const inventoryOk = await artworkService.checkInventory(artworkId, newQuantity - existing.quantity)
      if (!inventoryOk) throw new AppError(400, 'INSUFFICIENT_INVENTORY', 'Not enough inventory')

      item = await prisma.galleryCartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
        include: { artwork: { include: { artist: true } } },
      })
    } else {
      // Create new item
      item = await prisma.galleryCartItem.create({
        data: {
          cartId: cart.id,
          artworkId,
          quantity,
        },
        include: { artwork: { include: { artist: true } } },
      })
    }

    return item
  }
}

export async function removeFromCart(userId: string, tenantId: string, cartItemId: string) {
  // Verify cart ownership
  const cart = await getCart(userId, tenantId)

  const item = await prisma.galleryCartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
  })
  if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found')

  return prisma.galleryCartItem.delete({
    where: { id: cartItemId },
  })
}

export async function updateCartItemQuantity(
  userId: string,
  tenantId: string,
  cartItemId: string,
  quantity: number
) {
  // Verify cart ownership
  const cart = await getCart(userId, tenantId)

  const item = await prisma.galleryCartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
    include: { artwork: true },
  })
  if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found')

  // Check inventory
  if (quantity > 0) {
    const available = await artworkService.checkInventory(item.artworkId, quantity)
    if (!available) throw new AppError(400, 'INSUFFICIENT_INVENTORY', 'Not enough inventory')
  }

  if (quantity === 0) {
    return removeFromCart(userId, tenantId, cartItemId)
  }

  return prisma.galleryCartItem.update({
    where: { id: cartItemId },
    data: { quantity },
    include: { artwork: { include: { artist: true } } },
  })
}

export async function clearCart(userId: string, tenantId: string) {
  const cart = await getCart(userId, tenantId)

  await prisma.galleryCartItem.deleteMany({
    where: { cartId: cart.id },
  })

  return cart
}

export async function getCartSummary(userId: string, tenantId: string) {
  const cart = await getCart(userId, tenantId)

  let subtotal = 0
  let itemCount = 0
  const items = cart.items.map((item) => {
    const itemPrice = item.artwork ? Number(item.artwork.price) : Number(item.galleryClass?.price || 0)
    const lineTotal = itemPrice * item.quantity
    subtotal += lineTotal
    itemCount += item.quantity
    return {
      ...item,
      lineTotal,
    }
  })

  const taxRate = parseFloat(process.env.TAX_RATE || '0.16')
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  return {
    items,
    itemCount,
    subtotal,
    taxAmount,
    total,
    taxRate,
  }
}
