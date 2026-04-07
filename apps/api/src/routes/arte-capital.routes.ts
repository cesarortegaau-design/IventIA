import { Router } from 'express'
import * as controller from '../controllers/arte-capital.controller'
import { authenticateArteCapital, requireArtist, requireArteAdmin } from '../middleware/authenticate-arte-capital'

const router = Router()

// ─── Public Auth Routes (no authentication required) ──────────────────────

router.post('/auth/register', controller.register)
router.post('/auth/login', controller.login)
router.post('/auth/refresh', controller.refreshToken)

// ─── Protected Routes (authentication required) ───────────────────────────

// Profile
router.get('/user/profile', authenticateArteCapital, controller.getProfile)

// Products (public catalog)
router.get('/products', authenticateArteCapital, controller.listProducts)
router.get('/products/:productId', authenticateArteCapital, controller.getProduct)

// Artist: Create products
router.post('/products', authenticateArteCapital, requireArtist, controller.createProduct)

// Admin: Approve/Reject products
router.patch('/admin/products/:productId/approve', authenticateArteCapital, requireArteAdmin, controller.approveProduct)
router.patch('/admin/products/:productId/reject', authenticateArteCapital, requireArteAdmin, controller.rejectProduct)

// Membership Tiers (public list)
router.get('/memberships/tiers', authenticateArteCapital, controller.getMembershipTiers)

// User: Create/Get memberships
router.post('/memberships', authenticateArteCapital, controller.createMembership)
router.get('/user/membership', authenticateArteCapital, controller.getUserMembership)

// Orders
router.post('/orders', authenticateArteCapital, controller.createOrder)
router.get('/orders', authenticateArteCapital, controller.getUserOrders)

// Payments
router.post('/orders/:orderId/payments', authenticateArteCapital, controller.addPayment)

// Artist earnings
router.get('/artist/earnings', authenticateArteCapital, requireArtist, controller.getArtistEarnings)

export default router
