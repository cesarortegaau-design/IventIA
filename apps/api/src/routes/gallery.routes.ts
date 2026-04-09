import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as artworksController from '../controllers/gallery-artworks.controller'
import * as ordersController from '../controllers/gallery-orders.controller'
import * as cartController from '../controllers/gallery-cart.controller'
import * as classesController from '../controllers/gallery-classes.controller'
import * as notificationsController from '../controllers/gallery-notifications.controller'

const router = Router()

// ─── Public Routes (no authentication required) ────────────────────────────────
// Webhook
router.post('/webhooks/stripe', ordersController.handleStripeWebhook)

// Public gallery browsing
router.get('/artworks', artworksController.listArtworks)
router.get('/artworks/:id', artworksController.getArtwork)
router.get('/artworks/:id/related', artworksController.getRelatedArtworks)
router.get('/classes', classesController.listClasses)
router.get('/classes/:id', classesController.getClassDetails)

// ─── Protected Routes (authentication required) ────────────────────────────────
router.use(authenticate)

// ─── Artworks (Admin only) ────────────────────────────────────────────────────
router.post('/artworks', artworksController.createArtwork)
router.put('/artworks/:id', artworksController.updateArtwork)
router.delete('/artworks/:id', artworksController.deleteArtwork)

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

// ─── Classes/Workshops ──────────────────────────────────────────────────────
router.post('/classes', classesController.createClass)
router.post('/classes/enroll', classesController.enrollInClass)
router.get('/user/classes', classesController.getUserClasses)
router.delete('/enrollments/:enrollmentId', classesController.cancelEnrollment)

// ─── Notifications (Admin) ───────────────────────────────────────────────────
router.get('/notifications/whatsapp-status', notificationsController.getWhatsAppStatus)
router.post('/notifications/location', notificationsController.sendLocationNotification)
router.post('/notifications/broadcast', notificationsController.broadcastAnnouncement)
router.post('/notifications/bulk', notificationsController.sendBulkNotification)

export default router
