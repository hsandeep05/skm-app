'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { DollarSign, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AnalyticsData {
  date: string
  totalGrossSales: number
  totalCashCollected: number
  totalOutstanding: number
  totalNetProfit: number
  invoiceCount: number
  trend: {
    date: string
    sales: number
    profit: number
    count: number
  }[]
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface SummaryCardProps {
  title: string
  value: string
  icon: React.ReactNode
  accentColor: string
  gradientFrom: string
  delay?: number
}

function SummaryCard({ title, value, icon, accentColor, gradientFrom, delay = 0 }: SummaryCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className="group relative overflow-hidden rounded-2xl border bg-card
                    transition-all duration-300 ease-out
                    hover:-translate-y-1
                    cursor-default"
        style={{
          borderColor: hovered ? 'transparent' : undefined,
          boxShadow: hovered
            ? `0 8px 30px -8px ${accentColor}35, 0 0 20px -6px ${accentColor}20`
            : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Subtle accent gradient overlay on the card */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            background: `linear-gradient(135deg, ${accentColor}08 0%, transparent 60%)`,
          }}
        />

        {/* Subtle dot pattern overlay for visual texture */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${accentColor} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Radial glow from top-right corner */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] dark:opacity-[0.1] pointer-events-none blur-2xl"
          style={{
            background: `radial-gradient(circle, ${accentColor}, transparent 70%)`,
          }}
        />

        {/* Left-side color bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background: `linear-gradient(180deg, ${accentColor}, ${gradientFrom})`,
          }}
        />

        <div className="relative p-5 pl-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.1em] truncate"
                style={{ color: accentColor }}
              >
                {title}
              </p>
              <p className="text-3xl font-extrabold text-foreground mt-2 tracking-tight truncate leading-none">
                {value}
              </p>
            </div>
            {/* Circular icon with glow */}
            <div
              className="relative h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0
                          transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${accentColor}${hovered ? '25' : '18'}, ${accentColor}${hovered ? '12' : '08'})`,
                transform: hovered ? 'scale(1.1)' : undefined,
                boxShadow: hovered
                  ? `0 0 20px -4px ${accentColor}40, 0 0 8px -2px ${accentColor}25`
                  : 'none',
              }}
            >
              {/* Inner ring */}
              <div
                className="absolute inset-[2px] rounded-full border transition-colors duration-300"
                style={{ borderColor: `${accentColor}${hovered ? '35' : '20'}` }}
              />
              <div style={{ color: accentColor }}>{icon}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function Analytics() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?date=${selectedDate}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const summaryCards: SummaryCardProps[] = data
    ? [
        {
          title: 'Total Gross Sales',
          value: formatCurrency(data.totalGrossSales),
          icon: <DollarSign className="h-5 w-5" />,
          accentColor: '#10B981',
          gradientFrom: '#34D399',
          delay: 0,
        },
        {
          title: 'Total Cash Collected',
          value: formatCurrency(data.totalCashCollected),
          icon: <TrendingUp className="h-5 w-5" />,
          accentColor: '#7C3AED',
          gradientFrom: '#A78BFA',
          delay: 0.06,
        },
        {
          title: 'Total Outstanding',
          value: formatCurrency(data.totalOutstanding),
          icon: <Clock className="h-5 w-5" />,
          accentColor: '#F59E0B',
          gradientFrom: '#FBBF24',
          delay: 0.12,
        },
        {
          title: 'Total Net Profit',
          value: formatCurrency(data.totalNetProfit),
          icon: <BarChart3 className="h-5 w-5" />,
          accentColor: '#06B6D4',
          gradientFrom: '#22D3EE',
          delay: 0.18,
        },
      ]
    : []

  const chartData = data?.trend.map((t) => ({
    ...t,
    dateLabel: format(new Date(t.date), 'dd MMM'),
  })) || []

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <Label className="text-muted-foreground text-xs font-medium">Select Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-background border-border text-foreground focus:border-[#7C3AED] h-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <SummaryCard key={idx} {...card} />
        ))}
      </div>

      {/* Sales & Profit Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#7C3AED]/25 bg-card">
          {/* Left accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#7C3AED] to-[#A78BFA] rounded-l-2xl" />

          {/* Subtle background glow */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.05] pointer-events-none blur-3xl"
            style={{ background: '#7C3AED' }}
          />

          <div className="p-5 pl-6">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Last 7 Days — Sales & Profit Trend</h3>
                <p className="text-muted-foreground text-xs mt-0.5">Revenue and profit over time</p>
              </div>
            </div>
          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={{ stroke: 'var(--border)' }}
                    tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#salesGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#profitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No trend data available
            </div>
          )}
        </div>
      </div>
      </motion.div>
    </div>
  )
}
