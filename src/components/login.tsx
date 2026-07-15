'use client'

import { useState } from 'react'
import { Eye, EyeOff, LogIn, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface LoginProps {
  onLogin: (user: { id: string; username: string; role: string; counterName: string | null }) => void
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [loading, setLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSetupError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        onLogin(data.user)
        toast({ title: 'Welcome back!', description: `Logged in as ${data.user.username}` })
      } else if (res.status === 500) {
        const errorMsg = data.detail || data.error || 'Server error'
        toast({
          title: 'Server Error',
          description: `${errorMsg}. Please try refreshing the page.`,
          variant: 'destructive',
        })
        setSetupError(`Server error: ${errorMsg}`)
      } else {
        toast({ title: 'Login Failed', description: data.error || 'Invalid credentials', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to connect to server. Please check your connection.', variant: 'destructive' })
      setSetupError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleRetrySetup = async () => {
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
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white shadow-xl shadow-[#7C3AED]/20 mb-4 ring-2 ring-[#7C3AED]/20 overflow-hidden">
            <img src="/logo.png" alt="Sri Krishna Mobiles" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Sri Krishna Mobiles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bill Generator — Secure Login
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl shadow-black/10 ring-1 ring-white/[0.03]">
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoFocus
                className="bg-background/80 border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 h-10 transition-all duration-200 rounded-lg"
              />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
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

          {/* Default credentials hint - hidden by default, click to reveal */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/30">
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-[10px] text-muted-foreground text-center font-medium flex items-center justify-center gap-1.5 hover:text-muted-foreground/80 transition-colors"
            >
              {showCredentials ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Default: <span className="text-foreground/80 select-all">SriKrishna</span> / <span className="text-foreground/80 select-all">Krishna@123</span>
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  Tap to show default credentials
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <img src="/logo.png" alt="SKM" className="h-4 w-4 object-contain opacity-60" />
          <p className="text-xs text-muted-foreground">
            Sri Krishna Mobiles, Narayanpet — Secure Billing System
          </p>
        </div>
      </div>
    </div>
  )
}
