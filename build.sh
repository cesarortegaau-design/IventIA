#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install --ignore-scripts

echo "Building community app..."
cd apps/community
pnpm build

echo "Verifying output directory..."
if [ -d "dist" ]; then
  echo "✓ dist directory created successfully"
  ls -la dist/
else
  echo "✗ ERROR: dist directory not found!"
  exit 1
fi

echo "Build complete!"
