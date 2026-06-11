'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { performAutoBackup } from '@/lib/data-persistence'

interface LoginProps {
  onLogin: (user: { id: string; username: string; role: string; counterName: string | null }) => void
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const { toast } = useToast()

  // Auto-seed the default user if it doesn't exist
  useEffect(() => {
    const autoSeed = async () => {
      setSeeding(true)
      setSetupError(null)
      try {
        // First try to seed - will only create if no users exist
        const seedRes = await fetch('/api/auth/seed', { method: 'POST' })
        const seedData = await seedRes.json()

        // If tables don't exist yet, run setup first
        if (seedData.needsSetup) {
          console.log('[Login] Tables not found, running setup...')
          const setupRes = await fetch('/api/setup', { method: 'POST' })
          const setupData = await setupRes.json()
          if (setupData.success) {
            console.log('[Login] Setup complete, seeding user...')
            await fetch('/api/auth/seed', { method: 'POST' })
          } else {
            console.error('[Login] Setup failed:', setupData.error)
            setSetupError(setupData.error || 'Database setup failed. Please try again.')
          }
        }
      } catch (err) {
        console.error('[Login] Seed/setup error:', err)
        setSetupError('Could not connect to server. Please check your connection.')
      } finally {
        setSeeding(false)
      }

      // Check if already authenticated
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (data.authenticated) {
          onLogin(data.user)
        }
      } catch (err) {
        // Ignore
      }
    }
    autoSeed()
  }, [onLogin])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSetupError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (res.ok) {
        onLogin(data.user)
        toast({ title: 'Welcome back!', description: `Logged in as ${data.user.username}` })
        // Trigger auto-backup after login
        performAutoBackup().catch(() => {})
      } else if (res.status === 500) {
        // Server error - might be a database issue
        const errorMsg = data.detail || data.error || 'Server error'
        toast({
          title: 'Server Error',
          description: `${errorMsg}. Please try refreshing the page.`,
          variant: 'destructive',
        })
        setSetupError(`Server error: ${errorMsg}`)
      } else {
        // Auth error (401, 400)
        toast({ title: 'Login Failed', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to connect to server. Please check your connection.', variant: 'destructive' })
      setSetupError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleRetrySetup = async () => {
    setSeeding(true)
    setSetupError(null)
    try {
      const setupRes = await fetch('/api/setup', { method: 'POST' })
      const setupData = await setupRes.json()
      if (setupData.success) {
        await fetch('/api/auth/seed', { method: 'POST' })
        setSetupError(null)
        toast({ title: 'Setup Complete', description: 'Database initialized successfully. You can now log in.' })
      } else {
        setSetupError(setupData.error || 'Setup failed')
      }
    } catch (err) {
      setSetupError('Could not connect to server')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background login-bg-pattern p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white shadow-xl shadow-[#7C3AED]/20 mb-4 ring-2 ring-[#7C3AED]/20 overflow-hidden"
          >
            <img src="/logo.png" alt="Sri Krishna Mobiles" className="h-16 w-16 object-contain" />
          </motion.div>
          <motion.h1
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground"
          >
            Sri Krishna Mobiles
          </motion.h1>
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-muted-foreground mt-1"
          >
            Bill Generator — Secure Login
          </motion.p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl shadow-black/10 ring-1 ring-white/[0.03]"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center ring-1 ring-[#7C3AED]/10">
              <LogIn className="h-4 w-4 text-[#7C3AED]" />
            </div>
            <div>
              <h2 className="text-foreground font-semibold text-sm">Sign In</h2>
              <p className="text-muted-foreground text-xs">Enter your credentials to continue</p>
            </div>
          </div>

          {/* Setup Error Banner */}
          {setupError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-destructive font-medium">{setupError}</p>
                <button
                  onClick={handleRetrySetup}
                  className="mt-1.5 text-xs text-[#7C3AED] hover:text-[#6D28D9] font-medium flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Setup
                </button>
              </div>
            </div>
          )}

          {seeding ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">Initializing...</span>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs font-medium">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                  className="bg-background/80 border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 h-10 transition-all duration-200 rounded-lg"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs font-medium">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-background/80 border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 h-10 pr-10 transition-all duration-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 h-10 shadow-lg shadow-[#7C3AED]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#7C3AED]/30"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <img src="/logo.png" alt="SKM" className="h-4 w-4 object-contain opacity-60" />
          <p className="text-xs text-muted-foreground">
            Sri Krishna Mobiles, Narayanpet — Secure Billing System
          </p>
        </div>
      </motion.div>
    </div>
  )
}
