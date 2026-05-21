#!/bin/sh
set -e

SCHEMA=/app/packages/prisma/schema.prisma
PRISMA=/app/node_modules/.bin/prisma

echo "[startup] Checking for stuck migrations..."

# Mark any migration that was started but never finished/rolled-back as rolled-back.
# This lets migrate deploy re-apply them (files present) or skip them (files deleted).
# All our migrations use IF EXISTS / IF NOT EXISTS, so re-applying is always safe.
$PRISMA db execute --stdin --schema "$SCHEMA" 2>/dev/null <<'SQL' || true
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL;
SQL

echo "[startup] Deploying migrations..."
$PRISMA migrate deploy --schema "$SCHEMA" 2>&1

echo "[startup] Starting API..."
exec node /app/apps/api/dist/index.js
