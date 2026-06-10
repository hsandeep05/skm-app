#!/bin/bash
set -e

echo "=== Building Sri Krishna Mobiles Bill Generator ==="

# Step 1: Generate Prisma client
echo "[1/6] Generating Prisma client..."
npx prisma generate

# Step 2: Push database schema (ensure DB file exists)
echo "[2/6] Ensuring database exists..."
mkdir -p db
DATABASE_URL="file:./db/custom.db" npx prisma db push --skip-generate 2>/dev/null || true

# Step 3: Build Next.js
echo "[3/6] Building Next.js app..."
DATABASE_URL="file:./db/custom.db" npx next build

# Step 4: Copy static assets and public folder
echo "[4/6] Copying static assets..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Step 5: Copy Prisma files (schema + engine + generated client)
echo "[5/6] Copying Prisma files..."
mkdir -p .next/standalone/prisma
cp prisma/schema.prisma .next/standalone/prisma/

# Copy the Prisma engine from node_modules
if [ -d "node_modules/.prisma" ]; then
  mkdir -p .next/standalone/node_modules/.prisma
  cp -r node_modules/.prisma/* .next/standalone/node_modules/.prisma/
fi

if [ -d "node_modules/@prisma/client" ]; then
  mkdir -p .next/standalone/node_modules/@prisma/client
  cp -r node_modules/@prisma/client/* .next/standalone/node_modules/@prisma/client/ 2>/dev/null || true
fi

# Find and copy the Prisma query engine binary
ENGINE_PATH=$(find node_modules/.prisma/client -name "libquery_engine-*" -type f 2>/dev/null | head -1)
if [ -n "$ENGINE_PATH" ]; then
  ENGINE_DIR=$(dirname "$ENGINE_PATH")
  mkdir -p ".next/standalone/$ENGINE_DIR"
  cp "$ENGINE_PATH" ".next/standalone/$ENGINE_PATH"
  echo "  Copied engine: $ENGINE_PATH"
fi

# Also check for schema.prisma in .prisma/client (needed by engine)
if [ -f "node_modules/.prisma/client/schema.prisma" ]; then
  cp node_modules/.prisma/client/schema.prisma .next/standalone/node_modules/.prisma/client/ 2>/dev/null || true
fi

# Step 6: Copy database and set environment
echo "[6/6] Setting up database and environment..."
mkdir -p .next/standalone/db
if [ -f "db/custom.db" ]; then
  cp db/custom.db .next/standalone/db/custom.db
  echo "  Copied existing database"
fi

# Write .env with absolute path for production
# The standalone server runs from .next/standalone/ directory
cat > .next/standalone/.env << 'ENVEOF'
DATABASE_URL=file:./db/custom.db
NODE_ENV=production
ENVEOF

echo ""
echo "=== Build Complete ==="
echo "Standalone output: .next/standalone/"
echo "Start with: NODE_ENV=production node .next/standalone/server.js"
