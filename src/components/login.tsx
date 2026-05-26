'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Eye, EyeOff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface LoginProps {
  onLogin: (user: { id: string; username: string; role: string; counterName: string | null }) => void
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const { toast } = useToast()

  // Auto-seed the default user if it doesn't exist
  useEffect(() => {
    const autoSeed = async () => {
      setSeeding(true)
      try {
        // Try to seed - will only create if no users exist
        await fetch('/api/auth/seed', { method: 'POST' })
      } catch (err) {
        // Ignore errors - seed may already exist
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
      } else {
        toast({ title: 'Login Failed', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' })
    } finally {
      setLoading(false)
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
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-xl shadow-[#7C3AED]/30 mb-4 ring-1 ring-[#7C3AED]/20"
          >
            <Receipt className="h-8 w-8 text-white" />
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
        <p className="text-center text-xs text-muted-foreground mt-6">
          Sri Krishna Mobiles, Narayanpet — Secure Billing System
        </p>
      </motion.div>
    </div>
  )
}
