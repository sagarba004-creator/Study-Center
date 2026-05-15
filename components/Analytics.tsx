'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student } from '@/lib/types'
import { format, startOfWeek } from 'date-fns'

// ── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 160 }: {
  slices: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total  = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) return null
  const r      = 54
  const cx     = size / 2
  const cy     = size / 2
  const stroke = 22
  let offset   = -90 // start from top

  const arcs = slices.map(sl => {
    const pct   = sl.value / total
    const deg   = pct * 360
    const rad   = (a: number) => (a * Math.PI) / 180
    const x1    = cx + r * Math.cos(rad(offset))
    const y1    = cy + r * Math.sin(rad(offset))
    const x2    = cx + r * Math.cos(rad(offset + deg))
    const y2    = cy + r * Math.sin(rad(offset + deg))
    const large = deg > 180 ? 1 : 0
    const path  = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
    const mid   = offset + deg / 2
    offset     += deg
    return { ...sl, path, pct, mid }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => (
        <path key={i} d={arc.path} fill="none" stroke={arc.color}
          strokeWidth={stroke} strokeLinecap="butt"
          style={{ transition:'all 0.4s ease', filter:`drop-shadow(0 0 6px ${arc.color}66)` }} />
      ))}
      {/* Center total */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="800" fontFamily="'Sora', sans-serif">
        ₹{(total/1000).toFixed(1)}k
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">
        TOTAL
      </text>
    </svg>
  )
}

