import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Ensure DATABASE_URL is set correctly for SQLite
  // Prisma resolves relative paths from the schema.prisma directory (prisma/)
  // so we need to make sure the URL points to the right location
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
    // Fallback: compute the absolute path to the database file
    const dbPath = resolve(process.cwd(), 'db/custom.db')
    process.env.DATABASE_URL = `file:${dbPath}`
    console.log(`[DB] DATABASE_URL not set, using fallback: ${process.env.DATABASE_URL}`)
  }

  // Ensure the db directory exists
  try {
    const dbUrl = process.env.DATABASE_URL.replace('file:', '')
    const dbDir = resolve(process.cwd(), dbUrl.replace('../', '').replace('./', ''))
    const dir = dbDir.substring(0, dbDir.lastIndexOf('/'))
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  } catch {
    // Ignore directory creation errors
  }

  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

// Use global singleton to prevent hot-reload creating multiple clients
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect().catch(() => {})
})
