# Arte Capital - End-to-End Testing Plan

## Overview
This document outlines the complete testing plan for the Arte Capital marketplace platform, covering all components from authentication to commission payouts.

---

## Phase 1: Authentication & User Registration

### Test 1.1: Collector Registration
**Steps:**
1. Navigate to `/register`
2. Fill in:
   - First Name: "Juan"
   - Last Name: "García"
   - Email: "juan@example.com"
   - User Role: "Collector"
   - Password: "SecurePass123!"
3. Click "Registrarse"

**Expected Result:**
- User created in `ArtCapitalUser` table
- JWT token returned and stored in auth store
- Redirected to `/dashboard`
- Auth header shows "Juan García"

### Test 1.2: Artist Registration
**Steps:**
1. Navigate to `/register`
2. Fill in:
   - First Name: "Maria"
   - Last Name: "López"
   - Email: "maria@example.com"
   - User Role: "Artist"
   - Password: "SecurePass123!"
3. Click "Registrarse"

**Expected Result:**
- `ArtCapitalUser` created with `userRole: ARTIST`
- `ArtCapitalArtist` profile created with `commissionRate: 15%`
- Token returned
- Redirected to `/dashboard`
- Artist menu item appears in sidebar

### Test 1.3: Login
**Steps:**
1. Logout previous user
2. Navigate to `/login`
3. Enter email and password from Test 1.1
4. Click "Entrar"

**Expected Result:**
- Auth tokens retrieved
- User data loaded
- Redirected to `/dashboard`
- Correct user profile displayed

---

## Phase 2: Product Lifecycle (Artist → Approval → Public)

### Test 2.1: Artist Uploads Product
**Setup:** Logged in as artist (Maria from Test 1.2)

**Steps:**
1. Navigate to `/artist-dashboard`
2. Click "Subir Nueva Obra"
3. Fill in:
   - Title: "Sunset Over Mountains"
   - Description: "Beautiful acrylic painting"
   - Price: "450.00"
   - Category: "Painting"
   - Upload 2 images
4. Click "Publicar"

**Expected Result:**
- `ArtCapitalProduct` created with:
  - `status: PENDING_APPROVAL`
  - `createdById: maria's_id`
  - `artistId: maria's_artist_id`
- 2 `ArtCapitalProductImage` records created
- Audit log entry: `action: CREATED`, `entityType: PRODUCT`
- Response includes product ID

### Test 2.2: Admin Approves Product
**Setup:** Logged in as admin user

**Steps:**
1. Navigate to admin panel `/arte-capital/admin/products`
2. Find "Sunset Over Mountains" (status: PENDING_APPROVAL)
3. Click "Aprobar"

**Expected Result:**
- Product status changes to `APPROVED`
- `approvedById` and `approvedAt` fields populated
- Audit log: `action: APPROVED`
- Product now visible in public catalog

### Test 2.3: Collector Views Approved Product in Catalog
**Setup:** Logged in as collector (Juan from Test 1.1)

**Steps:**
1. Navigate to `/catalog`
2. Search or browse for "Sunset Over Mountains"
3. Click product card to view details

**Expected Result:**
- Product displays with:
  - All images
  - Title, description, price
  - Artist name
  - "Agregar al Carrito" button
- Only approved products visible (not draft/rejected)

### Test 2.4: Admin Rejects Product
**Setup:** Logged in as admin

**Steps:**
1. Go to `/arte-capital/admin/products` filter to `PENDING_APPROVAL`
2. Select a pending product
3. Click "Rechazar"
4. Enter reason: "Image quality insufficient"
5. Submit

**Expected Result:**
- Product status changes to `REJECTED`
- `rejectionReason` stored
- Audit log: `action: REJECTED`, `oldValues`, `newValues`
- Product removed from public catalog

---

## Phase 3: Membership/Subscription System

### Test 3.1: Collector Views Membership Tiers
**Setup:** Logged in as collector

**Steps:**
1. Navigate to `/memberships`

**Expected Result:**
- 3+ membership tiers displayed (Bronze, Silver, Gold)
- Each shows:
  - Name, description
  - Monthly/Yearly price
  - Benefits list
  - Subscribe button

### Test 3.2: Collector Subscribes to Silver Tier
**Steps:**
1. On Memberships page, click "Suscribirse" on Silver tier
2. Confirm monthly billing cycle

**Expected Result:**
- `ArtCapitalMembership` created with:
  - `userId: juan_id`
  - `tierId: silver_tier_id`
  - `startDate: now`
  - `endDate: now + 1 month`
  - `renewalDate: endDate - 3 days`
  - `status: ACTIVE`
