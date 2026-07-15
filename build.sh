#!/bin/bash
set -e

echo "=== Building Sri Krishna Mobiles Bill Generator ==="

# Step 1: Generate Prisma client
echo "[1/3] Generating Prisma client..."
npx prisma generate

# Step 2: Build Next.js
echo "[2/3] Building Next.js app..."
npx next build

# Step 3: Copy static assets and public folder
echo "[3/3] Copying static assets..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

echo ""
echo "=== Build Complete ==="
