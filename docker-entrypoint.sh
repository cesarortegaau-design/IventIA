#!/bin/sh

SCHEMA=/app/packages/prisma/schema.prisma
PRISMA=/app/node_modules/.bin/prisma

echo "[startup] === IventIA API startup ==="
echo "[startup] Node: $(node --version)"

# ── Wait for the DB to accept a connection ────────────────────────────────────
cat > /tmp/ping.sql <<'SQL'
SELECT 1;
SQL

echo "[startup] Waiting for database..."
attempt=0
max=20
while [ $attempt -lt $max ]; do
  attempt=$((attempt + 1))
  if $PRISMA db execute --file /tmp/ping.sql --schema "$SCHEMA" > /dev/null 2>&1; then
    echo "[startup] Database ready (attempt $attempt)."
    break
  fi
  echo "[startup] Not ready yet ($attempt/$max) — retrying in 3s..."
  sleep 3
done

# ── Run migrations (non-fatal) ────────────────────────────────────────────────
# All production schema changes are already applied. The only pending migrations
# are safe cleanup-only steps (IF EXISTS). If the DB kills this connection mid-run
# it leaves a "failed" migration in _prisma_migrations — we reset it first.
cat > /tmp/fix-stuck.sql <<'SQL'
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL;
SQL

$PRISMA db execute --file /tmp/fix-stuck.sql --schema "$SCHEMA" > /dev/null 2>&1 || true

if $PRISMA migrate deploy --schema "$SCHEMA" 2>&1; then
  echo "[startup] Migrations OK."
else
  echo "[startup] WARNING: migrations failed — starting API anyway (schema already up to date)"
fi

echo "[startup] Starting API..."
exec node /app/apps/api/dist/index.js
