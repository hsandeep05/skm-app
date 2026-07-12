'use client'

import { useState, useEffect, useCallback } from 'react'
import { Home, Receipt, BarChart3, Settings, Clock, Sun, Moon, LogOut, Unlock, Plus, Menu, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Login } from '@/components/login'

// Dynamic imports to reduce initial bundle size and compilation memory
const LoadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin h-8 w-8 border-3 border-[#7C3AED] border-t-transparent rounded-full" />
  </div>
)
const Dashboard = dynamic(() => import('@/components/dashboard').then(m => ({ default: m.Dashboard })), { ssr: false, loading: LoadingFallback })
const Billing = dynamic(() => import('@/components/billing').then(m => ({ default: m.Billing })), { ssr: false, loading: LoadingFallback })
const Analytics = dynamic(() => import('@/components/analytics').then(m => ({ default: m.Analytics })), { ssr: false, loading: LoadingFallback })
const SettingsPage = dynamic(() => import('@/components/settings').then(m => ({ default: m.SettingsPage })), { ssr: false, loading: LoadingFallback })
const Unlocking = dynamic(() => import('@/components/unlocking').then(m => ({ default: m.Unlocking })), { ssr: false, loading: LoadingFallback })
const PendingBills = dynamic(() => import('@/components/pending-bills').then(m => ({ default: m.PendingBills })), { ssr: false, loading: LoadingFallback })
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

