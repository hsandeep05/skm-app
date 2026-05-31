// Next.js Node.js instrumentation - runs on server startup only (not Edge)
// This helps verify the function starts correctly on deployment platforms

export async function register() {
  console.log('[Startup] App starting...')
  console.log('[Startup] NODE_ENV:', process.env.NODE_ENV)
  console.log('[Startup] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set (using default)')
  console.log('[Startup] CWD:', process.cwd())

  // Pre-warm the database connection
  try {
    const { db } = await import('@/lib/db')
    await db.$queryRaw`SELECT 1`
    console.log('[Startup] Database connected successfully')
  } catch (error) {
    console.error('[Startup] Database connection failed:', error)
  }

  console.log('[Startup] App ready!')
}
