import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as artworksController from '../controllers/gallery-artworks.controller'
import * as ordersController from '../controllers/gallery-orders.controller'
import * as cartController from '../controllers/gallery-cart.controller'

const router = Router()

// Webhook (no authentication required)
router.post('/webhooks/stripe', ordersController.handleStripeWebhook)

// All other routes require authentication
router.use(authenticate)

// ─── Artworks ────────────────────────────────────────────────────────────────
router.get('/artworks', artworksController.listArtworks)
router.post('/artworks', artworksController.createArtwork)
router.get('/artworks/:id', artworksController.getArtwork)
router.put('/artworks/:id', artworksController.updateArtwork)
router.delete('/artworks/:id', artworksController.deleteArtwork)
router.get('/artworks/:id/related', artworksController.getRelatedArtworks)

// ─── Shopping Cart ────────────────────────────────────────────────────────────
router.get('/cart', cartController.getCart)
router.get('/cart/summary', cartController.getCartSummary)
router.post('/cart/items', cartController.addToCart)
router.put('/cart/items/:cartItemId', cartController.updateCartItem)
router.delete('/cart/items/:cartItemId', cartController.removeFromCart)
router.delete('/cart', cartController.clearCart)

// ─── Orders ──────────────────────────────────────────────────────────────────
router.get('/orders', ordersController.listUserOrders)
router.post('/orders', ordersController.createOrder)
router.get('/orders/:id', ordersController.getOrder)
router.put('/orders/:id', ordersController.updateOrder)

// ─── Stripe Checkout ─────────────────────────────────────────────────────────
router.post('/orders/:orderId/checkout-session', ordersController.createCheckoutSession)
router.get('/checkout/session-status', ordersController.checkoutSessionStatus)

export default router
