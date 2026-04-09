#!/bin/bash

# Gallery System Quick Start Script
# This script sets up and starts the gallery system for testing

set -e

echo "🎨 Gallery System - Quick Start"
echo "================================\n"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo -e "${BLUE}Step 1: Checking Node.js installation${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js $(node --version) found\n"

# Step 2: Install dependencies
echo -e "${BLUE}Step 2: Installing dependencies${NC}"
if [ ! -d "node_modules" ]; then
    echo "Running: pnpm install"
    pnpm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 3: Run database migrations
echo -e "${BLUE}Step 3: Running database migrations${NC}"
echo "Running: pnpm db:migrate"
pnpm db:migrate
echo ""

# Step 4: Seed test data
echo -e "${BLUE}Step 4: Seeding test data${NC}"
echo "Running: npx ts-node apps/api/src/scripts/seed-gallery-test-data.ts"
npx ts-node apps/api/src/scripts/seed-gallery-test-data.ts
echo ""

# Step 5: Start dev servers
echo -e "${BLUE}Step 5: Starting development servers${NC}"
echo "Running: pnpm dev"
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✨ Ready to test!${NC}"
echo -e "${GREEN}================================\n${NC}"
echo "Access points:"
echo "  📱 Admin Dashboard:  http://localhost:5173"
echo "  🎨 Gallery:          http://localhost:5174/gallery"
echo "  🔌 API Health:       http://localhost:3001/health"
echo ""
echo "Default Admin Credentials:"
echo "  Email:    admin@exposaantafe.com.mx"
echo "  Password: Admin1234!"
echo ""
echo "For detailed testing instructions, see: GALLERY_TESTING_GUIDE.md\n"

pnpm dev
