# Cloudinary to Cloudflare R2 Migration Guide

## Summary

Successfully migrated IventIA's file storage from Cloudinary to Cloudflare R2 (S3-compatible). All changes are backwards-compatible with existing Cloudinary URLs stored in the database.

## What Changed

### Backend (API)

1. **New storage module:** `apps/api/src/lib/storage.ts`
   - Replaces `cloudinary.ts` with AWS SDK S3 client for R2
   - Exports: `uploadToStorage()`, `deleteFromStorage()`, `getPresignedUploadUrl()`, `getPresignedDownloadUrl()`
   - Backwards-compatible aliases: `uploadToCloudinary`, `deleteFromCloudinary`

2. **Environment variables** (`apps/api/src/config/env.ts`):
   - `R2_ACCOUNT_ID` - Cloudflare R2 account ID
   - `R2_ACCESS_KEY_ID` - R2 API token key
   - `R2_SECRET_ACCESS_KEY` - R2 API token secret
   - `R2_BUCKET_NAME` - S3 bucket name (e.g., `iventia-files`)
   - `R2_PUBLIC_URL` - Public bucket URL (e.g., `https://pub-xxx.r2.dev`)

3. **Floor Plans Controller** (`apps/api/src/controllers/floorPlans.controller.ts`):
   - **Sign endpoint** (`GET /events/:eventId/floor-plans/sign?filename=xxx`):
     - Now returns presigned R2 PUT URL instead of Cloudinary signature
     - Returns: `{ uploadUrl, key, publicUrl }`
   - **Content proxy** (`GET /events/:eventId/floor-plans/:fpId/content`):
     - Detects R2 vs Cloudinary URLs automatically
     - Generates presigned download URLs for R2 files
     - Falls back to Cloudinary for existing files
   - **Multipart upload fallback** (`POST /events/:eventId/floor-plans/upload`):
     - Now streams directly to R2 instead of Cloudinary
     - Zero in-memory buffering for large files (200 MB limit)

4. **Updated imports in 10 controllers:**
   - All 10 controllers that import `uploadToCloudinary`/`deleteFromCloudinary` now import from `storage.ts`
   - No logic changes needed — the functions work identically

### Frontend (Admin)

1. **Floor Plans API client** (`apps/admin/src/api/floorPlans.ts`):
   - `getUploadSignature()` now passes `filename` parameter
   - Response format changed: receives `{ uploadUrl, publicUrl }` instead of Cloudinary fields

2. **DXF Upload Flow** (`apps/admin/src/pages/events/EventDetailPage.tsx`):
   - **Old flow:** Get Cloudinary signature → Build FormData → POST to Cloudinary API
   - **New flow:** Get presigned R2 URL → PUT compressed blob directly to R2
   - New helper function `putUpload()` replaces `xhrUpload()`
   - Gzip compression remains unchanged (DXF text files compress ~85%)

## Files Modified

### API
- `apps/api/package.json` — Added `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- `apps/api/src/config/env.ts` — Added R2 environment variables
- `apps/api/src/lib/storage.ts` — NEW MODULE, replaces cloudinary.ts
- `apps/api/src/controllers/floorPlans.controller.ts` — Updated all endpoints
- `apps/api/src/controllers/{resources,documents,*.controller.ts}` — Updated imports (9 files)

### Admin
- `apps/admin/src/api/floorPlans.ts` — Updated API methods
- `apps/admin/src/pages/events/EventDetailPage.tsx` — Updated DXF upload flow

## Setup Instructions

### 1. Create R2 Bucket

In Cloudflare Dashboard:
1. R2 → Create bucket
2. Name: `iventia-files` (or your choice)
3. Enable public access (Workers can modify)

### 2. Generate API Token

In Cloudflare Dashboard:
1. R2 Settings → Manage API tokens
2. Create API token with these permissions:
   - `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`
   - Applied to: `iventia-files` bucket (or your bucket name)
3. Copy: Account ID, Access Key ID, Secret Access Key

### 3. Get Public URL

In R2 → Bucket settings → Public access:
- Either use default subdomain: `https://{bucket}.{accountId}.r2.dev`
- Or configure custom domain: `https://files.yourdomain.com`

### 4. Set Environment Variables

**Local development** (`.env` in `apps/api`):
```
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=iventia-files
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

**Production** (Render / Vercel environment variables):
- Add the same 5 variables to your deployment platform
- API (Render): Environment → Add variables
- Admin/Portal (Vercel): Settings → Environment Variables → Add variables

### 5. Redeploy

```bash
# Local testing
pnpm install
pnpm build
pnpm dev

# Push to deploy
git add .
git commit -m "feat(storage): migrate from Cloudinary to R2"
git push origin master
```

## Backwards Compatibility

**Existing Cloudinary URLs in database continue to work:**
- `getFloorPlanContent` detects URL origin (Cloudinary vs R2)
- If Cloudinary: uses existing cloudinary API credentials
- If R2: uses presigned download URLs
- No data migration required

**Cloudinary environment variables still optional:**
- If defined, existing Cloudinary files can be read/deleted
- If not defined, Cloudinary operations are skipped (non-fatal)

## Testing Checklist

- [ ] Upload new DXF file in ivent-admin → appears in R2 bucket
- [ ] Open venue map → DXF renders correctly (proxy decompresses gzip)
- [ ] Delete DXF file → file deleted from R2
- [ ] Upload image (resource/logo) → goes to R2
- [ ] Test old Cloudinary URL → still loads (backwards compatibility)
- [ ] Verify presigned URLs expire correctly (5 min for PUT, 1 hour for GET)

## Known Limitations / Notes

1. **No automatic migration of existing files** — Old Cloudinary URLs remain in DB
   - Can implement batch migration script later if needed
   - For now: new files go to R2, old files stay on Cloudinary

2. **Presigned URL expiry:**
   - Upload URLs: 5 minutes (can be extended if needed)
   - Download URLs: 1 hour (can be extended if needed)

3. **File size limits:**
   - R2 multipart upload (fallback): 200 MB per file
   - Presigned PUT (browser): Limited by R2 bucket settings (typically 5 GB)

4. **No transformation on upload:**
   - Unlike Cloudinary, R2 doesn't auto-rotate images or transform files
   - DXF files stored exactly as uploaded (no compression on server)

## Rollback Plan

If issues occur:

1. **Revert imports:** Point all imports back to `lib/cloudinary.ts`
2. **Revert endpoint signatures:** Restore Cloudinary signing logic in `floorPlans.controller.ts`
3. **Revert admin flow:** Restore XHR FormData upload to Cloudinary API
4. **No database changes needed** — URLs are still valid

**Estimated rollback time:** 30 minutes (just code edits, no data migration)

## Questions?

- R2 pricing: Free 10 GB/month, $0.015/GB after
- S3 SDK docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/
- Cloudflare R2: https://developers.cloudflare.com/r2/
