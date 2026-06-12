import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || ''

  // If using Turso/libSQL cloud database (for Vercel deployment)
  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('http://') || dbUrl.startsWith('https://')) {
    console.log('[DB] Using Turso/libSQL cloud database')
    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    })
  }

  // Local SQLite file (for development)
  if (!dbUrl.startsWith('file:')) {
    const dbPath = resolve(process.cwd(), 'db/custom.db')
    process.env.DATABASE_URL = `file:${dbPath}`
    console.log(`[DB] DATABASE_URL not set, using fallback: ${process.env.DATABASE_URL}`)
  }

  // Ensure the db directory exists for local SQLite
  try {
    const localUrl = process.env.DATABASE_URL!.replace('file:', '')
    const dbDir = resolve(process.cwd(), localUrl.replace('../', '').replace('./', ''))
    const dir = dbDir.substring(0, dbDir.lastIndexOf('/'))
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  } catch {
    // Ignore directory creation errors
  }

  console.log('[DB] Using local SQLite database')
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
