#!/bin/bash
set -e

echo "🚀 Configurando entorno IventIA..."

# Instalar pnpm globalmente
npm install -g pnpm@9

# Instalar dependencias del monorepo
cd /workspaces/IventIA
pnpm install

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando PostgreSQL..."
until pg_isready -h localhost -U iventia 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL listo"

# Esperar a que Redis esté listo
echo "⏳ Esperando Redis..."
until redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 1
done
echo "✅ Redis listo"

# Crear archivo .env si no existe
if [ ! -f /workspaces/IventIA/apps/api/.env ]; then
  cp /workspaces/IventIA/apps/api/.env.example /workspaces/IventIA/apps/api/.env 2>/dev/null || cat > /workspaces/IventIA/apps/api/.env << 'EOF'
DATABASE_URL=postgresql://iventia:iventia@localhost:5432/iventia_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
EOF
  echo "✅ Archivo .env creado"
fi

# Correr migraciones
echo "🗄️  Corriendo migraciones Prisma..."
pnpm db:migrate

echo ""
echo "✅ Entorno listo. Para iniciar el proyecto:"
echo "   pnpm dev"
echo ""
