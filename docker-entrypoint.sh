#!/bin/sh

SCHEMA=/app/packages/prisma/schema.prisma
PRISMA=/app/node_modules/.bin/prisma

echo "[startup] === IventIA API startup ==="
echo "[startup] Node: $(node --version)"

# ── Step 1: wait for the database to accept connections ───────────────────────
# On Render free-tier or after a cold start, the DB may take several seconds to
# wake up. Attempting a migration immediately causes E57P01 (connection killed),
# which leaves migrations in "failed" state and the API never starts.
cat > /tmp/ping.sql <<'SQL'
SELECT 1;
SQL

echo "[startup] Waiting for database to be ready..."
attempt=0
max=20
while [ $attempt -lt $max ]; do
  attempt=$((attempt + 1))
  if $PRISMA db execute --file /tmp/ping.sql --schema "$SCHEMA" > /dev/null 2>&1; then
    echo "[startup] Database ready (attempt $attempt)."
    break
  fi
  echo "[startup] DB not ready yet (attempt $attempt/$max) — retrying in 3s..."
  sleep 3
done

if [ $attempt -eq $max ]; then
  # Last attempt failed — try anyway; let migrate deploy surface the real error
  echo "[startup] WARNING: DB may not be fully ready."
fi

# ── Step 2: reset any stuck migrations left by a previous killed connection ───
cat > /tmp/fix-stuck.sql <<'SQL'
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL;
SQL

$PRISMA db execute --file /tmp/fix-stuck.sql --schema "$SCHEMA" 2>&1 || \
  echo "[startup] WARNING: could not reset stuck migrations — continuing anyway"

# ── Step 3: deploy pending migrations ────────────────────────────────────────
echo "[startup] Running prisma migrate deploy..."
if ! $PRISMA migrate deploy --schema "$SCHEMA" 2>&1; then
  echo "[startup] ERROR: migrations failed — API will NOT start"
  exit 1
fi

echo "[startup] Migrations OK. Starting API..."
exec node /app/apps/api/dist/index.js