type TabId = 'dashboard' | 'pending' | 'billing' | 'unlocking' | 'analytics' | 'settings'

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
  { id: 'unlocking', label: 'Unlocking', icon: <Unlock className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

// Bottom bar tabs for mobile (excluding settings - it's in the hamburger menu)
const mobileBottomTabs: TabConfig[] = [
  { id: 'dashboard', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'pending', label: 'Pending', icon: <Clock className="h-5 w-5" /> },
  { id: 'billing', label: 'New Bill', icon: <Receipt className="h-5 w-5" /> },
  { id: 'unlocking', label: 'Unlock', icon: <Unlock className="h-5 w-5" /> },
  { id: 'analytics', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
]

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Check session on mount - single API call
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

  // Load shop settings and pending count after login
  useEffect(() => {
    if (!user) return

    // Load shop settings
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

    // Load pending count
    fetch('/api/invoices?status=pending')
      .then(res => res.ok ? res.json() : { invoices: [] })
      .then(data => setPendingCount(data.invoices?.length || 0))
      .catch(() => {})
  }, [user])

  // Refresh pending count when switching tabs
  useEffect(() => {
    if (user && activeTab !== 'dashboard') {
      fetch('/api/invoices?status=pending')
        .then(res => res.ok ? res.json() : { invoices: [] })
        .then(data => setPendingCount(data.invoices?.length || 0))
        .catch(() => {})
    }
  }, [activeTab, user])

  // Listen for pending count updates from Dashboard
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setPendingCount(e.detail || 0)
    }
    window.addEventListener('pending-count', handler as EventListener)
    return () => window.removeEventListener('pending-count', handler as EventListener)
  }, [])

  // Close mobile menu when switching tabs
  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId)
    setMobileMenuOpen(false)
  }, [])

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
    setMobileMenuOpen(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'pending':
        return <PendingBills />
      case 'billing':
        return <Billing shopLogo={shopLogo} shopSettings={shopSettings} />
      case 'unlocking':
        return <Unlocking />
      case 'analytics':
        return <Analytics />
      case 'settings':
        return <SettingsPage currentUser={user} onLogout={handleLogout} onLogoChange={setShopLogo} onShopSettingsChange={setShopSettings} />
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-xl ring-2 ring-[#7C3AED]/20">
          <img src="/logo.png" alt="Sri Krishna Mobiles" className="h-full w-full object-contain" />
        </div>
        <div className="animate-spin h-6 w-6 border-3 border-[#7C3AED] border-t-transparent rounded-full" />
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
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-[#7C3AED]/20 cursor-default hover:scale-105 hover:shadow-xl hover:shadow-[#7C3AED]/30 transition-all duration-300 ring-1 ring-[#7C3AED]/20">
              <img src="/logo.png" alt="Sri Krishna Mobiles" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-foreground font-bold text-lg leading-tight tracking-tight">
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
                onClick={() => handleTabChange(tab.id)}
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
            {/* Theme Toggle - Desktop only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Logout - Desktop only */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Hamburger Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[60px] right-3 z-[60] w-52 bg-card/95 backdrop-blur-xl rounded-xl border border-border/60 shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-1.5">
            {/* Settings */}
            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                  : 'text-foreground hover:bg-muted/80'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/80 transition-all duration-200"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            <div className="my-1 mx-2 h-px bg-border/60" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close mobile menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {renderContent()}
      </main>

      {/* Sticky Footer - Desktop only */}
      <footer className="hidden md:block gradient-border-top bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <img src="/logo.png" alt="SKM" className="h-5 w-5 object-contain opacity-70" />
          <p className="text-center text-xs text-muted-foreground/70 font-medium tracking-wide">
            Generated by <span className="text-muted-foreground font-semibold">{shopSettings.shopName}</span> Bill Generator
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar - Redesigned with Center FAB */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Background bar */}
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.12)]">
          <div className="flex items-end justify-around px-1 sm:px-2 pt-1.5 pb-1.5 safe-area-bottom" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
            {/* Home */}
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[44px] ${
                activeTab === 'dashboard'
                  ? 'text-[#7C3AED]'
                  : 'text-muted-foreground/70 active:scale-95'
              }`}
            >
              <Home className={`h-4.5 w-4.5 transition-all duration-200 ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-semibold leading-tight">Home</span>
            </button>

            {/* Pending Bills */}
            <button
              onClick={() => handleTabChange('pending')}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[44px] ${
                activeTab === 'pending'
                  ? 'text-[#7C3AED]'
                  : 'text-muted-foreground/70 active:scale-95'
              }`}
            >
              <Clock className={`h-4.5 w-4.5 transition-all duration-200 ${activeTab === 'pending' ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-semibold leading-tight">Pending</span>
              {pendingCount > 0 && (
                <Badge className="absolute -top-0.5 right-0.5 bg-[#F59E0B] text-black border-0 text-[8px] h-3.5 min-w-[14px] px-0.5 font-bold animate-badge-pulse">
                  {pendingCount}
                </Badge>
              )}
            </button>

            {/* Center FAB - Create New Bill */}
            <button
              onClick={() => handleTabChange('billing')}
              className="relative flex flex-col items-center -mt-4"
            >
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                activeTab === 'billing'
                  ? 'bg-[#7C3AED] shadow-[#7C3AED]/40 shadow-xl scale-110'
                  : 'bg-[#7C3AED] shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40 hover:scale-105 active:scale-95'
              }`}>
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className={`text-[9px] font-bold leading-tight mt-0.5 ${
                activeTab === 'billing' ? 'text-[#7C3AED]' : 'text-[#7C3AED]/80'
              }`}>
                New Bill
              </span>
            </button>

            {/* Unlocking */}
            <button
              onClick={() => handleTabChange('unlocking')}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[44px] ${
                activeTab === 'unlocking'
                  ? 'text-[#F59E0B]'
                  : 'text-muted-foreground/70 active:scale-95'
              }`}
            >
              <Unlock className={`h-4.5 w-4.5 transition-all duration-200 ${activeTab === 'unlocking' ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-semibold leading-tight">Unlock</span>
            </button>

            {/* Analytics */}
            <button
              onClick={() => handleTabChange('analytics')}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 min-w-[44px] ${
                activeTab === 'analytics'
                  ? 'text-[#10B981]'
                  : 'text-muted-foreground/70 active:scale-95'
              }`}
            >
              <BarChart3 className={`h-4.5 w-4.5 transition-all duration-200 ${activeTab === 'analytics' ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-semibold leading-tight">Reports</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
