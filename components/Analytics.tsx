'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student } from '@/lib/types'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { TrendingUp, IndianRupee, Users, BarChart3 } from 'lucide-react'

export default function Analytics() {
  const [students, setStudents] = useState<Student[]>([])
  const [view, setView] = useState<'month' | 'week'>('month')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('students').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setStudents(data)
    })
  }, [])

  // Group by month
  const byMonth: Record<string, Student[]> = {}
  students.forEach(s => {
    const key = format(new Date(s.payment_date), 'yyyy-MM')
    byMonth[key] = [...(byMonth[key] || []), s]
  })

  // Group by week
  const byWeek: Record<string, Student[]> = {}
  students.forEach(s => {
    const d = new Date(s.payment_date)
    const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    byWeek[weekStart] = [...(byWeek[weekStart] || []), s]
  })

  // Group by block
  const byBlock: Record<number, Student[]> = { 1: [], 2: [] }
  students.forEach(s => { byBlock[s.block] = [...(byBlock[s.block] || []), s] })

  // Group by account
  const byAccount: Record<string, { count: number; total: number }> = {}
  students.forEach(s => {
    if (!byAccount[s.account]) byAccount[s.account] = { count: 0, total: 0 }
    byAccount[s.account].count++
    byAccount[s.account].total += s.amount
  })

  const totalRevenue = students.reduce((sum, s) => sum + s.amount, 0)
  const totalStudents = students.length

  const groups = view === 'month' ? byMonth : byWeek
  const sortedKeys = Object.keys(groups).sort().reverse()

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users />} label="Total Students" value={totalStudents.toString()} color="#d4a017" />
        <StatCard icon={<IndianRupee />} label="Total Revenue" value={`₹${totalRevenue.toLocaleString('en-IN')}`} color="#c84b31" />
        <StatCard icon={<Users />} label="Block 1" value={(byBlock[1]?.length || 0).toString()} color="#2d6a4f" />
        <StatCard icon={<Users />} label="Block 2" value={(byBlock[2]?.length || 0).toString()} color="#0f3460" />
      </div>

      {/* Account breakdown */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-stone-200">
        <h3 className="font-medium text-stone-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-500" /> Account-wise Revenue
        </h3>
        <div className="space-y-3">
          {Object.entries(byAccount).map(([acc, { count, total }]) => (
            <div key={acc} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-stone-800 text-sm">{acc}</div>
                <div className="text-xs text-stone-400">{count} student{count !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-stone-800">₹{total.toLocaleString('en-IN')}</div>
                <div className="text-xs text-stone-400">{totalRevenue ? Math.round((total / totalRevenue) * 100) : 0}%</div>
              </div>
            </div>
          ))}
          {Object.keys(byAccount).length === 0 && (
            <p className="text-stone-400 text-sm text-center py-4">No data yet</p>
          )}
        </div>
      </div>

      {/* Time-based breakdown */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-stone-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            {view === 'month' ? 'Month-wise' : 'Week-wise'} Collections
          </h3>
          <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
            {(['month', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${view === v ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>
                {v === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {sortedKeys.map(key => {
            const grp = groups[key]
            const total = grp.reduce((s, st) => s + st.amount, 0)
            const label = view === 'month'
              ? format(new Date(key + '-01'), 'MMMM yyyy')
              : `Week of ${format(new Date(key), 'dd MMM')}`
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-24 text-xs text-stone-500 shrink-0">{label}</div>
                <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (total / (totalRevenue || 1)) * 100 * 5)}%`, background: 'linear-gradient(90deg, #d4a017, #c84b31)' }} />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-stone-800">₹{total.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-stone-400">{grp.length} students</div>
                </div>
              </div>
            )
          })}
          {sortedKeys.length === 0 && <p className="text-stone-400 text-sm text-center py-4">No payment data yet</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-stone-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ background: color }}>
          <div className="w-4 h-4">{icon}</div>
        </div>
      </div>
      <div className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'DM Serif Display, serif' }}>{value}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
    </div>
  )
}
