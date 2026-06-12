import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || ''
  const tursoAuthToken = process.env.DATABASE_AUTH_TOKEN || ''
  const dbUrl = process.env.DATABASE_URL || ''

  // If Turso URL is set, use the LibSQL adapter (for Vercel/cloud deployment)
  if (tursoUrl && (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('http://') || tursoUrl.startsWith('https://'))) {
    console.log('[DB] Using Turso/libSQL cloud database:', tursoUrl.substring(0, 30) + '...')

    // CRITICAL: Prisma validates DATABASE_URL even when using an adapter.
    // Override with a valid SQLite URL before creating PrismaClient.
    process.env.DATABASE_URL = 'file:./dev.db'

    if (!tursoAuthToken) {
      console.error('[DB] WARNING: DATABASE_AUTH_TOKEN is not set!')
    }

    // Dynamic imports to avoid build-time evaluation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require('@prisma/adapter-libsql')

    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    })
  }

  // Also check if DATABASE_URL itself is a libsql URL
  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('http://') || dbUrl.startsWith('https://')) {
    console.log('[DB] Using Turso/libSQL via DATABASE_URL:', dbUrl.substring(0, 30) + '...')

    process.env.DATABASE_URL = 'file:./dev.db'

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require('@prisma/adapter-libsql')

    const libsql = createClient({
      url: dbUrl,
      authToken: tursoAuthToken,
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

// Lazy initialization - only create PrismaClient when first accessed
// This prevents build-time connection errors on Vercel
let _db: PrismaClient | undefined = undefined

export function getDb(): PrismaClient {
  if (!_db) {
    if (globalForPrisma.prisma) {
      _db = globalForPrisma.prisma
    } else {
      _db = createPrismaClient()
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _db
      }
    }
  }
  return _db
}

// For backward compatibility - export db as a getter
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})

// Graceful shutdown
process.on('beforeExit', async () => {
  if (_db) {
    await _db.$disconnect().catch(() => {})
  }
})
