'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student } from '@/lib/types'
import { format, startOfWeek } from 'date-fns'

export default function Analytics() {
  const [students, setStudents]       = useState<Student[]>([])
  const [oldStudents, setOldStudents] = useState<Student[]>([])
  const [view, setView]               = useState<'month' | 'week'>('month')
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [expandedPeriod, setExpandedPeriod]   = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('*').eq('is_active', true),
      supabase.from('students').select('*').eq('is_active', false),
    ]).then(([active, old]) => {
      if (active.data) setStudents(active.data as Student[])
      if (old.data)    setOldStudents(old.data as Student[])
    })
  }, [])

  const allStudents = [...students, ...oldStudents]

  const totalRevenue      = allStudents.reduce((s, st) => s + Number(st.amount), 0)
  const depositsHeld      = students.filter(s => s.security_deposit_status === 'collected').reduce((s, st) => s + Number(st.security_deposit), 0)
  const depositsForfeited = allStudents.filter(s => s.security_deposit_status === 'forfeited').reduce((s, st) => s + Number(st.security_deposit), 0)
  const depositsRefunded  = allStudents.filter(s => s.security_deposit_status === 'refunded').reduce((s, st) => s + Number(st.security_deposit), 0)

  // Account breakdown — credits = fees paid, debits = refunded deposits
  const byAccount: Record<string, { students: Student[] }> = {}
  allStudents.forEach(s => {
    if (!byAccount[s.account]) byAccount[s.account] = { students: [] }
    byAccount[s.account].students.push(s)
  })

  // Time breakdown
  const groups: Record<string, Student[]> = {}
  allStudents.forEach(s => {
    const d   = new Date(s.payment_date)
    const key = view === 'month'
      ? format(d, 'yyyy-MM')
      : format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    groups[key] = [...(groups[key] || []), s]
  })
  const sortedKeys = Object.keys(groups).sort().reverse()

  const card = (emoji: string, label: string, value: string, color: string, sub?: string) => (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'16px 18px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'140px' }}>
      <div style={{ fontSize:'22px', marginBottom:'8px' }}>{emoji}</div>
      <div style={{ fontSize:'20px', fontWeight:'800', color, fontFamily:"'Sora', sans-serif" }}>{value}</div>
      <div style={{ color:'#64748b', fontSize:'12px', marginTop:'4px', fontWeight:'600' }}>{label}</div>
      {sub && <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px' }}>{sub}</div>}
    </div>
  )

  const TxRow = ({ student, type }: { student: Student; type: 'credit' | 'debit' | 'deposit' | 'forfeit' }) => {
    const colors = {
      credit:  { color:'#4ade80', label:'Fee Credit',         prefix:'+' },
      debit:   { color:'#f87171', label:'Deposit Refund',     prefix:'-' },
      deposit: { color:'#fde047', label:'Deposit Collected',  prefix:'+' },
      forfeit: { color:'#fb923c', label:'Deposit Forfeited',  prefix:'+' },
    }
    const c = colors[type]
    const amount = type === 'credit' ? Number(student.amount) : Number(student.security_deposit)
    const date   = type === 'debit' || type === 'forfeit'
      ? (student.vacated_at ? new Date(student.vacated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—')
      : new Date(student.payment_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })

    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>
            {type === 'credit' ? '💳' : type === 'debit' ? '↩️' : type === 'deposit' ? '🔐' : '❌'}
          </div>
          <div>
            <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{student.name}</div>
            <div style={{ color:'#475569', fontSize:'11px', marginTop:'1px' }}>
              {c.label} · Block {student.block}{student.seat_number ? `, Seat ${student.seat_number}` : ' (Flexible)'} · {date}
            </div>
          </div>
        </div>
        <div style={{ color:c.color, fontWeight:'800', fontSize:'14px', fontFamily:"'Sora', sans-serif", flexShrink:0 }}>
          {c.prefix}₹{amount.toLocaleString('en-IN')}
        </div>
      </div>
    )
  }

  const getAccountTransactions = (acctStudents: Student[]) => {
    const txns: { student: Student; type: 'credit' | 'debit' | 'deposit' | 'forfeit'; sortDate: Date }[] = []
    acctStudents.forEach(s => {
      txns.push({ student: s, type: 'credit', sortDate: new Date(s.payment_date) })
      if (s.security_deposit > 0 && s.security_deposit_status === 'collected' && s.is_active)
        txns.push({ student: s, type: 'deposit', sortDate: new Date(s.payment_date) })
      if (s.security_deposit > 0 && s.security_deposit_status === 'refunded')
        txns.push({ student: s, type: 'debit', sortDate: s.vacated_at ? new Date(s.vacated_at) : new Date(s.payment_date) })
      if (s.security_deposit > 0 && s.security_deposit_status === 'forfeited')
        txns.push({ student: s, type: 'forfeit', sortDate: s.vacated_at ? new Date(s.vacated_at) : new Date(s.payment_date) })
    })
    return txns.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
  }

  const getPeriodTransactions = (periodStudents: Student[]) => {
    const txns: { student: Student; type: 'credit' | 'debit' | 'deposit' | 'forfeit'; sortDate: Date }[] = []
    periodStudents.forEach(s => {
      txns.push({ student: s, type: 'credit', sortDate: new Date(s.payment_date) })
      if (s.security_deposit > 0 && s.security_deposit_status === 'collected' && s.is_active)
        txns.push({ student: s, type: 'deposit', sortDate: new Date(s.payment_date) })
      if (s.security_deposit > 0 && s.security_deposit_status === 'refunded')
        txns.push({ student: s, type: 'debit', sortDate: s.vacated_at ? new Date(s.vacated_at) : new Date() })
      if (s.security_deposit > 0 && s.security_deposit_status === 'forfeited')
        txns.push({ student: s, type: 'forfeit', sortDate: s.vacated_at ? new Date(s.vacated_at) : new Date() })
    })
    return txns.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
  }

  const acctNet = (acctStudents: Student[]) => {
    const credits  = acctStudents.reduce((s, st) => s + Number(st.amount), 0)
    const refunds  = acctStudents.filter(s => s.security_deposit_status === 'refunded').reduce((s, st) => s + Number(st.security_deposit), 0)
    return credits - refunds
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        {card('💰', 'Total Fees Collected', `₹${totalRevenue.toLocaleString('en-IN')}`, '#4ade80')}
        {card('👥', 'Active Students', String(students.length), '#a5b4fc')}
        {depositsHeld > 0      && card('🔐', 'Deposits Held',     `₹${depositsHeld.toLocaleString('en-IN')}`,      '#fde047', 'liability')}
        {depositsForfeited > 0 && card('❌', 'Deposits Forfeited', `₹${depositsForfeited.toLocaleString('en-IN')}`, '#fb923c', 'income')}
        {depositsRefunded > 0  && card('↩️', 'Deposits Refunded', `₹${depositsRefunded.toLocaleString('en-IN')}`,  '#f87171', 'outflow')}
      </div>

      {/* Account-wise — clickable */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', marginBottom:'16px', fontFamily:"'Sora', sans-serif" }}>🏦 Account-wise Revenue</div>
        {Object.keys(byAccount).length === 0
          ? <p style={{ color:'#475569', fontSize:'13px' }}>No data yet</p>
          : Object.entries(byAccount).map(([acc, { students: acctStudents }]) => {
            const credits  = acctStudents.reduce((s, st) => s + Number(st.amount), 0)
            const refunds  = acctStudents.filter(s => s.security_deposit_status === 'refunded').reduce((s, st) => s + Number(st.security_deposit), 0)
            const net      = credits - refunds
            const isOpen   = expandedAccount === acc
            const txns     = getAccountTransactions(acctStudents)
            return (
              <div key={acc} style={{ marginBottom:'8px' }}>
                <div onClick={() => setExpandedAccount(isOpen ? null : acc)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:'12px', background: isOpen ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border:`1px solid ${isOpen ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, cursor:'pointer', transition:'all 0.2s' }}>
                  <div>
                    <div style={{ fontWeight:'700', color:'#e2e8f0', fontSize:'14px', display:'flex', alignItems:'center', gap:'8px' }}>
                      {acc}
                      <span style={{ fontSize:'11px', color:'#64748b', fontWeight:'500' }}>{acctStudents.length} student{acctStudents.length !== 1 ? 's' : ''}</span>
                    </div>
                    {refunds > 0 && (
                      <div style={{ fontSize:'11px', color:'#f87171', marginTop:'2px' }}>↩️ ₹{refunds.toLocaleString('en-IN')} refunded</div>
                    )}
                  </div>
                  <div style={{ textAlign:'right', display:'flex', alignItems:'center', gap:'12px' }}>
                    <div>
                      <div style={{ fontWeight:'800', color:'#4ade80', fontSize:'15px' }}>₹{net.toLocaleString('en-IN')}</div>
                      {refunds > 0 && <div style={{ fontSize:'10px', color:'#64748b' }}>net of refunds</div>}
                    </div>
                    <div style={{ color:'#64748b', fontSize:'18px', transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</div>
                  </div>
                </div>

                {/* Expanded transactions */}
                {isOpen && (
                  <div style={{ marginTop:'8px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'6px', animation:'fadeIn 0.2s ease' }}>
                    {/* Summary row */}
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', background:'rgba(74,222,128,0.1)', color:'#4ade80' }}>
                        +₹{credits.toLocaleString('en-IN')} fees
                      </span>
                      {refunds > 0 && <span style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', background:'rgba(239,68,68,0.1)', color:'#f87171' }}>
                        -₹{refunds.toLocaleString('en-IN')} refunds
                      </span>}
                      <span style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', background:'rgba(99,102,241,0.1)', color:'#a5b4fc' }}>
                        = ₹{net.toLocaleString('en-IN')} net
                      </span>
                    </div>
                    {txns.map((tx, i) => <TxRow key={i} student={tx.student} type={tx.type} />)}
                  </div>
                )}
              </div>
            )
          })
        }
      </div>

      {/* Time breakdown — clickable */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>📈 Collections</div>
          <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.06)', padding:'4px', borderRadius:'10px' }}>
            {(['month','week'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setExpandedPeriod(null) }} style={{ padding:'6px 14px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'12px', background: view === v ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent', color: view === v ? 'white' : '#64748b' }}>
                {v === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {sortedKeys.map(key => {
            const grp     = groups[key]
            const fees    = grp.reduce((s, st) => s + Number(st.amount), 0)
            const refunds = grp.filter(s => s.security_deposit_status === 'refunded').reduce((s, st) => s + Number(st.security_deposit), 0)
            const net     = fees - refunds
            const pct     = totalRevenue ? (fees / totalRevenue) * 100 : 0
            const isOpen  = expandedPeriod === key
            const txns    = getPeriodTransactions(grp)
            const label   = view === 'month'
              ? format(new Date(key + '-01'), 'MMMM yyyy')
              : `Week of ${format(new Date(key), 'dd MMM yyyy')}`

            return (
              <div key={key}>
                <div onClick={() => setExpandedPeriod(isOpen ? null : key)}
                  style={{ padding:'12px 14px', borderRadius:'12px', background: isOpen ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', border:`1px solid ${isOpen ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`, cursor:'pointer', transition:'all 0.2s' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                    <span style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'600' }}>{label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ color:'#4ade80', fontWeight:'800', fontSize:'14px' }}>₹{net.toLocaleString('en-IN')}</div>
                        <div style={{ color:'#475569', fontSize:'10px' }}>{grp.length} students{refunds > 0 ? ` · -₹${refunds.toLocaleString('en-IN')} refunds` : ''}</div>
                      </div>
                      <div style={{ color:'#64748b', fontSize:'18px', transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</div>
                    </div>
                  </div>
                  <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100, pct)}%`, background:'linear-gradient(90deg,#6366f1,#ec4899)', borderRadius:'3px' }} />
                  </div>
                </div>

                {/* Expanded transactions */}
                {isOpen && (
                  <div style={{ marginTop:'6px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'6px', animation:'fadeIn 0.2s ease' }}>
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <span style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', background:'rgba(74,222,128,0.1)', color:'#4ade80' }}>
                        +₹{fees.toLocaleString('en-IN')} fees
                      </span>
                      {refunds > 0 && <span style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', background:'rgba(239,68,68,0.1)', color:'#f87171' }}>
                        -₹{refunds.toLocaleString('en-IN')} refunds
                      </span>}
                      <span style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', background:'rgba(99,102,241,0.1)', color:'#a5b4fc' }}>
                        = ₹{net.toLocaleString('en-IN')} net
                      </span>
                    </div>
                    {txns.map((tx, i) => <TxRow key={i} student={tx.student} type={tx.type} />)}
                  </div>
                )}
              </div>
            )
          })}
          {sortedKeys.length === 0 && <p style={{ color:'#475569', fontSize:'13px' }}>No payment data yet</p>}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
