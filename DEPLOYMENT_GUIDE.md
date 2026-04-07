# Deployment Guide - Arte Capital & IventIA Platform

## Overview

This guide covers deploying all three applications (API, Admin, Portal, and Arte Capital) to **Vercel** + **External Database**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  arte-capital.vercel.app ──┐                             │
│  admin.vercel.app ─────────┼──> api.vercel.app          │
│  portal.vercel.app ────────┘     (Backend REST API)     │
│                                        ↓                 │
│                             PostgreSQL Database          │
│                             (Neon.tech or AWS RDS)       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **GitHub Account** - Repository already pushed ✅
2. **Vercel Account** - Free tier available at vercel.com
3. **Database** - PostgreSQL (Neon.tech recommended, free tier available)
4. **Environment Variables** - Ready to configure

---

## Step 1: Database Setup (PostgreSQL)

### Option A: Neon.tech (Recommended - Free)

1. Go to https://neon.tech/
2. Sign up with GitHub
3. Create new project
4. Copy the connection string
5. Save as `DATABASE_URL` for Step 3

### Option B: AWS RDS

1. Create RDS PostgreSQL instance
2. Configure security groups to allow Vercel
3. Copy connection string

### Option C: Use Existing Database

If you already have a database, just get the connection string.

---

## Step 2: Prepare Environment Variables

