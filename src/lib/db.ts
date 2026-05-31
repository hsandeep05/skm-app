import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve the correct DATABASE_URL for the current environment
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL
  if (envUrl) {
    // If it's a relative file path, resolve it properly
    if (envUrl.startsWith('file:') && !envUrl.includes('/tmp/')) {
      const dbPath = envUrl.replace('file:', '').replace('./', '')
      // In production standalone, the working directory is the standalone dir
      // The database should be at ./db/custom.db relative to the server
      return `file:${dbPath}`
    }
    return envUrl
  }
  return 'file:./db/custom.db'
}

// Create Prisma client with error handling
function createPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl()
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

// Lazy initialization with error recovery
let _db: PrismaClient | null = null
let _initError: Error | null = null
let _lastInitAttempt = 0
const RETRY_INTERVAL = 5000 // 5 seconds between retry attempts

function getDb(): PrismaClient {
  if (_db) return _db

  // If we had an error recently, check if we should retry
  const now = Date.now()
  if (_initError && now - _lastInitAttempt < RETRY_INTERVAL) {
    throw _initError
  }

  try {
    _db = globalForPrisma.prisma ?? createPrismaClient()
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _db
    }
    _initError = null
    return _db
  } catch (error) {
    _initError = error as Error
    _lastInitAttempt = now
    throw error
  }
}

// Export a proxy that lazily initializes the client
// This prevents crashes during module import if DB isn't ready yet
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    try {
      const actualDb = getDb()
      const value = Reflect.get(actualDb, prop, receiver)
      if (typeof value === 'function') {
        return value.bind(actualDb)
      }
      return value
    } catch (error) {
      // If DB init fails, return a no-op function for method calls
      // This prevents the entire app from crashing
      if (typeof prop === 'string') {
        console.error(`DB access failed for "${prop}":`, error)
        // Return a function that throws when called, but doesn't crash at import time
        return () => {
          throw new Error(`Database is not available. Please try again later.`)
        }
      }
      return undefined
    }
  },
})

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    if (_db) {
      await _db.$disconnect()
    }
  })
}
