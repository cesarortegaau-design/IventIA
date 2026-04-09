import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AppError } from '../middleware/errorHandler'
import * as cartService from '../services/gallery-cart.service'

const addToCartSchema = z.object({
  artworkId: z.string().min(1),
  quantity: z.number().int().positive(),
})

const updateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative(),
})

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const tenantId = req.user!.tenantId

    const cart = await cartService.getCart(userId, tenantId)

    res.json({
      success: true,
      data: cart,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCartSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const tenantId = req.user!.tenantId

    const summary = await cartService.getCartSummary(userId, tenantId)

    res.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    next(error)
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const tenantId = req.user!.tenantId
    const data = addToCartSchema.parse(req.body)

    const item = await cartService.addToCart(userId, tenantId, data.artworkId, data.quantity)

    res.status(201).json({
      success: true,
      data: item,
    })
  } catch (error) {
    next(error)
  }
}

export async function removeFromCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const tenantId = req.user!.tenantId
    const { cartItemId } = req.params

    await cartService.removeFromCart(userId, tenantId, cartItemId)

    res.json({
      success: true,
      message: 'Item removed from cart',
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const tenantId = req.user!.tenantId
    const { cartItemId } = req.params
    const data = updateCartItemSchema.parse(req.body)

    const item = await cartService.updateCartItemQuantity(userId, tenantId, cartItemId, data.quantity)

    res.json({
      success: true,
      data: item,
    })
  } catch (error) {
    next(error)
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const tenantId = req.user!.tenantId

    await cartService.clearCart(userId, tenantId)

    res.json({
      success: true,
      message: 'Cart cleared',
    })
  } catch (error) {
    next(error)
  }
}