Create a document with these variables (you'll enter in Vercel dashboard):

### API Environment Variables
```
DATABASE_URL = postgresql://user:password@host:5432/iventia_db
REDIS_URL = redis://... (optional for MVP)
JWT_SECRET = your-very-long-random-secret-string-min-32-chars
JWT_EXPIRES_IN = 15m
JWT_REFRESH_EXPIRES_IN = 7d
NODE_ENV = production
PORT = 3001
CORS_ORIGIN = https://admin.vercel.app,https://arte-capital.vercel.app,https://portal.vercel.app
SENDGRID_API_KEY = (optional, for email)
STRIPE_SECRET_KEY = (optional, for payments)
```

### Admin Environment Variables
```
VITE_API_URL = https://api.vercel.app/api/v1
```

### Portal Environment Variables
```
VITE_API_URL = https://api.vercel.app/api/v1
```

### Arte Capital Environment Variables
```
VITE_API_URL = https://api.vercel.app/api/v1/arte-capital
```

---

## Step 3: Deploy to Vercel

### 3.1 Deploy API Server

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import from GitHub → select `IventIA` repository
4. **Framework Preset**: Node.js
5. **Root Directory**: `apps/api`
6. Click "Edit" before deploying:
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: (leave blank)
   - Install Command: `pnpm install`
7. Add environment variables (from Step 2)
8. Click "Deploy"
9. Copy the API URL (e.g., `https://api-xxxx.vercel.app`)

### 3.2 Deploy Arte Capital SPA

1. Create new project in Vercel
2. Import `IventIA` repo again
3. **Framework Preset**: Vite
4. **Root Directory**: `apps/arte-capital`
5. Click "Edit":
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: `dist`
6. Add environment variables:
   ```
   VITE_API_URL=https://api-xxxx.vercel.app/api/v1/arte-capital
   ```
7. Click "Deploy"
8. Note the URL (e.g., `https://arte-capital-xxx.vercel.app`)

### 3.3 Deploy Admin SPA

1. Create new project in Vercel
2. Import `IventIA` repo
3. **Framework Preset**: Vite
4. **Root Directory**: `apps/admin`
5. Click "Edit":
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: `dist`
6. Add environment variables:
   ```
   VITE_API_URL=https://api-xxxx.vercel.app/api/v1
   ```
7. Click "Deploy"

### 3.4 Deploy Portal SPA

1. Create new project in Vercel
2. Import `IventIA` repo
3. **Framework Preset**: Vite
4. **Root Directory**: `apps/portal`
5. Click "Edit":
   - Build Command: `pnpm install && pnpm build`
   - Output Directory: `dist`
6. Add environment variables:
   ```
   VITE_API_URL=https://api-xxxx.vercel.app/api/v1
   ```
7. Click "Deploy"

---

## Step 4: Database Migrations

After API is deployed, run migrations:

### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy and run migrations
cd apps/api
vercel env pull .env.production.local
npx prisma migrate deploy
```

### Option B: Manually via Database Client

```sql
-- Connect to your database and run:
-- (This is done automatically by Prisma)
```

Or use:
```bash
cd packages/prisma
DATABASE_URL="your_production_url" npx prisma migrate deploy
```

---

## Step 5: Update API CORS

After deploying all SPAs, update API environment variables with correct URLs:

1. Go to API project on Vercel
2. Settings → Environment Variables
3. Update `CORS_ORIGIN` to include all frontend URLs:
   ```
   https://admin-xxx.vercel.app,https://arte-capital-xxx.vercel.app,https://portal-xxx.vercel.app
   ```
4. Redeploy API

---

## Step 6: Domain Setup (Optional)

### Connect Custom Domains

For each app in Vercel:
1. Settings → Domains
2. Add custom domain (requires DNS change)
3. Point your domain records to Vercel

Recommended:
- `api.yourdomain.com` → API
- `admin.yourdomain.com` → Admin
- `arte-capital.yourdomain.com` → Arte Capital
- `portal.yourdomain.com` → Portal
- `yourdomain.com` → Portal (root)

---

## Step 7: Verify Deployment

### Test API Health
```bash
curl https://api-xxxx.vercel.app/health
# Should return 200 OK
```

### Test Auth Endpoint
```bash
curl -X POST https://api-xxxx.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exposaantafe.com.mx","password":"Admin1234!"}'
```

### Access Applications
- Arte Capital: https://arte-capital-xxxx.vercel.app
- Admin: https://admin-xxxx.vercel.app
- Portal: https://portal-xxxx.vercel.app

---

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check database accepts connections from Vercel IPs
- Ensure database is running and accessible

### "CORS error"
- Update `CORS_ORIGIN` in API environment variables
- Redeploy API after changing CORS
- Check URL includes protocol (https://)

### "Module not found"
- Clear Vercel cache: Settings → Git → Redeploy
- Ensure monorepo structure is correct
- Check `Root Directory` is set to `apps/api` or `apps/xxx`

### "Port already in use"
- Vercel assigns ports automatically, no need to specify
- Remove `PORT` from environment if causing issues

### "Migrations not running"
- Run manually via database client
- Or use `vercel env pull` to get prod vars locally, then run prisma migrate

---

## Automated Deployments

Every git push to `master` will auto-deploy all apps on Vercel!

### Manual Redeploy

In Vercel dashboard:
1. Select project
2. Click "Deployments" tab
3. Click "Redeploy" on any deployment

---

## Monitoring & Logs

### View Logs
1. Vercel Dashboard → Project → Deployments
2. Click deployment → Logs tab
3. View build and runtime logs

### Set Up Alerts
1. Settings → Integrations
2. Connect Slack/Discord
3. Get notified on deployment failures

---

## Security Checklist

- [ ] Use strong `JWT_SECRET` (min 32 characters)
- [ ] Enable Database backups
- [ ] Restrict database access to Vercel IPs only
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS for all URLs
- [ ] Enable Vercel Password Protection if needed
- [ ] Rotate secrets quarterly
- [ ] Monitor deployment logs for errors

---

## Rollback

If something breaks:

1. Vercel → Deployments
2. Find last working deployment
3. Click "..." → Promote to Production

This instantly reverts to the previous version.

---

## Cost Estimates (Monthly)

| Service | Cost |
|---------|------|
| Vercel (API + 3 SPAs) | Free tier available, ~$20/mo for pro |
| Neon.tech (PostgreSQL) | Free tier 0.5GB, ~$30/mo for production |
| SendGrid (Email) | Free 100/day, ~$20/mo for volume |
| Stripe (Payments) | 2.9% + $0.30 per transaction |
| **Total** | **~$50-70/month** for production |

---

## Post-Deployment Tasks

1. ✅ Test all user flows (register, login, product upload, purchase)
2. ✅ Verify admin approval workflow
3. ✅ Test artist earnings dashboard
4. ✅ Check mobile responsiveness
5. ✅ Monitor error logs for 24-48 hours
6. ✅ Set up monitoring/alerting
7. ✅ Create backup strategy
8. ✅ Document access credentials

---

## Support

For Vercel issues:
- https://vercel.com/docs
- Vercel Support: https://vercel.com/support

For Database issues:
- Neon.tech: https://neon.tech/docs
- PostgreSQL: https://www.postgresql.org/docs/

---

## Summary

**Before Deploying:**
- [ ] Database ready (connection string)
- [ ] Environment variables documented
- [ ] Vercel account created
- [ ] GitHub repository pushed

**During Deployment:**
- [ ] Deploy API server first
- [ ] Deploy SPA applications
- [ ] Run database migrations
- [ ] Update CORS with actual URLs
- [ ] Test each application

**After Deployment:**
- [ ] Verify all endpoints working
- [ ] Test complete user flows
- [ ] Set up monitoring
- [ ] Document URLs for team

---

## Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repository:** https://github.com/cesarortegaau-design/IventIA
- **Neon.tech:** https://neon.tech
- **Prisma Docs:** https://www.prisma.io/docs

---

**Status:** Ready for deployment! All code is in GitHub and configured for Vercel.
