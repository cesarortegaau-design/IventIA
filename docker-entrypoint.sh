#!/bin/sh

SCHEMA=/app/packages/prisma/schema.prisma
PRISMA=/app/node_modules/.bin/prisma

echo "[startup] === IventIA API startup ==="
echo "[startup] Node: $(node --version)"

# ── Step 1: reset stuck migrations ───────────────────────────────────────────
# Write SQL to a temp file so we can use prisma db execute --file (no stdin).
# This marks any migration that started but never finished as rolled-back so
# migrate deploy can re-apply (or skip) it cleanly.
cat > /tmp/fix-stuck-migrations.sql <<'SQL'
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL;
SQL

echo "[startup] Resetting any stuck migrations..."
$PRISMA db execute --file /tmp/fix-stuck-migrations.sql --schema "$SCHEMA" 2>&1 || \
  echo "[startup] WARNING: could not reset stuck migrations (will try deploy anyway)"

# ── Step 2: deploy migrations ────────────────────────────────────────────────
echo "[startup] Running prisma migrate deploy..."
if ! $PRISMA migrate deploy --schema "$SCHEMA" 2>&1; then
  echo "[startup] ERROR: prisma migrate deploy failed — API will NOT start"
  exit 1
fi

echo "[startup] Migrations OK. Starting API..."
exec node /app/apps/api/dist/index.js
