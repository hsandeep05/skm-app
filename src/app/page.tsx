'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Receipt, BarChart3, Settings, Clock, Sun, Moon, LogOut, Shield, Database } from 'lucide-react'
import { Dashboard } from '@/components/dashboard'
import { Billing } from '@/components/billing'
import { Analytics } from '@/components/analytics'
import { SettingsPage } from '@/components/settings'
import { PendingBills } from '@/components/pending-bills'
import { Login } from '@/components/login'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { performAutoBackup, smartSync, loadBackupFromLocal } from '@/lib/data-persistence'

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
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function SriKrishnaApp() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [pendingCount, setPendingCount] = useState(0)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [shopLogo, setShopLogo] = useState<string | null>(null)
  const [shopSettings, setShopSettings] = useState<{ shopName: string; shopAddress: string; shopTagline: string }>({
    shopName: 'SRI Krishna Mobiles',
    shopAddress: 'Near Chowk bazar, MainRoad, Narayanpet',
    shopTagline: 'Your Trusted Mobile Service Center',
  })
  const { theme, setTheme } = useTheme()

  // Data persistence state
  const [restoringData, setRestoringData] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null)
  const backupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-backup: runs periodically and after data changes
  const triggerAutoBackup = useCallback(() => {
    if (backupTimerRef.current) clearTimeout(backupTimerRef.current)
    backupTimerRef.current = setTimeout(() => {
      performAutoBackup().catch(() => {})
    }, 2000) // Debounce: wait 2s after last change
  }, [])

  // Auto-backup every 5 minutes
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      performAutoBackup().catch(() => {})
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  // Smart sync on app startup: detect data loss and auto-restore
  useEffect(() => {
    if (!user) return

    const checkAndRestore = async () => {
      try {
        const localBackup = loadBackupFromLocal()
        if (!localBackup) {
          // No local backup, just do a fresh backup
          await performAutoBackup()
          return
        }

        // Check server data vs local backup
        const result = await smartSync()
        if (result.restored) {
          setRestoringData(true)
          setRestoreStatus(`Data recovered! ${result.invoiceCount} invoices and ${result.userCount} users restored.`)
          setTimeout(() => {
            setRestoringData(false)
            setRestoreStatus(null)
          }, 5000)
        }
      } catch (err) {
        console.error('Auto-restore check failed:', err)
        // Still do a backup even if sync check fails
        await performAutoBackup()
      }
    }

    checkAndRestore()
  }, [user])

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

  // Load shop settings on mount
  useEffect(() => {
    fetch('/api/shop-settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setShopSettings(prev => ({
            ...prev,
            shopName: data.shopName || prev.shopName,
            shopAddress: data.shopAddress || prev.shopAddress,
            shopTagline: data.shopTagline || prev.shopTagline,
          }))
        }
      })
      .catch(() => {})
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
        return <Billing shopLogo={shopLogo} shopSettings={shopSettings} />
      case 'analytics':
        return <Analytics />
      case 'settings':
        return <SettingsPage currentUser={user} onLogout={handleLogout} onLogoChange={setShopLogo} onShopSettingsChange={setShopSettings} />
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
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl shadow-sm gradient-border-bottom">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 cursor-default hover:scale-105 hover:shadow-xl hover:shadow-[#7C3AED]/30 transition-all duration-300">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-foreground font-bold text-lg leading-tight tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {shopSettings.shopName}
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight tracking-wide uppercase font-medium">
                Bill Generator • {user.counterName || user.username}
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25 ring-1 ring-[#7C3AED]/40'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }${
                  activeTab !== tab.id && index > 0 ? ' ml-0.5' : ''
                }`}
              >
                <span className={`transition-transform duration-200 ${
                  activeTab === tab.id ? 'scale-105' : 'hover:scale-110'
                }`}>
                  {tab.icon}
                </span>
                <span className="hidden lg:inline">{tab.label}</span>
                {tab.id === 'pending' && pendingCount > 0 && (
                  <Badge className="bg-[#F59E0B] text-black border-0 text-[10px] h-5 min-w-[20px] px-1.5 font-bold animate-badge-pulse">
                    {pendingCount}
                  </Badge>
                )}
                {activeTab !== tab.id && index < tabs.length - 1 && (
                  <span className="absolute -right-[3px] top-1/2 -translate-y-1/2 h-4 w-px bg-border/60" />
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
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Data Restore Notification */}
      <AnimatePresence>
        {(restoringData || restoreStatus) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[90%]"
          >
            <div className="bg-[#10B981]/95 backdrop-blur-sm text-white rounded-xl px-4 py-3 shadow-xl shadow-[#10B981]/20 flex items-center gap-3 border border-[#10B981]/30">
              {restoringData ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full flex-shrink-0" />
              ) : (
                <Database className="h-5 w-5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{restoringData ? 'Restoring Data...' : 'Data Recovered!'}</p>
                {restoreStatus && !restoringData && (
                  <p className="text-xs text-white/80 mt-0.5">{restoreStatus}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-20 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Footer */}
      <footer className="hidden md:block gradient-border-top bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-center text-xs text-muted-foreground/70 font-medium tracking-wide">
            Generated by <span className="text-muted-foreground font-semibold">{shopSettings.shopName}</span> Bill Generator
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar - Always Fixed */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl safe-area-bottom gradient-border-top shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 min-w-[60px] ${
                activeTab === tab.id
                  ? 'text-[#7C3AED]'
                  : 'text-muted-foreground active:scale-95'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id ? 'bg-[#7C3AED]/15 shadow-sm shadow-[#7C3AED]/20 ring-1 ring-[#7C3AED]/20' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              {tab.id === 'pending' && pendingCount > 0 && (
                <Badge className="absolute -top-1 right-0.5 bg-[#F59E0B] text-black border-0 text-[9px] h-4 min-w-[16px] px-1 font-bold animate-badge-pulse">
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
