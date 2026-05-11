'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student, getSeatStatus } from '@/lib/types'
import { format, startOfWeek } from 'date-fns'

export default function Analytics() {
  const [students, setStudents] = useState<Student[]>([])
  const [view, setView] = useState<'month' | 'week'>('month')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('students').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setStudents(data as Student[])
    })
  }, [])

  const totalRevenue     = students.reduce((sum, s) => sum + Number(s.amount), 0)
  const depositsHeld     = students.filter(s => s.security_deposit_status === 'collected').reduce((sum, s) => sum + Number(s.security_deposit), 0)
  const depositsForfeited = students.filter(s => s.security_deposit_status === 'forfeited').reduce((sum, s) => sum + Number(s.security_deposit), 0)
  // Fetch all students including inactive to count refunded/forfeited
  

  const byAccount: Record<string, { count: number; total: number }> = {}
  students.forEach(s => {
    if (!byAccount[s.account]) byAccount[s.account] = { count: 0, total: 0 }
    byAccount[s.account].count++
    byAccount[s.account].total += Number(s.amount)
  })

  const byBlock = { 1: students.filter(s => s.block === 1), 2: students.filter(s => s.block === 2) }

  const groups: Record<string, Student[]> = {}
  students.forEach(s => {
    const d = new Date(s.payment_date)
    const key = view === 'month'
      ? format(d, 'yyyy-MM')
      : format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    groups[key] = [...(groups[key] || []), s]
  })
  const sortedKeys = Object.keys(groups).sort().reverse()

  const card = (emoji: string, label: string, value: string, color: string) => (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'16px 18px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1 }}>
      <div style={{ fontSize:'24px', marginBottom:'8px' }}>{emoji}</div>
      <div style={{ fontSize:'22px', fontWeight:'800', color, fontFamily:"'Sora', sans-serif" }}>{value}</div>
      <div style={{ color:'#64748b', fontSize:'12px', marginTop:'4px', fontWeight:'600' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Summary */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        {card('💰', 'Total Revenue', `₹${totalRevenue.toLocaleString('en-IN')}`, '#4ade80')}
        {card('👥', 'Total Students', String(students.length), '#a5b4fc')}
        {card('🏠', 'Block 1', String(byBlock[1].length), '#f9a8d4')}
        {card('🏢', 'Block 2', String(byBlock[2].length), '#67e8f9')}
      {depositsHeld > 0 && card('🔐', 'Deposits Held', `₹${depositsHeld.toLocaleString('en-IN')}`, '#fde047')}
      {depositsForfeited > 0 && card('❌', 'Deposits Forfeited (Income)', `₹${depositsForfeited.toLocaleString('en-IN')}`, '#f87171')}
      </div>

      {/* Account breakdown */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', marginBottom:'16px', fontFamily:"'Sora', sans-serif" }}>🏦 Account-wise Revenue</div>
        {Object.entries(byAccount).length === 0
          ? <p style={{ color:'#475569', fontSize:'13px' }}>No data yet</p>
          : Object.entries(byAccount).map(([acc, { count, total }]) => (
            <div key={acc} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <div>
                <div style={{ fontWeight:'700', color:'#e2e8f0', fontSize:'14px' }}>{acc}</div>
                <div style={{ color:'#64748b', fontSize:'12px' }}>{count} student{count !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:'800', color:'#4ade80', fontSize:'15px' }}>₹{total.toLocaleString('en-IN')}</div>
                <div style={{ color:'#475569', fontSize:'11px' }}>{totalRevenue ? Math.round((total / totalRevenue) * 100) : 0}%</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Time breakdown */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>📈 Collections</div>
          <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.06)', padding:'4px', borderRadius:'10px' }}>
            {(['month','week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:'6px 14px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'12px',
                background: view === v ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
                color: view === v ? 'white' : '#64748b',
              }}>{v === 'month' ? 'Monthly' : 'Weekly'}</button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px' }}>
          {sortedKeys.map(key => {
            const grp = groups[key]
            const total = grp.reduce((s, st) => s + Number(st.amount), 0)
            const pct = totalRevenue ? (total / totalRevenue) * 100 : 0
            const label = view === 'month'
              ? format(new Date(key + '-01'), 'MMMM yyyy')
              : `Week of ${format(new Date(key), 'dd MMM yyyy')}`
            return (
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ color:'#94a3b8', fontSize:'12px', fontWeight:'600' }}>{label}</span>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ color:'#4ade80', fontWeight:'800', fontSize:'13px' }}>₹{total.toLocaleString('en-IN')}</span>
                    <span style={{ color:'#475569', fontSize:'11px', marginLeft:'8px' }}>{grp.length} students</span>
                  </div>
                </div>
                <div style={{ height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100, pct * 5)}%`, background:'linear-gradient(90deg,#6366f1,#ec4899)', borderRadius:'3px', transition:'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
          {sortedKeys.length === 0 && <p style={{ color:'#475569', fontSize:'13px' }}>No payment data yet</p>}
        </div>
      </div>
    </div>
  )
}