// ── Vertical Bar Chart ───────────────────────────────────────────────────────
function BarChart({ bars, height = 160 }: {
  bars: { label: string; value: number; sublabel?: string; color?: string }[]
  height?: number
}) {
  const max = Math.max(...bars.map(b => b.value), 1)
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:`${height}px`, padding:'0 4px' }}>
      {bars.map((bar, i) => {
        const pct    = (bar.value / max) * 100
        const isHov  = hovered === i
        const color  = bar.color || '#6366f1'
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', height:'100%', justifyContent:'flex-end' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {/* Tooltip */}
            {isHov && (
              <div style={{ position:'absolute', background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'6px 10px', fontSize:'12px', fontWeight:'700', color:'#f1f5f9', whiteSpace:'nowrap', zIndex:10, marginBottom:'4px', pointerEvents:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                ₹{bar.value.toLocaleString('en-IN')}
                {bar.sublabel && <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'500' }}>{bar.sublabel}</div>}
              </div>
            )}
            {/* Bar */}
            <div style={{ width:'100%', borderRadius:'6px 6px 0 0', transition:'all 0.4s ease', position:'relative', cursor:'pointer',
              height:`${Math.max(pct, 3)}%`,
              background: isHov ? `linear-gradient(180deg, ${color}, ${color}99)` : `linear-gradient(180deg, ${color}cc, ${color}66)`,
              boxShadow: isHov ? `0 0 16px ${color}66` : 'none',
            }} />
            {/* Label */}
            <div style={{ fontSize:'10px', color: isHov ? '#e2e8f0' : '#64748b', fontWeight:'600', textAlign:'center', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>
              {bar.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── ProjectionMonth ──────────────────────────────────────────────────────────
function ProjectionMonth({ label, students, estimated, isCurrentMonth }: {
  label: string; students: Student[]; estimated: number; isCurrentMonth: boolean
}) {
  const [open, setOpen] = useState(false)
  if (students.length === 0) return (
    <div style={{ padding:'12px 14px', borderRadius:'12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ color:'#334155', fontSize:'13px', fontWeight:'600' }}>{label}</span>
      <span style={{ color:'#334155', fontSize:'12px' }}>No renewals due</span>
    </div>
  )
  return (
    <div>
      <div onClick={() => setOpen(o => !o)} style={{ padding:'12px 14px', borderRadius:'12px', background: isCurrentMonth ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border:`1px solid ${isCurrentMonth ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{label}</span>
            {isCurrentMonth && <span style={{ padding:'2px 8px', borderRadius:'8px', fontSize:'10px', fontWeight:'700', background:'rgba(99,102,241,0.2)', color:'#a5b4fc' }}>This Month</span>}
          </div>
          <div style={{ color:'#64748b', fontSize:'11px', marginTop:'2px' }}>{students.length} seat{students.length !== 1 ? 's' : ''} expiring</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#a5b4fc', fontWeight:'800', fontSize:'15px', fontFamily:"'Sora', sans-serif" }}>~₹{estimated.toLocaleString('en-IN')}</div>
            <div style={{ color:'#475569', fontSize:'10px' }}>if all renew</div>
          </div>
          <div style={{ color:'#64748b', fontSize:'18px', transition:'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop:'6px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'6px', animation:'fadeIn 0.2s ease' }}>
          {students.sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'13px', color:'#a5b4fc', flexShrink:0 }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{s.name}</div>
                  <div style={{ color:'#475569', fontSize:'11px', marginTop:'1px' }}>
                    {s.exam} · Block {s.block}{s.seat_number ? `, Seat ${s.seat_number}` : ' (Flexible)'}
                    · Due {new Date(s.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                  </div>
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ color:'#a5b4fc', fontWeight:'700', fontSize:'13px' }}>~₹{Number(s.amount).toLocaleString('en-IN')}</div>
                <div style={{ color:'#475569', fontSize:'10px' }}>last paid</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TxRow ────────────────────────────────────────────────────────────────────
function TxRow({ student, type }: { student: Student; type: 'credit' | 'debit' | 'deposit' | 'forfeit' | 'feerefund' }) {
  const colors = {
    credit:     { color:'#4ade80', label:'Fee Credit',        prefix:'+' },
    debit:      { color:'#f87171', label:'Deposit Refund',    prefix:'-' },
    deposit:    { color:'#fde047', label:'Deposit Collected', prefix:'+' },
    forfeit:    { color:'#fb923c', label:'Deposit Forfeited', prefix:'+' },
    feerefund:  { color:'#f87171', label:'Fee Refund',        prefix:'-' },
  }
  const c      = colors[type]
  const amount = type === 'credit' ? Number(student.amount)
    : type === 'feerefund' ? Number(student.refund_amount)
    : Number(student.security_deposit)
  const account = type === 'feerefund' ? (student.refund_account || '') : ''
  const date   = (type === 'debit' || type === 'forfeit') && student.vacated_at
    ? new Date(student.vacated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    : new Date(student.payment_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>
          {type === 'credit' ? '💳' : type === 'debit' ? '↩️' : type === 'deposit' ? '🔐' : type === 'feerefund' ? '💸' : '❌'}
        </div>
        <div>
          <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{student.name}</div>
          <div style={{ color:'#475569', fontSize:'11px', marginTop:'1px' }}>
            {c.label}{account ? ` · ${account}` : ''} · Block {student.block}{student.seat_number ? `, Seat ${student.seat_number}` : ' (Flexible)'} · {date}
          </div>
        </div>
      </div>
      <div style={{ color:c.color, fontWeight:'800', fontSize:'14px', fontFamily:"'Sora', sans-serif", flexShrink:0 }}>
        {c.prefix}₹{amount.toLocaleString('en-IN')}
      </div>
    </div>
  )
}

// ── Main Analytics ───────────────────────────────────────────────────────────
const PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4']

interface Payment {
  id: string; student_id: string; student_name: string
  block: number; seat_number: number | null
  amount: number; account: string; payment_date: string
  joining_date: string | null; due_date: string | null
  duration: string | null; duration_months: number | null
  notes: string | null; created_at: string
}

interface Expenditure {
  id: string; date: string; amount: number; account: string
  category: string; description: string | null; block: number | null
}

export default function Analytics() {
  const [students, setStudents]       = useState<Student[]>([])
  const [oldStudents, setOldStudents] = useState<Student[]>([])
  const [payments, setPayments]       = useState<Payment[]>([])
  const [expenditures, setExpenditures] = useState<Expenditure[]>([])
  const [view, setView]               = useState<'month' | 'week'>('month')
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [expandedPeriod,  setExpandedPeriod]  = useState<string | null>(null)
  const [blockFilter, setBlockFilter]         = useState<'all' | 1 | 2>('all')
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('*').eq('is_active', true),
      supabase.from('students').select('*').eq('is_active', false),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('expenditures').select('*').order('date', { ascending: false }),
    ]).then(([active, old, pay, exp]) => {
      if (active.data) setStudents(active.data as Student[])
      if (old.data)    setOldStudents(old.data as Student[])
      if (pay.data)    setPayments(pay.data as Payment[])
      if (exp.data)    setExpenditures(exp.data as Expenditure[])
    })
  }, [])

  const allStudentsRaw    = [...students, ...oldStudents]
  const allStudents       = blockFilter === 'all' ? allStudentsRaw : allStudentsRaw.filter(s => s.block === blockFilter)
  const filteredActive    = blockFilter === 'all' ? students : students.filter(s => s.block === blockFilter)

  // Payments from payments table (source of truth for income)
  const filteredPayments  = blockFilter === 'all' ? payments : payments.filter(p => p.block === blockFilter)
  const totalRevenue      = filteredPayments.reduce((s, p) => s + Number(p.amount), 0)

  // Locker revenue still from students table
  const totalLockerRev    = allStudents.filter(s => (s.locker_numbers || []).length > 0).reduce((s, st) => s + Number(st.locker_amount || 0), 0)

  // Refunds & deposits still from students table
  const totalFeeRefunds   = allStudents.reduce((s, st) => s + Number(st.refund_amount || 0), 0)
  const netRevenue        = totalRevenue - totalFeeRefunds
  const depositsHeld      = filteredActive.filter(s => s.security_deposit_status === 'collected').reduce((s, st) => s + Number(st.security_deposit), 0)
  const depositsForfeited = allStudents.filter(s => s.security_deposit_status === 'forfeited').reduce((s, st) => s + Number(st.security_deposit), 0)
  const depositsRefunded  = allStudents.filter(s => s.security_deposit_status === 'refunded').reduce((s, st) => s + Number(st.security_deposit), 0)

  // P&L — uses payments + expenditures
  const filteredExp       = blockFilter === 'all' ? expenditures : expenditures.filter(e => !e.block || e.block === blockFilter)
  const totalIncome       = totalRevenue + depositsForfeited
  const totalManualExp    = filteredExp.reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenditure  = totalManualExp + totalFeeRefunds
  const profitLoss        = totalIncome - totalExpenditure
  const isProfit          = profitLoss >= 0

  // Account breakdown from payments table
  const byAccount: Record<string, Payment[]> = {}
  filteredPayments.forEach(p => {
    if (!byAccount[p.account]) byAccount[p.account] = []
    byAccount[p.account].push(p)
  })
  const accountEntries = Object.entries(byAccount)
  const donutSlices = accountEntries.map(([acc, pmts], i) => ({
    label: acc,
    value: pmts.reduce((s, p) => s + Number(p.amount), 0),
    color: PALETTE[i % PALETTE.length],
  }))

  // Time breakdown from payments table
  const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  const getKey = (d: Date) => view === 'month'
    ? format(d, 'yyyy-MM')
    : format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const nowKey = getMonthKey(new Date())

  const groups: Record<string, Payment[]> = {}
  filteredPayments.forEach(p => {
    const key = getKey(new Date(p.payment_date))
    groups[key] = [...(groups[key] || []), p]
  })
  // Add periods from refunds that may not have payments
  const refundGroups: Record<string, Student[]> = {}
  allStudents.filter(s => s.security_deposit_status === 'refunded' || Number(s.refund_amount) > 0).forEach(s => {
    const refundDate = s.refund_date ? new Date(s.refund_date) : s.vacated_at ? new Date(s.vacated_at) : new Date(s.payment_date)
    const key = getKey(refundDate)
    refundGroups[key] = [...(refundGroups[key] || []), s]
    if (!groups[key]) groups[key] = []
  })
  const sortedKeys = Object.keys(groups).sort()

  // Bar chart — from payments
  const barData = sortedKeys.slice(-6).map((key, i) => ({
    label: (view === 'month' ? format(new Date(key + '-01'), 'MMM yy') : format(new Date(key), 'dd MMM')) + (key > nowKey ? '*' : ''),
    value: (groups[key] || []).reduce((s, p) => s + Number(p.amount), 0),
    sublabel: `${(groups[key] || []).length} payments`,
    color: PALETTE[i % PALETTE.length],
  }))

  // Projections — still from students due_date
  const today = new Date(); today.setHours(0,0,0,0)
  const projectionMonths = Array.from({ length: 3 }, (_, i) => {
    const d   = new Date(today); d.setMonth(d.getMonth() + i)
    const key = getMonthKey(d)
    const due = filteredActive.filter(s => getMonthKey(new Date(s.due_date)) === key)
    return { key, label: format(d, 'MMMM yyyy'), students: due, estimated: due.reduce((s, st) => s + Number(st.amount), 0) }
  })
  const totalProjected = projectionMonths.reduce((s, m) => s + m.estimated, 0)

  const card = (emoji: string, label: string, value: string, color: string, sub?: string) => (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'16px 18px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'130px' }}>
      <div style={{ fontSize:'20px', marginBottom:'8px' }}>{emoji}</div>
      <div style={{ fontSize:'20px', fontWeight:'800', color, fontFamily:"'Sora', sans-serif" }}>{value}</div>
      <div style={{ color:'#64748b', fontSize:'12px', marginTop:'4px', fontWeight:'600' }}>{label}</div>
      {sub && <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px' }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Block filter */}
      <div style={{ display:'flex', gap:'6px', background:'rgba(255,255,255,0.04)', padding:'5px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.07)', alignSelf:'flex-start' }}>
        {([['all','All Blocks'],[ 1,'Block 1'],[ 2,'Block 2']] as const).map(([val, label]) => (
          <button key={String(val)} onClick={() => { setBlockFilter(val as 'all'|1|2); setExpandedAccount(null); setExpandedPeriod(null) }}
            style={{ padding:'7px 18px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'13px', transition:'all 0.2s',
              background: blockFilter === val ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
              color: blockFilter === val ? 'white' : '#64748b' }}>
            {label}
          </button>
        ))}
      </div>

      {/* P&L Card */}
      <div style={{ background: isProfit ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)', borderRadius:'16px', padding:'18px 20px', border:`1.5px solid ${isProfit ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
        <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'12px' }}>
          {isProfit ? '📈' : '📉'} Profit & Loss {blockFilter !== 'all' ? `— Block ${blockFilter}` : '— Overall'}
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px 16px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'130px' }}>
            <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>💰 Income</div>
            <div style={{ color:'#4ade80', fontSize:'18px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>₹{totalIncome.toLocaleString('en-IN')}</div>
            <div style={{ color:'#475569', fontSize:'10px', marginTop:'2px' }}>Fees + ₹{depositsForfeited.toLocaleString('en-IN')} forfeited</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px 16px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'130px' }}>
            <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>📤 Expenditure</div>
            <div style={{ color:'#f87171', fontSize:'18px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>₹{totalExpenditure.toLocaleString('en-IN')}</div>
            <div style={{ color:'#475569', fontSize:'10px', marginTop:'2px' }}>₹{totalManualExp.toLocaleString('en-IN')} ops + ₹{totalFeeRefunds.toLocaleString('en-IN')} refunds</div>
          </div>
          <div style={{ background: isProfit ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', borderRadius:'12px', padding:'12px 16px', border:`1.5px solid ${isProfit ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`, flex:1, minWidth:'130px' }}>
            <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>{isProfit ? '🟢 Net Profit' : '🔴 Net Loss'}</div>
            <div style={{ color: isProfit ? '#4ade80' : '#f87171', fontSize:'18px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>₹{Math.abs(profitLoss).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        {card('💰', 'Total Fees',         `₹${totalRevenue.toLocaleString('en-IN')}`,      '#4ade80', `${filteredPayments.length} payments`)}
        {totalLockerRev > 0 && card('🔒', 'Locker Revenue', `₹${totalLockerRev.toLocaleString('en-IN')}`, '#67e8f9')}
        {totalFeeRefunds > 0 && card('↩️', 'Fee Refunds',  `₹${totalFeeRefunds.toLocaleString('en-IN')}`, '#f87171', 'outflow')}
        {card('👥', 'Active Students',    String(filteredActive.length),                    '#a5b4fc')}
        {depositsHeld > 0      && card('🔐', 'Deposits Held',     `₹${depositsHeld.toLocaleString('en-IN')}`,      '#fde047', 'liability')}
        {depositsForfeited > 0 && card('❌', 'Deposits Forfeited', `₹${depositsForfeited.toLocaleString('en-IN')}`, '#fb923c', 'income')}
        {depositsRefunded > 0  && card('↩️', 'Deposits Refunded', `₹${depositsRefunded.toLocaleString('en-IN')}`,  '#f87171', 'outflow')}
      </div>

      {/* Account-wise — Donut + legend */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', marginBottom:'16px', fontFamily:"'Sora', sans-serif" }}>🏦 Account-wise Revenue</div>
        {accountEntries.length === 0
          ? <p style={{ color:'#475569', fontSize:'13px' }}>No data yet</p>
          : (
            <div style={{ display:'flex', gap:'24px', alignItems:'center', flexWrap:'wrap' }}>
              {/* Donut */}
              <div style={{ flexShrink:0 }}>
                <DonutChart slices={donutSlices} size={160} />
              </div>
              {/* Legend + rows */}
              <div style={{ flex:1, minWidth:'200px', display:'flex', flexDirection:'column', gap:'6px' }}>
                {accountEntries.map(([acc, pmts], i) => {
                  const fees  = pmts.reduce((s, p) => s + Number(p.amount), 0)
                  const color = PALETTE[i % PALETTE.length]
                  const isOpen = expandedAccount === acc
                  return (
                    <div key={acc}>
                      <div onClick={() => setExpandedAccount(isOpen ? null : acc)}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'10px', background: isOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', border:`1px solid ${isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`, cursor:'pointer', transition:'all 0.15s' }}>
                        <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:color, flexShrink:0, boxShadow:`0 0 6px ${color}88` }} />
                        <div style={{ flex:1 }}>
                          <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px' }}>
                            {acc}
                            <span style={{ color:'#475569', fontSize:'11px', fontWeight:'500' }}>{pmts.length} payment{pmts.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ color, fontWeight:'800', fontSize:'14px' }}>₹{fees.toLocaleString('en-IN')}</div>
                            <div style={{ color:'#475569', fontSize:'10px' }}>{totalRevenue > 0 ? Math.round((fees / totalRevenue) * 100) : 0}%</div>
                          </div>
                          <div style={{ color:'#64748b', fontSize:'16px', transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ marginTop:'6px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'5px', animation:'fadeIn 0.2s ease' }}>
                          {pmts.map((p, j) => (
                            <div key={j} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                              <div>
                                <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>{p.student_name}</div>
                                <div style={{ color:'#64748b', fontSize:'10px' }}>Block {p.block}{p.seat_number ? ` · Seat ${p.seat_number}` : ''} · {format(new Date(p.payment_date), 'dd MMM yyyy')}{p.notes ? ` · ${p.notes}` : ''}</div>
                              </div>
                              <div style={{ color:'#4ade80', fontWeight:'800', fontSize:'13px' }}>+₹{Number(p.amount).toLocaleString('en-IN')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
      </div>

      {/* Collections — Bar Chart */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>📊 Collections</div>
          <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.06)', padding:'4px', borderRadius:'10px' }}>
            {(['month','week'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setExpandedPeriod(null) }} style={{ padding:'5px 12px', borderRadius:'7px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'12px', background: view === v ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent', color: view === v ? 'white' : '#64748b' }}>
                {v === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        {barData.length > 0 && (
          <div style={{ position:'relative', marginBottom:'20px' }}>
            <BarChart bars={barData} height={140} />
          </div>
        )}

        {/* Clickable period rows */}
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {sortedKeys.slice().reverse().map(key => {
            const grpPayments = groups[key] || []
            const grpRefunds  = refundGroups[key] || []
            const fees    = grpPayments.reduce((s, p) => s + Number(p.amount), 0)
            const refunds = grpRefunds.filter(s => s.security_deposit_status === 'refunded').reduce((s, st) => s + Number(st.security_deposit), 0)
            const net     = fees - refunds
            const isOpen  = expandedPeriod === key
            const isFuture = key > nowKey
            const label   = view === 'month'
              ? format(new Date(key + '-01'), 'MMMM yyyy') + (isFuture ? ' 🔮' : '')
              : `Week of ${format(new Date(key), 'dd MMM yyyy')}` + (isFuture ? ' 🔮' : '')

            return (
              <div key={key}>
                <div onClick={() => setExpandedPeriod(isOpen ? null : key)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', borderRadius:'11px', background: isOpen ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border:`1px solid ${isOpen ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`, cursor:'pointer', transition:'all 0.15s' }}>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{label}</div>
                    <div style={{ color:'#64748b', fontSize:'11px', marginTop:'1px' }}>{grpPayments.length} payments{refunds > 0 ? ` · -₹${refunds.toLocaleString('en-IN')} refunds` : ''}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ color:'#4ade80', fontWeight:'800', fontSize:'15px', fontFamily:"'Sora', sans-serif" }}>₹{net.toLocaleString('en-IN')}</div>
                    <div style={{ color:'#64748b', fontSize:'16px', transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop:'6px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'5px', animation:'fadeIn 0.2s ease' }}>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <span style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'700', background:'rgba(74,222,128,0.1)', color:'#4ade80' }}>+₹{fees.toLocaleString('en-IN')} fees</span>
                      {refunds > 0 && <span style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'700', background:'rgba(239,68,68,0.1)', color:'#f87171' }}>-₹{refunds.toLocaleString('en-IN')} refunds</span>}
                      <span style={{ padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'700', background:'rgba(99,102,241,0.1)', color:'#a5b4fc' }}>= ₹{net.toLocaleString('en-IN')} net</span>
                    </div>
                    {grpPayments.map((p, j) => (
                      <div key={j} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>{p.student_name}</div>
                          <div style={{ color:'#64748b', fontSize:'10px' }}>Block {p.block}{p.seat_number ? ` · Seat ${p.seat_number}` : ''} · {p.account}{p.notes ? ` · ${p.notes}` : ''}</div>
                        </div>
                        <div style={{ color:'#4ade80', fontWeight:'800', fontSize:'13px' }}>+₹{Number(p.amount).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                    {grpRefunds.map((s, j) => (
                      <div key={`ref-${j}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.1)' }}>
                        <div>
                          <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>↩️ {s.name}</div>
                          <div style={{ color:'#64748b', fontSize:'10px' }}>{s.security_deposit_status === 'refunded' ? 'Deposit Refund' : 'Fee Refund'}</div>
                        </div>
                        <div style={{ color:'#f87171', fontWeight:'800', fontSize:'13px' }}>-₹{(s.security_deposit_status === 'refunded' ? Number(s.security_deposit) : Number(s.refund_amount)).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {sortedKeys.length === 0 && <p style={{ color:'#475569', fontSize:'13px' }}>No payment data yet</p>}
        </div>
      </div>

      {/* Projected Renewals */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>🔮 Projected Renewals</div>
          <div style={{ padding:'4px 12px', borderRadius:'20px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:'12px', fontWeight:'700' }}>Next 3 months</div>
        </div>
        <div style={{ color:'#64748b', fontSize:'12px', marginBottom:'16px' }}>Estimated from students whose seat expires — based on last paid amount</div>

        {/* Mini bar chart for projections */}
        {totalProjected > 0 && (
          <div style={{ marginBottom:'16px' }}>
            <BarChart bars={projectionMonths.map((m, i) => ({ label: format(new Date(m.key + '-01'), 'MMM yy'), value: m.estimated, sublabel:`${m.students.length} students`, color:'#8b5cf6' }))} height={100} />
          </div>
        )}

        <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(236,72,153,0.08))', borderRadius:'12px', padding:'14px 18px', border:'1px solid rgba(99,102,241,0.2)', marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:'#94a3b8', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Total Projected (3 months)</div>
            <div style={{ color:'#a5b4fc', fontSize:'22px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>₹{totalProjected.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ fontSize:'28px' }}>📅</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {projectionMonths.map(m => (
            <ProjectionMonth key={m.key} label={m.label} students={m.students} estimated={m.estimated} isCurrentMonth={m.key === getMonthKey(today)} />
          ))}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
