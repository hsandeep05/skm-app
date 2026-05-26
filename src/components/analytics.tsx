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
}

function SummaryCard({ title, value, icon, accentColor, gradientFrom }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
        style={{ borderColor: accentColor, backgroundColor: '#111827' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${gradientFrom})` }}
        />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: accentColor }}>
                {title}
              </p>
              <p className="text-2xl font-bold text-white mt-1.5 truncate">{value}</p>
            </div>
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${accentColor}25` }}
            >
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
      <div className="bg-[#111827] border border-[#334155] rounded-lg p-3 shadow-lg">
        <p className="text-xs text-[#94A3B8] mb-1">{label}</p>
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
        },
        {
          title: 'Total Cash Collected',
          value: formatCurrency(data.totalCashCollected),
          icon: <TrendingUp className="h-5 w-5" />,
          accentColor: '#7C3AED',
          gradientFrom: '#A78BFA',
        },
        {
          title: 'Total Outstanding',
          value: formatCurrency(data.totalOutstanding),
          icon: <Clock className="h-5 w-5" />,
          accentColor: '#F59E0B',
          gradientFrom: '#FBBF24',
        },
        {
          title: 'Total Net Profit',
          value: formatCurrency(data.totalNetProfit),
          icon: <BarChart3 className="h-5 w-5" />,
          accentColor: '#06B6D4',
          gradientFrom: '#22D3EE',
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
          <Label className="text-[#CBD5E1] text-xs font-medium">Select Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#0F172A] border-[#334155] text-white focus:border-[#7C3AED] h-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card, idx) => (
          <SummaryCard key={idx} {...card} />
        ))}
      </div>

      {/* Sales & Profit Trend Chart */}
      <div className="overflow-hidden rounded-xl border border-[#7C3AED]/30 bg-[#111827]">
        <div className="h-1 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md bg-[#7C3AED]/20 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div>
            <h3 className="text-white font-semibold text-sm">Last 7 Days — Sales & Profit Trend</h3>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#1E293B' }}
                    tickLine={{ stroke: '#1E293B' }}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#1E293B' }}
                    tickLine={{ stroke: '#1E293B' }}
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
            <div className="flex items-center justify-center h-48 text-[#64748B] text-sm">
              No trend data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
