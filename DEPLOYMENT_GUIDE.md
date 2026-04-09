# Deployment Guide - Gallery System

## Overview

Your system is deployed across:
- **API**: Render (Node.js backend)
- **Admin SPA**: Vercel (React frontend)
- **Portal/Arte Capital**: Vercel (React frontend)
- **Database**: Neon PostgreSQL
- **Payments**: Stripe
- **Notifications**: Twilio WhatsApp

---

## Step 1: Update Render API Environment Variables

1. Go to https://dashboard.render.com
2. Select `iventia-api` service
3. Click **Settings** → **Environment**
4. Update these variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_jQqZz5ac1uOf@ep-dark-flower-amikg3or.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_KEY
STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_WEBHOOK_SECRET

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=+your_whatsapp_number

CORS_ORIGIN=https://ivent-admin.vercel.app,https://ivent-portal.vercel.app,https://ivent-ia-arte-capital.vercel.app

NODE_ENV=production
TAX_RATE=0.16
```

5. Click **Save Changes** - Render will auto-redeploy

---

## Step 2: Verify Vercel Apps Have Correct API URL

### Admin, Portal, and Arte Capital apps need:

```
VITE_API_URL=https://iventia-api.onrender.com/api/v1
```

If not set, add to each app's Environment Variables in Vercel, then redeploy.

---

## Step 3: Run Database Migrations (One-Time)

```bash
DATABASE_URL="postgresql://neondb_owner:npg_jQqZz5ac1uOf@ep-dark-flower-amikg3or.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" \
pnpm db:migrate
```

---

## Step 4: Verify Deployments

### Test API Health
```bash
curl https://iventia-api.onrender.com/health
# Expected: {"status":"ok","version":"1.0.0","env":"production"}
```

### Test Frontend Apps
- Admin: https://ivent-admin.vercel.app/login
- Portal: https://ivent-portal.vercel.app
- Arte Capital: https://ivent-ia-arte-capital.vercel.app/gallery

---

## Step 5: Test Production Workflow

### Admin Login
- Email: admin@exposaantafe.com.mx
- Password: Admin1234!
- Navigate to Gallery → Artworks

### Customer Gallery
- Visit https://ivent-ia-arte-capital.vercel.app/gallery
- Add artwork to cart
- Checkout with test Stripe card:
  - Card: `4242 4242 4242 4242`
  - Exp: `12/25`
  - CVC: `123`

---

## Step 6: Setup Production Stripe

1. Go to https://dashboard.stripe.com
2. Complete account verification
3. Get Production API Keys (`sk_live_...`)
4. Set `STRIPE_SECRET_KEY` in Render environment

### Configure Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://iventia-api.onrender.com/api/v1/gallery/webhooks/stripe`
3. Select events: `checkout.session.completed`, `charge.refunded`
4. Get signing secret (`whsec_live_...`)
5. Set `STRIPE_WEBHOOK_SECRET` in Render

---

## Step 7: Setup Twilio WhatsApp (Optional but Recommended)

1. Go to https://www.twilio.com
2. Setup WhatsApp Business Account
3. Get credentials and WhatsApp number
4. Set in Render:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_FROM=+your_whatsapp_number
   ```

---

## Deployment Checklist

Before going live:

- [ ] Step 1: Render env vars updated
- [ ] Step 2: Vercel VITE_API_URL set (all apps)
- [ ] Step 3: Migrations run
- [ ] Step 4: Health checks pass
- [ ] Step 5: Test workflow succeeds
- [ ] Step 6: Stripe configured
- [ ] Step 7: Twilio configured (optional)

---

## Post-Deployment

### Monitor
- Render logs for errors
- Stripe dashboard for transactions
- WhatsApp delivery (if configured)

### Load Data
- Create initial artworks in Admin
- Setup gallery locations
- Configure artist profiles

### Go Live
- Invite staff to Admin
- Invite artists to manage profiles
- Open gallery to collectors

---

## Troubleshooting

### CORS Error
→ Update CORS_ORIGIN in Render with all Vercel domains

### Database Connection Failed
→ Verify DATABASE_URL is correct in Render

### Stripe Payment Fails
→ Check STRIPE_SECRET_KEY uses production key (sk_live_)

### WhatsApp Not Sending
→ Verify TWILIO_ACCOUNT_SID and TWILIO_WHATSAPP_FROM format

---

Ready? Follow steps 1-7 and you're live! 🚀
