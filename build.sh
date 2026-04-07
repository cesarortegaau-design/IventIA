#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install --ignore-scripts

echo "Building community app..."
pnpm --filter=@iventia/community build

echo "Creating public directory..."
rm -rf public
mkdir -p public
cp -r apps/community/dist/* public/

echo "Verifying output..."
echo "Contents of public/"
ls -la public/

echo "Build complete!"
