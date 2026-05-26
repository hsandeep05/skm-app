'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Eye, EyeOff, LogIn, UserPlus, Shield } from 'lucide-react'
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
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupUsername, setSetupUsername] = useState('')
  const [setupPassword, setSetupPassword] = useState('')
  const [setupShowPassword, setSetupShowPassword] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const { toast } = useToast()

  // Check if any users exist (if not, show setup screen)
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          onLogin(data.user)
        }
      })
      .catch(() => {})
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

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSetupLoading(true)

    try {
      const res = await fetch('/api/auth/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: setupUsername, password: setupPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        // Now auto-login with the new credentials
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: setupUsername, password: setupPassword }),
        })

        const loginData = await loginRes.json()
        if (loginRes.ok) {
          onLogin(loginData.user)
          toast({ title: 'Account Created!', description: 'Welcome to Sri Krishna Mobiles Bill Generator' })
        }
      } else {
        toast({ title: 'Setup Failed', description: data.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to setup account', variant: 'destructive' })
    } finally {
      setSetupLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-xl shadow-[#7C3AED]/30 mb-4"
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

        {/* Setup Form (First time) */}
        {needsSetup ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <div>
                <h2 className="text-foreground font-semibold text-sm">Initial Setup</h2>
                <p className="text-muted-foreground text-xs">Create your admin account</p>
              </div>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs font-medium">Admin Username</Label>
                <Input
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  placeholder="e.g., admin"
                  required
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] h-10"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs font-medium">Admin Password</Label>
                <div className="relative">
                  <Input
                    type={setupShowPassword ? 'text' : 'password'}
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setSetupShowPassword(!setupShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {setupShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 h-10 shadow-lg shadow-[#7C3AED]/25"
                disabled={setupLoading}
              >
                {setupLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {setupLoading ? 'Creating...' : 'Create Admin Account'}
              </Button>
            </form>
          </motion.div>
        ) : (
          /* Login Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center">
                <LogIn className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <div>
                <h2 className="text-foreground font-semibold text-sm">Sign In</h2>
                <p className="text-muted-foreground text-xs">Enter your credentials to continue</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs font-medium">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] h-10"
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#7C3AED] h-10 pr-10"
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
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-2 h-10 shadow-lg shadow-[#7C3AED]/25"
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

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-center text-xs text-muted-foreground">
                First time?{' '}
                <button
                  onClick={() => setNeedsSetup(true)}
                  className="text-[#7C3AED] hover:text-[#A78BFA] font-medium transition-colors"
                >
                  Create admin account
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Sri Krishna Mobiles, Narayanpet — Secure Billing System
        </p>
      </motion.div>
    </div>
  )
}
