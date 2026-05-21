#!/bin/sh
set -e

SCHEMA=/app/packages/prisma/schema.prisma
PRISMA=/app/node_modules/.bin/prisma

echo "[startup] Running database migrations..."

# First attempt: run deploy directly.
# This succeeds in the normal case (no stuck migrations).
if $PRISMA migrate deploy --schema "$SCHEMA" 2>&1; then
  echo "[startup] Migrations OK."
else
  echo "[startup] Migration failed — attempting recovery..."

  # Resolve migrations known to be stuck or deleted.
  # --rolled-back: migration was deleted from filesystem (never completed).
  # --applied:     migration SQL is safe IF-EXISTS; mark as done so deploy skips it.
  $PRISMA migrate resolve --rolled-back \
    20260521200000_add_executive_coordinator_user_fk \
    --schema "$SCHEMA" 2>/dev/null || true

  $PRISMA migrate resolve --applied \
    20260521300000_add_executive_coordinator_user_fk \
    --schema "$SCHEMA" 2>/dev/null || true

  echo "[startup] Retrying migrations..."
  $PRISMA migrate deploy --schema "$SCHEMA" 2>&1
fi

echo "[startup] Starting API..."
exec node /app/apps/api/dist/index.js
