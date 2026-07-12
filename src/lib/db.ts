import { PrismaClient } from '@prisma/client'

// DATABASE_URL handling:
// - On Vercel: Set via environment variables (correct MongoDB URL)
// - In sandbox: System env may have old SQLite URL, override needed
const MONGODB_FALLBACK = 'mongodb+srv://skmadmin:Skm12345@cluster0.iklhwdg.mongodb.net/skm?retryWrites=true&w=majority&appName=Cluster0'

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL
  if (envUrl && envUrl.startsWith('mongodb')) {
    return envUrl
  }
  // Fallback for sandbox where system env has wrong DATABASE_URL
  return MONGODB_FALLBACK
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
  datasourceUrl: getDatabaseUrl(),
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

process.on('beforeExit', async () => {
  await db.$disconnect().catch(() => {})
})