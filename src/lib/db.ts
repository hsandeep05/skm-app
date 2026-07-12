import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL is set correctly for MongoDB
// (System env var from old SQLite setup may override .env)
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('mongodb')) {
  delete process.env.DATABASE_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

process.on('beforeExit', async () => {
  await db.$disconnect().catch(() => {})
})
