# Gallery System End-to-End Testing Guide

## Prerequisites

✅ **Database**: Connected to Neon (`/neondb`)
✅ **Environment**: `.env` files configured
✅ **Code**: All gallery features implemented with WhatsApp integration

---

## Step 1: Verify Database & Migrations

```bash
# Check migration status
pnpm db:migrate

# Expected output:
# ✓ All migrations applied successfully
```

---

## Step 2: Start Development Servers

```bash
# Terminal 1: Start all dev servers
pnpm dev

# Expected services:
# - API: http://localhost:3001
# - Admin SPA: http://localhost:5173
# - Portal SPA: http://localhost:5174
```

**Wait for all servers to be ready** (you'll see logs indicating startup completion)

---

## Step 3: Access Admin Dashboard

### Login to Admin
- **URL**: http://localhost:5173/login
- **Email**: admin@exposaantafe.com.mx
- **Password**: Admin1234!

### Navigate to Gallery Section
1. Left sidebar → Gallery Management
2. You should see: Artworks, Artists, Collections, Locations, Classes, Orders

---

## Step 4: Create Test Location (For WhatsApp)

**Navigation**: Admin → Gallery → Locations

1. Click **"Add Location"**
2. Fill in:
   - **Name**: Galería Principal CDMX
   - **Address**: Av. Paseo de la Reforma 505, Mexico City
   - **City**: Mexico City
   - **Phone**: +52 55 1234 5678
   - **WhatsApp**: +34611111111 *(Optional - for testing WhatsApp)*
   - **Hours**: Mon-Sun 10am-6pm
3. Click **"Create"**

---

## Step 5: Create Test Artwork

**Navigation**: Admin → Gallery → Artworks

1. Click **"Add Artwork"**
2. Fill in all fields:

```
Title: "Sunset Over the Valley"
Description: "A beautiful oil painting capturing golden hour light"
Price: 2500.00
Quantity: 3
Mediums: [OIL]
Styles: [IMPRESSIONISM, CONTEMPORARY]
Main Image URL: https://via.placeholder.com/600x400?text=Artwork
```

3. Click **"Create"**

Expected: Artwork appears in list with status "AVAILABLE"

---

## Step 6: Browse Gallery (Customer Side)

### Access Arte Capital
- **URL**: http://localhost:5174

### Auto-Login or Register
- If needed, create a collector account:
  - Email: collector@test.com
  - Password: Test1234!
  - User Type: Collector

### Browse Gallery
1. Navigate to **Gallery** (main menu)
2. You should see your created artwork in grid
3. Test filters:
   - Search: "Sunset"
   - Filter by Style: IMPRESSIONISM
   - Filter by Medium: OIL
   - Price range: $2000-$3000

Expected: Artwork appears in results with image, price, and "Available" badge

---

## Step 7: Add to Cart & View Cart

1. Click on artwork card → **"Ver detalles"** (View Details)
2. On detail page:
   - View full product info
   - See related artworks
   - Set Quantity: 1
   - Click **"Add to Cart"**

Expected: Success message "Added to cart"

3. Navigate to **Cart**
   - Should see artwork with quantity selector
   - Order summary shows:
     - Subtotal: $2,500.00
     - Tax (16%): $400.00
     - **Total: $2,900.00**

---

## Step 8: Test Checkout with Stripe

1. Click **"Ir a Pagar"** (Proceed to Checkout)
2. Fill in shipping address:
   ```
   Full Name: John Collector
   Email: collector@test.com
   Phone: +34612345678
   Street: 123 Art Street
   City: Madrid
   State: Madrid
   ZIP: 28001
   Country: Spain
   ```
3. Click **"Proceed to Checkout"**

Expected: Redirects to Stripe checkout page

### Stripe Test Payment

Use Stripe's test card:
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: `12/25`
- **CVC**: `123`
- **ZIP**: `12345`

Complete the payment flow

Expected: 
- Redirected to success page
- Order created in database
- Status: PAID
- ✅ **WhatsApp notification sent** (if Twilio configured)

---

## Step 9: Verify Order in Admin

**Navigation**: Admin → Gallery → Orders

1. Should see new order with:
   - Order Number: `GAL-2026-0001`
   - Status: PAID
   - Total: $2,900.00
   - Customer: John Collector
   - Items: 1 artwork

2. Click to view details:
   - Line items with commission info
   - Shipping address
   - Payment status

---

## Step 10: Test Order Status Updates

1. From order detail page:
   - Change status to **"SHIPPED"**
   - Add Tracking Number: `TRACK123456789`
   - Save

Expected:
- Status updates
- ✅ **WhatsApp notification sent** (if Twilio configured)

2. Change status to **"DELIVERED"**

Expected:
- ✅ **WhatsApp notification sent** (if Twilio configured)

---

## Step 11: Test Classes (Bonus)

### Create a Class (Admin)

**Navigation**: Admin → Gallery → Classes

1. Click **"Add Class"**
2. Fill in:
   ```
   Name: Oil Painting Basics
   Instructor: [Select an artist if available]
   Location: Galería Principal CDMX
   Description: Learn the fundamentals of oil painting
   Schedule: {"day_of_week": "Monday", "time": "6:00 PM"}
   Capacity: 20
   Price: 150.00
   ```

### Enroll in Class (Customer)

1. Go to Arte Capital → Classes
2. Find your class
3. Click **"Enroll"**

Expected:
- Enrollment confirmed
- ✅ **WhatsApp notification with class details** (if Twilio configured)

---

## Step 12: Test WhatsApp Status (If Configured)

### Check Configuration
- **URL**: `http://localhost:3001/api/v1/gallery/notifications/whatsapp-status`
- Should show: `{"configured": true/false}`

### Send Test Notification (Admin API)

```bash
curl -X POST http://localhost:3001/api/v1/gallery/notifications/location \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "LOCATION_ID",
    "message": "🎨 New exhibition opening this weekend! Visit us for art talks and live painting."
  }'
```

---

## Testing Checklist

### Gallery Features
- [ ] Can create artwork in Admin
- [ ] Artwork appears in customer gallery
- [ ] Search and filters work
- [ ] Can add artwork to cart
- [ ] Cart totals are correct (with tax)
- [ ] Can proceed to checkout

### Stripe Integration
- [ ] Stripe checkout page loads
- [ ] Test payment completes successfully
- [ ] Order status changes to PAID
- [ ] Order appears in Admin

### WhatsApp Integration
- [ ] Order confirmation sent (if Twilio configured)
- [ ] Payment confirmation sent (if Twilio configured)
- [ ] Status update notifications sent (if Twilio configured)
- [ ] Can broadcast announcements from Admin

### Data Integrity
- [ ] Inventory decreases after order
- [ ] Commission calculations correct
- [ ] Multi-tenancy isolated (if multiple tenants)
- [ ] Audit logs created

---

## Troubleshooting

### API Connection Issues
```bash
# Check API is running
curl http://localhost:3001/health

# Expected: {"status":"ok","version":"1.0.0","env":"development"}
```

### Database Issues
```bash
# Check connection
pnpm db:studio

# Should open Prisma Studio UI
```

### Stripe Payment Fails
- Check `STRIPE_SECRET_KEY` in `.env`
- Use test mode key: `sk_test_...`
- Use test card: `4242 4242 4242 4242`

### WhatsApp Not Sending
- Check Twilio credentials in `.env`
- Logs will show: "WhatsApp not configured" (non-blocking)
- Feature gracefully degrades if not configured

---

## Performance Notes

- **Gallery loading**: Should be <1s with filters
- **Checkout**: Should complete in <5s
- **Database queries**: Indexed for tenant + status

---

## Next Steps After Testing

✅ **If everything works:**
1. Deploy to staging
2. Test with real Twilio account
3. Create production Stripe keys
4. Load sample artworks
5. Open to collectors

📊 **Monitoring:**
- Check order success rate
- Monitor WhatsApp delivery
- Track inventory changes
- Review commission calculations

---

## Support

For issues:
1. Check `/apps/api/.env` - all vars set?
2. Run `pnpm db:migrate` - migrations up to date?
3. Check logs: `pnpm dev` output
4. Database: Use Prisma Studio `pnpm db:studio`

Happy testing! 🎨