- User sees "✓ Miembro activo: Silver" tag
- Subscribe button becomes "Suscrito" (disabled)

### Test 3.3: Verify Membership Data in Database
**Expected:** Run query:
```sql
SELECT id, user_id, tier_id, start_date, end_date, renewal_date, status
FROM art_capital_memberships
WHERE user_id = 'juan_id' AND status = 'ACTIVE'
```
Should return the subscription created in Test 3.2

---

## Phase 4: Order & Payment Processing

### Test 4.1: Create Order with Products
**Setup:** Logged in as collector with membership

**Steps:**
1. Navigate to `/catalog`
2. Add 2-3 products to cart
3. Click cart icon → `/cart`
4. Click "Proceder al Pago" → `/checkout`
5. Select payment method: "Tarjeta de Crédito"
6. Click "Completar Compra"

**Expected Result:**
- `ArtCapitalOrder` created:
  - `orderNumber: ACO-2026-0001` (sequential)
  - `status: QUOTED`
  - `subtotal: sum of prices`
  - `taxAmount: subtotal * 0.16`
  - `total: subtotal + tax`
  - `paidAmount: 0`
- `ArtCapitalOrderLineItem` created for each product:
  - `productId`, `quantity`, `unitPrice`, `subtotal`, `taxAmount`
- Audit log: `action: CREATED`, `entityType: ORDER`

### Test 4.2: Add Payment to Order
**Steps:**
1. Get order ID from Test 4.1 (or list orders in admin)
2. Call API: `POST /arte-capital/orders/{orderId}/payments`
3. Payload:
   ```json
   {
     "method": "CREDIT_CARD",
     "amount": 522.00,
     "reference": "TXN-12345"
   }
   ```

**Expected Result:**
- `ArtCapitalPayment` created with:
  - `orderId`
  - `userId: juan_id`
  - `method: CREDIT_CARD`
  - `amount: 522.00`
  - `paymentDate: now`
  - `reference: TXN-12345`
- Order `paidAmount` updated to 522.00
- Order status changes to `PAID` (if full payment)
- Audit log entry created

### Test 4.3: Verify Order in Dashboard
**Steps:**
1. Navigate to `/orders`
2. Find the order from Test 4.1

**Expected Result:**
- Order displays:
  - Order number: `ACO-2026-0001`
  - Total: `$522.00`
  - Paid: `$522.00`
  - Status: `PAID` (green tag)
  - Timestamp

---

## Phase 5: Commission & Artist Earnings

### Test 5.1: Verify Commission Transaction Created
**Expected Behavior (automatic when order pays):**
- For each `OrderLineItem` in paid order, `ArtCapitalTransaction` created:
  - `artistId: maria_id`
  - `orderId: order_id`
  - `amount: itemPrice * itemQuantity`
  - `commissionRate: 15% (from artist)`
  - `commissionAmount: amount * rate / 100`
  - `status: PENDING`

**Query to verify:**
```sql
SELECT id, artist_id, amount, commission_rate, commission_amount, status
FROM art_capital_transactions
WHERE artist_id = 'maria_id' AND order_id = 'order_id'
```

### Test 5.2: Artist Views Earnings Dashboard
**Setup:** Logged in as artist (Maria)

**Steps:**
1. Navigate to `/artist-dashboard`

**Expected Result:**
- Displays:
  - Total Vendido: sum of all `amount` fields in transactions
  - Comisión Pendiente: sum of `commissionAmount` where `status = PENDING`
  - Table of all transactions with dates, amounts, commission

### Test 5.3: Verify Audit Trail for Product
**Setup:** Logged in as admin

**Steps:**
1. Navigate to audit logs
2. Filter by entityType: `PRODUCT`, entityId: `sunset_painting_id`

**Expected Result:**
- See entries:
  1. `CREATED` - when Maria uploaded
  2. `APPROVED` - when admin approved
  3. All with timestamps, user info, old/new values

---

## Phase 6: Admin Management Features

### Test 6.1: View All Artists
**Steps:**
1. Admin panel → Arte Capital → Artistas
2. Verify Maria López is listed

**Expected Result:**
- Table shows:
  - Name: Maria López
  - Galería: (empty if not set)
  - Comisión: 15%
  - Banco: (empty if not set)
  - Estado: Activo

### Test 6.2: View All Members
**Steps:**
1. Admin panel → Arte Capital → Miembros

**Expected Result:**
- Juan García listed with:
  - Tier: Silver
  - Fecha Fin: 1 month from today
  - Estado: ACTIVE

### Test 6.3: Sales Report
**Steps:**
1. Admin panel → Arte Capital → Reportes

