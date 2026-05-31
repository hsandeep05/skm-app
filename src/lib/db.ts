import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve DATABASE_URL with fallback
// In production on FC, the working directory may differ from development
function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL
  if (envUrl) return envUrl

  // Default: SQLite file relative to the project root
  return 'file:./db/custom.db'
}

// Create PrismaClient - this runs once and is cached
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })
}

// Use global singleton in development to prevent hot-reload creating multiple clients
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect().catch(() => {})
})
