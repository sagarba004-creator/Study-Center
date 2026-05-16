'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student } from '@/lib/types'
import { format } from 'date-fns'

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ bars, height = 160 }: {
  bars: { label: string; value: number; sublabel?: string; color?: string }[]
  height?: number
}) {
  const max = Math.max(...bars.map(b => b.value), 1)
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:`${height}px`, padding:'0 4px' }}>
      {bars.map((bar, i) => {
        const pct   = (bar.value / max) * 100
        const isHov = hovered === i
        const color = bar.color || '#6366f1'
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', height:'100%', justifyContent:'flex-end' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {isHov && (
              <div style={{ position:'absolute', background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'6px 10px', fontSize:'12px', fontWeight:'700', color:'#f1f5f9', whiteSpace:'nowrap', zIndex:10, pointerEvents:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
                ₹{bar.value.toLocaleString('en-IN')}
                {bar.sublabel && <div style={{ color:'#64748b', fontSize:'10px' }}>{bar.sublabel}</div>}
              </div>
            )}
            <div style={{ width:'100%', borderRadius:'6px 6px 0 0', transition:'all 0.4s ease', cursor:'pointer',
              height:`${Math.max(pct, 3)}%`,
              background: isHov ? `linear-gradient(180deg,${color},${color}99)` : `linear-gradient(180deg,${color}cc,${color}66)`,
              boxShadow: isHov ? `0 0 16px ${color}66` : 'none' }} />
            <div style={{ fontSize:'10px', color: isHov ? '#e2e8f0' : '#64748b', fontWeight:'600', textAlign:'center', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>{bar.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── ProjectionMonth ───────────────────────────────────────────────────────────
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
      <div onClick={() => setOpen(o => !o)} style={{ padding:'12px 14px', borderRadius:'12px', background: isCurrentMonth ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border:`1px solid ${isCurrentMonth ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
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
        <div style={{ marginTop:'6px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'6px' }}>
          {students.sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(s => (
            <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>{s.name}</div>
                <div style={{ color:'#64748b', fontSize:'10px' }}>B{s.block}{s.seat_number ? ` · Seat ${s.seat_number}` : ''} · Due {format(new Date(s.due_date), 'dd MMM')}</div>
              </div>
              <div style={{ color:'#a5b4fc', fontWeight:'800', fontSize:'13px' }}>₹{Number(s.amount).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Table helpers ─────────────────────────────────────────────────────────────
const TH = ({ cols }: { cols: string[] }) => (
  <div style={{ display:'grid', gridTemplateColumns:`1.2fr ${cols.slice(1).map(() => '1fr').join(' ')}`, gap:'4px', padding:'0 8px', marginBottom:'6px' }}>
    {cols.map((c, i) => (
      <div key={c} style={{ color:'#475569', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', textAlign: i === 0 ? 'left' : 'right' }}>{c}</div>
    ))}
  </div>
)

function TR({ label, income, exp, pl, highlight, dimmed }: { label: string; income: number; exp: number; pl: number; highlight?: boolean; dimmed?: boolean }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr', gap:'4px', padding:'9px 8px', borderRadius:'9px',
      background: highlight ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
      border:`1px solid ${highlight ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
      opacity: dimmed ? 0.35 : 1 }}>
      <div style={{ color: highlight ? '#f1f5f9' : '#94a3b8', fontSize:'13px', fontWeight: highlight ? '800' : '600' }}>{label}</div>
      <div style={{ textAlign:'right', color: income > 0 ? '#4ade80' : '#334155', fontSize:'13px', fontWeight:'700' }}>{income > 0 ? `₹${income.toLocaleString('en-IN')}` : '—'}</div>
      <div style={{ textAlign:'right', color: exp > 0 ? '#f87171' : '#334155', fontSize:'13px', fontWeight:'700' }}>{exp > 0 ? `₹${exp.toLocaleString('en-IN')}` : '—'}</div>
      <div style={{ textAlign:'right', color: pl > 0 ? '#4ade80' : pl < 0 ? '#f87171' : '#475569', fontSize:'13px', fontWeight:'800' }}>
        {pl !== 0 ? `${pl > 0 ? '+' : ''}₹${pl.toLocaleString('en-IN')}` : '—'}
      </div>
    </div>
  )
}

// ── Interfaces ────────────────────────────────────────────────────────────────
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

const PALETTE  = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4']
const ACCOUNTS = ['Account 1','Account 2','Cash','UPI','Other']

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const supabase = createClient()
  const [students,     setStudents]     = useState<Student[]>([])
  const [oldStudents,  setOldStudents]  = useState<Student[]>([])
  const [payments,     setPayments]     = useState<Payment[]>([])
  const [expenditures, setExpenditures] = useState<Expenditure[]>([])
  const [plView,        setPlView]        = useState<'yearly' | 'monthly'>('yearly')
  const [selectedYear,  setSelectedYear]  = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))

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

  const allStudents = [...students, ...oldStudents]
  const nowKey      = format(new Date(), 'yyyy-MM')
  const getMonthKey = (d: Date) => format(d, 'yyyy-MM')

  // Core P&L calculator — prefix is '2026' (year) or '2026-05' (month)
  const calcPL = (prefix: string, blockFilter: 'all' | 1 | 2 = 'all') => {
    const matchPeriod = (dateStr: string | null) => !!(dateStr && dateStr.startsWith(prefix))
    const blockOk     = (b: number) => blockFilter === 'all' || b === blockFilter

    const income = payments
      .filter(p => blockOk(p.block) && matchPeriod(p.payment_date))
      .reduce((s, p) => s + Number(p.amount), 0)

    const forfeit = allStudents
      .filter(s => blockOk(s.block) && s.security_deposit_status === 'forfeited' &&
        matchPeriod((s.vacated_at || s.payment_date || '').slice(0,10)))
      .reduce((s, st) => s + Number(st.security_deposit), 0)

    const manExp = expenditures
      .filter(e => (blockFilter === 'all' || !e.block || e.block === blockFilter) && matchPeriod(e.date))
      .reduce((s, e) => s + Number(e.amount), 0)

    const refunds = allStudents
      .filter(s => blockOk(s.block) && Number(s.refund_amount) > 0 &&
        matchPeriod((s.refund_date || s.vacated_at || s.payment_date || '').slice(0,10)))
      .reduce((s, st) => s + Number(st.refund_amount), 0)

    const totalIn  = income + forfeit
    const totalOut = manExp + refunds
    return { income: totalIn, exp: totalOut, pl: totalIn - totalOut }
  }

  const yearPrefix  = String(selectedYear)
  const monthPrefix = selectedMonth

  // Yearly view data
  const yearlyRows = Array.from({ length: 12 }, (_, i) => {
    const mk = `${selectedYear}-${String(i+1).padStart(2,'0')}`
    return { mk, label: format(new Date(mk + '-01'), 'MMMM'), all: calcPL(mk), b1: calcPL(mk, 1), b2: calcPL(mk, 2) }
  })
  const yearTotal = { all: calcPL(yearPrefix), b1: calcPL(yearPrefix, 1), b2: calcPL(yearPrefix, 2) }

  // Monthly view data
  const monthAccounts = ACCOUNTS.map(acc => {
    const pmts = payments.filter(p => p.account === acc && p.payment_date.startsWith(monthPrefix))
    return { acc, income: pmts.reduce((s, p) => s + Number(p.amount), 0), count: pmts.length }
  }).filter(a => a.income > 0)

  const monthBlocks = ([1, 2] as const).map(b => ({ b, ...calcPL(monthPrefix, b) }))
  const monthTotal  = calcPL(monthPrefix)

  const mPayments = payments.filter(p => p.payment_date.startsWith(monthPrefix))
  const mExp      = expenditures.filter(e => e.date.startsWith(monthPrefix))
  const mRefunds  = allStudents.filter(s => Number(s.refund_amount) > 0 && (s.refund_date || s.vacated_at || s.payment_date || '').startsWith(monthPrefix))
  const mForfeit  = allStudents.filter(s => s.security_deposit_status === 'forfeited' && (s.vacated_at || s.payment_date || '').startsWith(monthPrefix))

  // Projections
  const today = new Date(); today.setHours(0,0,0,0)
  const projectionMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(today); d.setMonth(d.getMonth() + i)
    const key = getMonthKey(d)
    const due = students.filter(s => getMonthKey(new Date(s.due_date)) === key)
    return { key, label: format(d, 'MMMM yyyy'), students: due, estimated: due.reduce((s, st) => s + Number(st.amount), 0) }
  })
  const totalProjected = projectionMonths.reduce((s, m) => s + m.estimated, 0)

  const { income: pIncome, exp: pExp, pl: pPL } = plView === 'yearly' ? yearTotal.all : monthTotal
  const isProfit = pPL >= 0
  const periodLabel = plView === 'yearly' ? String(selectedYear) : format(new Date(selectedMonth + '-01'), 'MMMM yyyy')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Period selector */}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.04)', padding:'4px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.07)' }}>
          {(['yearly','monthly'] as const).map(v => (
            <button key={v} onClick={() => setPlView(v)}
              style={{ padding:'6px 16px', borderRadius:'7px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'13px', transition:'all 0.2s',
                background: plView === v ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
                color: plView === v ? 'white' : '#64748b' }}>
              {v === 'yearly' ? 'Yearly' : 'Monthly'}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
          <button onClick={() => {
            const newYear = selectedYear - 1
            setSelectedYear(newYear)
            if (plView === 'monthly') setSelectedMonth(m => `${newYear}-${m.slice(5)}`)
          }} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'6px', width:'28px', height:'28px', cursor:'pointer', color:'#94a3b8', fontSize:'16px' }}>‹</button>
          <span style={{ color:'#e2e8f0', fontWeight:'800', fontSize:'14px', minWidth:'44px', textAlign:'center' }}>{selectedYear}</span>
          <button onClick={() => {
            const newYear = selectedYear + 1
            setSelectedYear(newYear)
            if (plView === 'monthly') setSelectedMonth(m => `${newYear}-${m.slice(5)}`)
          }} disabled={selectedYear >= new Date().getFullYear()}
            style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'6px', width:'28px', height:'28px', cursor:'pointer', color: selectedYear >= new Date().getFullYear() ? '#334155' : '#94a3b8', fontSize:'16px' }}>›</button>
        </div>
        {plView === 'monthly' && (
          <input type="month" value={selectedMonth} onChange={e => {
            setSelectedMonth(e.target.value)
            setSelectedYear(parseInt(e.target.value.slice(0, 4)))
          }} style={{ padding:'6px 10px', borderRadius:'8px', border:'1.5px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#f1f5f9', fontSize:'13px', fontFamily:'inherit', outline:'none' }} />
        )}
      </div>

      {/* P&L Summary */}
      <div style={{ background: isProfit ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)', borderRadius:'16px', padding:'18px 20px', border:`1.5px solid ${isProfit ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
        <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'12px' }}>
          {isProfit ? '📈' : '📉'} P&L — {periodLabel}
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          {[
            { label:'💰 Income',      value: pIncome, color:'#4ade80' },
            { label:'📤 Expenditure', value: pExp,    color:'#f87171' },
            { label: isProfit ? '🟢 Net Profit' : '🔴 Net Loss', value: Math.abs(pPL), color: isProfit ? '#4ade80' : '#f87171' },
          ].map(c => (
            <div key={c.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px 16px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'110px' }}>
              <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>{c.label}</div>
              <div style={{ color:c.color, fontSize:'18px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>₹{c.value.toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* YEARLY VIEW */}
      {plView === 'yearly' && (
        <>
          {/* Block-wise year */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>🏢 Block-wise — {selectedYear}</div>
            <TH cols={['Block','Income','Expenditure','P&L']} />
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              <TR label="Block 1" income={yearTotal.b1.income} exp={yearTotal.b1.exp} pl={yearTotal.b1.pl} />
              <TR label="Block 2" income={yearTotal.b2.income} exp={yearTotal.b2.exp} pl={yearTotal.b2.pl} />
              <TR label="Total"   income={yearTotal.all.income} exp={yearTotal.all.exp} pl={yearTotal.all.pl} highlight />
            </div>
          </div>

          {/* Account-wise year */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>🏦 Account-wise Income — {selectedYear}</div>
            {ACCOUNTS.every(acc => payments.filter(p => p.account === acc && p.payment_date.startsWith(yearPrefix)).length === 0)
              ? <p style={{ color:'#475569', fontSize:'13px' }}>No data for {selectedYear}</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                  {ACCOUNTS.map((acc, i) => {
                    const pmts  = payments.filter(p => p.account === acc && p.payment_date.startsWith(yearPrefix))
                    const total = pmts.reduce((s, p) => s + Number(p.amount), 0)
                    if (total === 0) return null
                    const color = PALETTE[i % PALETTE.length]
                    const pct   = yearTotal.all.income > 0 ? Math.round((total / yearTotal.all.income) * 100) : 0
                    return (
                      <div key={acc} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ width:'9px', height:'9px', borderRadius:'3px', background:color, boxShadow:`0 0 5px ${color}88` }} />
                          <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{acc}</span>
                          <span style={{ color:'#475569', fontSize:'11px' }}>{pmts.length} payments</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <span style={{ color:'#475569', fontSize:'11px' }}>{pct}%</span>
                          <span style={{ color, fontWeight:'800', fontSize:'14px' }}>₹{total.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>

          {/* Month-wise table */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>📅 Month-wise P&L — {selectedYear}</div>
            <TH cols={['Month','Income','Expenditure','P&L']} />
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {yearlyRows.map(r => (
                <TR key={r.mk} label={r.label} income={r.all.income} exp={r.all.exp} pl={r.all.pl}
                  highlight={r.mk === nowKey} dimmed={r.mk > nowKey} />
              ))}
              <TR label={`Total ${selectedYear}`} income={yearTotal.all.income} exp={yearTotal.all.exp} pl={yearTotal.all.pl} highlight />
            </div>
          </div>
        </>
      )}

      {/* MONTHLY VIEW */}
      {plView === 'monthly' && (
        <>
          {/* Block-wise month */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>🏢 Block-wise — {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</div>
            <TH cols={['Block','Income','Expenditure','P&L']} />
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {monthBlocks.map(b => <TR key={b.b} label={`Block ${b.b}`} income={b.income} exp={b.exp} pl={b.pl} />)}
              <TR label="Total" income={monthTotal.income} exp={monthTotal.exp} pl={monthTotal.pl} highlight />
            </div>
          </div>

          {/* Account-wise month */}
          {monthAccounts.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>🏦 Account-wise Income — {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                {monthAccounts.map((a) => {
                  const color = PALETTE[ACCOUNTS.indexOf(a.acc) % PALETTE.length]
                  const pct   = monthTotal.income > 0 ? Math.round((a.income / monthTotal.income) * 100) : 0
                  return (
                    <div key={a.acc} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ width:'9px', height:'9px', borderRadius:'3px', background:color, boxShadow:`0 0 5px ${color}88` }} />
                        <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{a.acc}</span>
                        <span style={{ color:'#475569', fontSize:'11px' }}>{a.count} payments</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <span style={{ color:'#475569', fontSize:'11px' }}>{pct}%</span>
                        <span style={{ color, fontWeight:'800', fontSize:'14px' }}>₹{a.income.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transactions list */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontWeight:'800', fontSize:'15px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>📋 Transactions — {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</div>
            {mPayments.length === 0 && mExp.length === 0 && mRefunds.length === 0 && mForfeit.length === 0
              ? <p style={{ color:'#475569', fontSize:'13px' }}>No transactions this month</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {(mPayments.length > 0 || mForfeit.length > 0) && (
                    <div>
                      <div style={{ color:'#4ade80', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>💰 Income</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        {mPayments.map((p, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.1)' }}>
                            <div>
                              <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>{p.student_name}</div>
                              <div style={{ color:'#64748b', fontSize:'10px' }}>B{p.block}{p.seat_number ? ` · Seat ${p.seat_number}` : ''} · {p.account} · {format(new Date(p.payment_date), 'dd MMM')}{p.notes ? ` · ${p.notes}` : ''}</div>
                            </div>
                            <div style={{ color:'#4ade80', fontWeight:'800', fontSize:'13px' }}>+₹{Number(p.amount).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                        {mForfeit.map((s, i) => (
                          <div key={`f${i}`} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(74,222,128,0.04)', border:'1px solid rgba(74,222,128,0.1)' }}>
                            <div>
                              <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>❌ {s.name} — Deposit Forfeited</div>
                              <div style={{ color:'#64748b', fontSize:'10px' }}>B{s.block}</div>
                            </div>
                            <div style={{ color:'#fb923c', fontWeight:'800', fontSize:'13px' }}>+₹{Number(s.security_deposit).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(mExp.length > 0 || mRefunds.length > 0) && (
                    <div>
                      <div style={{ color:'#f87171', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>📤 Expenditure</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        {mExp.map((e, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.1)' }}>
                            <div>
                              <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>{e.category}</div>
                              <div style={{ color:'#64748b', fontSize:'10px' }}>{e.account} · {format(new Date(e.date), 'dd MMM')}{e.description ? ` · ${e.description}` : ''}</div>
                            </div>
                            <div style={{ color:'#f87171', fontWeight:'800', fontSize:'13px' }}>-₹{Number(e.amount).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                        {mRefunds.map((s, i) => (
                          <div key={`r${i}`} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', borderRadius:'8px', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.1)' }}>
                            <div>
                              <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'700' }}>↩️ {s.name} — Fee Refund</div>
                              <div style={{ color:'#64748b', fontSize:'10px' }}>B{s.block}</div>
                            </div>
                            <div style={{ color:'#f87171', fontWeight:'800', fontSize:'13px' }}>-₹{Number(s.refund_amount).toLocaleString('en-IN')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </>
      )}

      {/* Projected Renewals */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>🔮 Projected Renewals</div>
          <div style={{ padding:'4px 12px', borderRadius:'20px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:'12px', fontWeight:'700' }}>Next 3 months</div>
        </div>
        <div style={{ color:'#64748b', fontSize:'12px', marginBottom:'16px' }}>Estimated from students whose seat expires — based on last paid amount</div>
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
