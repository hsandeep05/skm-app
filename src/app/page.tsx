'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Receipt, BarChart3, Settings, Clock, Sun, Moon, LogOut } from 'lucide-react'
import { Dashboard } from '@/components/dashboard'
import { Billing } from '@/components/billing'
import { Analytics } from '@/components/analytics'
import { SettingsPage } from '@/components/settings'
import { PendingBills } from '@/components/pending-bills'
import { Login } from '@/components/login'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

type TabId = 'dashboard' | 'pending' | 'billing' | 'analytics' | 'settings'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ReactNode
}

interface AuthUser {
  id: string
  username: string
  role: string
  counterName: string | null
}

const tabs: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
  { id: 'pending', label: 'Pending Bills', icon: <Clock className="h-4 w-4" /> },
  { id: 'billing', label: 'Create Bill', icon: <Receipt className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export default function SriKrishnaApp() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [pendingCount, setPendingCount] = useState(0)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const { theme, setTheme } = useTheme()

  // Check session on mount
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user)
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false))
  }, [])

  // Listen for pending count updates from Dashboard
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setPendingCount(e.detail || 0)
    }
    window.addEventListener('pending-count', handler as EventListener)
    return () => window.removeEventListener('pending-count', handler as EventListener)
  }, [])

  // Also fetch pending count on mount
  useEffect(() => {
    if (user) {
      fetch('/api/invoices?status=pending')
        .then(res => res.ok ? res.json() : { invoices: [] })
        .then(data => setPendingCount(data.invoices?.length || 0))
        .catch(() => {})
    }
  }, [user])

  // Refresh pending count when switching tabs
  useEffect(() => {
    if (user) {
      fetch('/api/invoices?status=pending')
        .then(res => res.ok ? res.json() : { invoices: [] })
        .then(data => setPendingCount(data.invoices?.length || 0))
        .catch(() => {})
    }
  }, [activeTab, user])

  const handleLogin = useCallback((loggedInUser: AuthUser) => {
    setUser(loggedInUser)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout error:', e)
    }
    setUser(null)
    setActiveTab('dashboard')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'pending':
        return <PendingBills />
      case 'billing':
        return <Billing />
      case 'analytics':
        return <Analytics />
      case 'settings':
        return <SettingsPage currentUser={user} onLogout={handleLogout} />
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-10 w-10 border-4 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-foreground font-bold text-lg leading-tight">
                Sri Krishna Mobiles
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Bill Generator • {user.counterName || user.username}
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.icon}
                <span className="hidden lg:inline">{tab.label}</span>
                {tab.id === 'pending' && pendingCount > 0 && (
                  <Badge className="bg-[#F59E0B] text-black border-0 text-[10px] h-5 min-w-[20px] px-1.5 font-bold">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-20 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Footer */}
      <footer className="hidden md:block border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Generated by SRI Krishna Mobiles Bill Generator
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[56px] ${
                activeTab === tab.id
                  ? 'text-[#7C3AED]'
                  : 'text-muted-foreground'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id ? 'bg-[#7C3AED]/20' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[9px] font-medium leading-tight">{tab.label}</span>
              {tab.id === 'pending' && pendingCount > 0 && (
                <Badge className="absolute -top-0.5 right-0 bg-[#F59E0B] text-black border-0 text-[9px] h-4 min-w-[16px] px-1 font-bold">
                  {pendingCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
