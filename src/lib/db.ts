import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with error handling and retry logic
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./db/custom.db',
      },
    },
  })
}

// Initialize Prisma client lazily with error recovery
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
    const actualDb = getDb()
    const value = Reflect.get(actualDb, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(actualDb)
    }
    return value
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
