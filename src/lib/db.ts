import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || ''
  const tursoAuthToken = process.env.DATABASE_AUTH_TOKEN || ''

  // If Turso URL is set, use the LibSQL adapter (for Vercel/cloud deployment)
  if (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('http')) {
    console.log('[DB] Using Turso/libSQL cloud database')

    const { createClient } = require('@libsql/client')
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

  // Local SQLite (for development)
  const dbPath = resolve(process.cwd(), 'db/custom.db')
  process.env.DATABASE_URL = `file:${dbPath}`

  try {
    const dir = resolve(process.cwd(), 'db')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  } catch {}

  console.log('[DB] Using local SQLite database')
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

process.on('beforeExit', async () => {
  await db.$disconnect().catch(() => {})
})