**Expected Result:**
- Displays:
  - Ingresos Totales: $522.00
  - Comisiones Pendientes: $78.30 (15% of $522)
  - Total Órdenes: 1
  - By Artist: Maria López - $522 sold, $78.30 commission

---

## Phase 7: Token Refresh & Error Handling

### Test 7.1: Token Expiration & Auto-Refresh
**Setup:** Collector logged in

**Steps:**
1. Manually expire access token in browser DevTools (localStorage)
2. Make API call (e.g., navigate to `/orders`)
3. Token refresh should happen automatically

**Expected Result:**
- New access token obtained
- Request retried and succeeds
- User unaware of token refresh
- Still on `/orders` page with data

### Test 7.2: Invalid Refresh Token
**Steps:**
1. Clear refresh token from localStorage
2. Make API call after access token expires

**Expected Result:**
- Token refresh fails
- User redirected to `/login`
- Auth state cleared
- Must login again

### Test 7.3: Validation Errors
**Steps:**
1. Try to register with invalid data:
   - Email: "not-an-email"
   - Password: "short"
   - Missing firstName

**Expected Result:**
- Form validation errors displayed
- 400 error with details: `{ code: "VALIDATION_ERROR", details: {...} }`

---

## Database Verification

### Verify Schema
```bash
# Check all Arte Capital tables exist
psql -U postgres -d neondb -c "
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' AND tablename LIKE 'art_capital%'
  ORDER BY tablename;"
```

Expected tables:
- art_capital_users
- art_capital_artists
- art_capital_products
- art_capital_product_images
- art_capital_membership_tiers
- art_capital_memberships
- art_capital_orders
- art_capital_order_line_items
- art_capital_payments
- art_capital_transactions

### Verify Multi-Tenancy
```sql
SELECT DISTINCT tenant_id FROM art_capital_products LIMIT 5;
```
All records should belong to single tenant.

---

## API Endpoint Checklist

### Authentication
- [ ] POST `/auth/register` - User registration
- [ ] POST `/auth/login` - User login
- [ ] POST `/auth/refresh` - Token refresh
- [ ] GET `/user/profile` - Get profile

### Products (Public)
- [ ] GET `/products` - List approved products
- [ ] GET `/products/:id` - Get single product

### Products (Artist)
- [ ] POST `/products` - Create product (artist only)

### Products (Admin)
- [ ] PATCH `/admin/products/:id/approve` - Approve product
- [ ] PATCH `/admin/products/:id/reject` - Reject product

### Memberships
- [ ] GET `/memberships/tiers` - List tiers
- [ ] POST `/memberships` - Subscribe to tier
- [ ] GET `/user/membership` - Get active membership

### Orders
- [ ] POST `/orders` - Create order
- [ ] GET `/orders` - List user orders
- [ ] POST `/orders/:id/payments` - Add payment

### Artist
- [ ] GET `/artist/earnings` - Get earnings summary

---

## Performance Baselines

- Product list load time: < 500ms
- Product detail load time: < 300ms
- Checkout process: < 1s
- Payment processing: < 2s

---

## Security Checklist

- [ ] JWT tokens verified on every request
- [ ] User can only view own orders/earnings
- [ ] Artists cannot approve their own products
- [ ] Admin-only endpoints require privilege
- [ ] Input validation on all endpoints
- [ ] No sensitive data in error messages
- [ ] HTTPS enforced in production
- [ ] Rate limiting on auth endpoints

---

## Success Criteria

✅ All tests pass without errors
✅ Database queries are consistent
✅ No N+1 query problems
✅ Audit logs capture all mutations
✅ Multi-tenancy is enforced
✅ Commissions calculated correctly
✅ Tokens refresh automatically
✅ Error messages are helpful
✅ Performance is acceptable
✅ Security best practices followed

---

## Known Limitations & Future Work

1. **Shopping Cart:** Currently stateless (in-memory). Implement persistent cart using Zustand + localStorage
2. **Product Images:** Multiple images supported but upload UI not fully implemented
3. **Commission Payouts:** Transaction created but actual bank transfer not automated
4. **Recurring Billing:** Membership renewal logic ready but cron job not deployed
5. **Notifications:** Email/SMS notifications for orders/approvals not implemented
6. **Search/Filtering:** Basic search works, but advanced filtering needed
7. **Reviews:** Product reviews/ratings not implemented

---

## Rollout Checklist

- [ ] All tests passing
- [ ] Database backed up
- [ ] Environment variables configured
- [ ] API keys (Stripe, etc) in place
- [ ] Email templates ready
- [ ] Admin users created
- [ ] Monitoring alerts set up
- [ ] Logging configured
- [ ] Documentation updated
