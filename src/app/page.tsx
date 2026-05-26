'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Receipt, BarChart3, Settings } from 'lucide-react'
import { Dashboard } from '@/components/dashboard'
import { Billing } from '@/components/billing'
import { Analytics } from '@/components/analytics'
import { SettingsPage } from '@/components/settings'
import { Badge } from '@/components/ui/badge'

type TabId = 'dashboard' | 'billing' | 'analytics' | 'settings'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
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
    fetch('/api/invoices?status=pending')
      .then(res => res.ok ? res.json() : { invoices: [] })
      .then(data => setPendingCount(data.invoices?.length || 0))
      .catch(() => {})
  }, [])

  // Refresh pending count when switching to dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetch('/api/invoices?status=pending')
        .then(res => res.ok ? res.json() : { invoices: [] })
        .then(data => setPendingCount(data.invoices?.length || 0))
        .catch(() => {})
    }
  }, [activeTab])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'billing':
        return <Billing />
      case 'analytics':
        return <Analytics />
      case 'settings':
        return <SettingsPage />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#111827]/95 backdrop-blur-sm border-b border-[#1E293B] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Sri Krishna Mobiles
              </h1>
              <p className="text-[10px] text-[#94A3B8] leading-tight">
                Bill Generator
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'dashboard' && pendingCount > 0 && (
                  <Badge className="bg-[#F59E0B] text-black border-0 text-[10px] h-5 min-w-[20px] px-1.5 font-bold">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
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
      <footer className="hidden md:block border-t border-[#1E293B] bg-[#111827]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-center text-xs text-[#64748B]">
            Generated by SRI Krishna Mobiles Bill Generator
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111827]/95 backdrop-blur-sm border-t border-[#1E293B] z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[60px] ${
                activeTab === tab.id
                  ? 'text-[#7C3AED]'
                  : 'text-[#64748B]'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id ? 'bg-[#7C3AED]/20' : ''
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.id === 'dashboard' && pendingCount > 0 && (
                <Badge className="absolute -top-0.5 right-1 bg-[#F59E0B] text-black border-0 text-[9px] h-4 min-w-[16px] px-1 font-bold">
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
