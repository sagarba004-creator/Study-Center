'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Payment {
  id: string
  student_id: string
  student_name: string
  block: number
  seat_number: number | null
  amount: number
  account: string
  payment_date: string
  joining_date: string | null
  due_date: string | null
  duration: string | null
  duration_months: number | null
  notes: string | null
  created_at: string
}

function formatDuration(d: string | null | undefined): string {
  if (!d) return '—'
  const val = parseInt(d)
  const unit = d.slice(-1)
  if (unit === 'd') return val === 1 ? '1 Day' : `${val} Days`
  if (unit === 'm') return val === 1 ? '1 Month' : `${val} Months`
  if (unit === 'y') return val === 1 ? '1 Year' : `${val} Years`
  return d
}

const ACCOUNT_COLORS: Record<string, string> = {
  'Account 1': '#6366f1',
  'Account 2': '#ec4899',
  'Cash':      '#10b981',
  'UPI':       '#f59e0b',
  'Other':     '#64748b',
}

export default function Transactions() {
  const supabase = createClient()
  const [payments, setPayments]       = useState<Payment[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [blockFilter, setBlockFilter] = useState<'all' | 1 | 2>('all')
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('payments')
      .select('*').order('payment_date', { ascending: false })
    if (data) setPayments(data as Payment[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment record? This will remove it from all analytics calculations.')) return
    setDeleting(id)
    await supabase.from('payments').delete().eq('id', id)
    setPayments(p => p.filter(x => x.id !== id))
    setDeleting(null)
  }

  // Filter
  const filtered = payments.filter(p => {
    if (blockFilter !== 'all' && p.block !== blockFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.student_name.toLowerCase().includes(q) ||
        String(p.seat_number).includes(q) ||
        p.account.toLowerCase().includes(q)
    }
    return true
  })

  const totalFiltered = filtered.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

      {/* Filters */}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        {/* Block filter */}
        <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.04)', padding:'4px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.07)' }}>
          {([['all','All'],[ 1,'B1'],[ 2,'B2']] as const).map(([val, label]) => (
            <button key={String(val)} onClick={() => setBlockFilter(val as 'all'|1|2)}
              style={{ padding:'6px 14px', borderRadius:'7px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'12px', transition:'all 0.2s',
                background: blockFilter === val ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
                color: blockFilter === val ? 'white' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:'160px' }}>
          <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'13px' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Student name or seat…"
            style={{ width:'100%', padding:'8px 12px 8px 32px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.05)', color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px 16px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'120px' }}>
          <div style={{ color:'#64748b', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>💳 Transactions</div>
          <div style={{ color:'#a5b4fc', fontSize:'22px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>{filtered.length}</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'14px 16px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'120px' }}>
          <div style={{ color:'#64748b', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>💰 Total</div>
          <div style={{ color:'#4ade80', fontSize:'22px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>₹{totalFiltered.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Payment list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#475569' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#475569', fontSize:'14px' }}>No transactions found</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {filtered.map(p => {
            const isOpen    = expandedId === p.id
            const acctColor = ACCOUNT_COLORS[p.account] || '#64748b'
            return (
              <div key={p.id}>
                <div onClick={() => setExpandedId(isOpen ? null : p.id)}
                  style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'12px 14px', border:`1.5px solid ${isOpen ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
                    {/* Left */}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'15px', color:'white', flexShrink:0 }}>
                        {p.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.student_name}</div>
                        <div style={{ color:'#64748b', fontSize:'11px', marginTop:'1px' }}>
                          Block {p.block}{p.seat_number ? ` · Seat ${p.seat_number}` : ' · Flexible'}
                          {p.notes && <span style={{ color:'#475569' }}> · {p.notes}</span>}
                        </div>
                      </div>
                    </div>
                    {/* Right */}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ color:'#4ade80', fontWeight:'800', fontSize:'15px', fontFamily:"'Sora', sans-serif" }}>+₹{Number(p.amount).toLocaleString('en-IN')}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'5px', justifyContent:'flex-end', marginTop:'3px' }}>
                        <div style={{ width:'7px', height:'7px', borderRadius:'2px', background:acctColor }} />
                        <div style={{ color:'#64748b', fontSize:'10px' }}>{p.account}</div>
                      </div>
                      <div style={{ color:'#475569', fontSize:'10px', marginTop:'2px' }}>
                        {format(new Date(p.payment_date), 'dd MMM yyyy')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ marginTop:'4px', marginLeft:'8px', padding:'12px 14px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', animation:'fadeIn 0.2s ease' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
                      {[
                        { label:'Duration',     value: formatDuration(p.duration) },
                        { label:'Account',      value: p.account },
                        { label:'Payment Date', value: format(new Date(p.payment_date), 'dd MMM yyyy') },
                        { label:'Due Date',     value: p.due_date ? format(new Date(p.due_date), 'dd MMM yyyy') : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'8px', padding:'8px 10px', border:'1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color:'#475569', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'2px' }}>{label}</div>
                          <div style={{ color:'#94a3b8', fontSize:'12px', fontWeight:'600' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      style={{ width:'100%', padding:'9px', borderRadius:'9px', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#f87171', fontSize:'12px', fontWeight:'700', cursor: deleting === p.id ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: deleting === p.id ? 0.6 : 1 }}>
                      {deleting === p.id ? 'Deleting…' : '🗑 Delete Payment Record'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
