'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student } from '@/lib/types'
import { format, startOfWeek } from 'date-fns'

const CATEGORIES = ['Rent', 'Electricity', 'Maintenance', 'Salaries', 'Supplies', 'Internet', 'Other']
const ACCOUNTS   = ['Account 1', 'Account 2', 'Cash', 'UPI', 'Other']
const PALETTE    = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#f97316']

interface Expenditure {
  id: string
  date: string
  amount: number
  account: string
  category: string
  description: string | null
  block: number | null
  created_at: string
}

const inp: React.CSSProperties = {
  width:'100%', padding:'11px 14px', borderRadius:'10px',
  border:'1.5px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)',
  color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
}

export default function Expenditure() {
  const supabase = createClient()
  const today    = format(new Date(), 'yyyy-MM-dd')

  const [expenditures, setExpenditures]   = useState<Expenditure[]>([])
  const [students, setStudents]           = useState<Student[]>([])
  const [oldStudents, setOldStudents]     = useState<Student[]>([])
  const [blockFilter, setBlockFilter]     = useState<'all' | 1 | 2>('all')
  const [view, setView]                   = useState<'month' | 'week'>('month')
  const [showForm, setShowForm]           = useState(false)
  const [saving, setSaving]               = useState(false)
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)
  const [editingId, setEditingId]         = useState<string | null>(null)

  const [form, setForm] = useState({
    date: today, amount: '', account: 'Cash',
    category: 'Rent', description: '', block: '1' as '1' | '2' | '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('expenditures').select('*').order('date', { ascending: false }),
      supabase.from('students').select('*').eq('is_active', true),
      supabase.from('students').select('*').eq('is_active', false),
    ]).then(([exp, active, old]) => {
      if (exp.data)    setExpenditures(exp.data as Expenditure[])
      if (active.data) setStudents(active.data as Student[])
      if (old.data)    setOldStudents(old.data as Student[])
    })
  }, [])

  const reload = () =>
    supabase.from('expenditures').select('*').order('date', { ascending: false })
      .then(({ data }) => { if (data) setExpenditures(data as Expenditure[]) })

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0 || !form.block) return
    setSaving(true)
    const payload = {
      date: form.date, amount: Number(form.amount), account: form.account,
      category: form.category, description: form.description || null,
      block: Number(form.block),
    }
    if (editingId) {
      await supabase.from('expenditures').update(payload).eq('id', editingId)
    } else {
      await supabase.from('expenditures').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm({ date: today, amount: '', account: 'Cash', category: 'Rent', description: '', block: '1' })
    reload()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expenditure?')) return
    await supabase.from('expenditures').delete().eq('id', id)
    reload()
  }

  const handleEdit = (e: Expenditure) => {
    setEditingId(e.id)
    setForm({
      date: e.date, amount: String(e.amount), account: e.account,
      category: e.category, description: e.description || '', block: (e.block ? String(e.block) : '1') as '1'|'2',
    })
    setShowForm(true)
  }

  const allStudentsRaw = [...students, ...oldStudents]

  // Fee refunds (auto expenditure from student data)
  const feeRefunds: { date: string; amount: number; account: string; student: Student; block: number }[] =
    allStudentsRaw
      .filter(s => Number(s.refund_amount) > 0)
      .map(s => ({
        date:    s.refund_date || s.vacated_at?.slice(0,10) || s.payment_date,
        amount:  Number(s.refund_amount),
        account: s.refund_account || s.account,
        student: s,
        block:   s.block,
      }))

  // Apply block filter
  const filteredExp = blockFilter === 'all' ? expenditures : expenditures.filter(e => !e.block || e.block === blockFilter)
  const filteredRefunds = blockFilter === 'all' ? feeRefunds : feeRefunds.filter(r => r.block === blockFilter)
  const filteredStudents = blockFilter === 'all' ? allStudentsRaw : allStudentsRaw.filter(s => s.block === blockFilter)

  // Income
  const totalFees       = filteredStudents.reduce((s, st) => s + Number(st.amount), 0)
  const depositsForfeited = filteredStudents.filter(s => s.security_deposit_status === 'forfeited').reduce((s, st) => s + Number(st.security_deposit), 0)
  const totalIncome     = totalFees + depositsForfeited

  // Expenditure totals
  const totalManual  = filteredExp.reduce((s, e) => s + Number(e.amount), 0)
  const totalRefunds = filteredRefunds.reduce((s, r) => s + r.amount, 0)
  const totalExp     = totalManual + totalRefunds
  const profitLoss   = totalIncome - totalExp
  const isProfit     = profitLoss >= 0

  // Grouping helpers
  const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  const getKey = (d: Date) => view === 'month'
    ? format(d, 'yyyy-MM')
    : format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const nowKey = getMonthKey(new Date())

  // Build period groups combining manual + refunds
  const groups: Record<string, { manual: Expenditure[]; refunds: typeof filteredRefunds }> = {}
  filteredExp.forEach(e => {
    const key = getKey(new Date(e.date))
    if (!groups[key]) groups[key] = { manual: [], refunds: [] }
    groups[key].manual.push(e)
  })
  filteredRefunds.forEach(r => {
    const key = getKey(new Date(r.date))
    if (!groups[key]) groups[key] = { manual: [], refunds: [] }
    groups[key].refunds.push(r)
  })
  const sortedKeys = Object.keys(groups).sort().reverse()

  // Category breakdown (manual only)
  const byCategory: Record<string, number> = {}
  filteredExp.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount) })
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Block filter + Add button */}
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:'6px', background:'rgba(255,255,255,0.04)', padding:'5px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.07)' }}>
          {([['all','All'],[ 1,'Block 1'],[ 2,'Block 2']] as const).map(([val, label]) => (
            <button key={String(val)} onClick={() => { setBlockFilter(val as 'all'|1|2); setExpandedPeriod(null) }}
              style={{ padding:'7px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'13px', transition:'all 0.2s',
                background: blockFilter === val ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
                color: blockFilter === val ? 'white' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ date: today, amount: '', account: 'Cash', category: 'Rent', description: '', block: '1' }) }}
          style={{ marginLeft:'auto', padding:'8px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'13px', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white' }}>
          + Add Expenditure
        </button>
      </div>

      {/* P&L Summary */}
      <div style={{ background: isProfit ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)', borderRadius:'16px', padding:'20px', border:`1.5px solid ${isProfit ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
        <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'16px' }}>
          {isProfit ? '📈' : '📉'} Profit & Loss
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          {[
            { emoji:'💰', label:'Total Income',       value:`₹${totalIncome.toLocaleString('en-IN')}`,   color:'#4ade80', sub: `Fees + ₹${depositsForfeited.toLocaleString('en-IN')} forfeited deposits` },
            { emoji:'📤', label:'Total Expenditure',  value:`₹${totalExp.toLocaleString('en-IN')}`,      color:'#f87171', sub: `₹${totalManual.toLocaleString('en-IN')} manual + ₹${totalRefunds.toLocaleString('en-IN')} refunds` },
            { emoji: isProfit ? '🟢' : '🔴', label: isProfit ? 'Net Profit' : 'Net Loss', value:`₹${Math.abs(profitLoss).toLocaleString('en-IN')}`, color: isProfit ? '#4ade80' : '#f87171' },
          ].map(c => (
            <div key={c.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'16px 18px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'140px' }}>
              <div style={{ fontSize:'20px', marginBottom:'8px' }}>{c.emoji}</div>
              <div style={{ fontSize:'20px', fontWeight:'800', color:c.color, fontFamily:"'Sora', sans-serif" }}>{c.value}</div>
              <div style={{ color:'#64748b', fontSize:'12px', marginTop:'4px', fontWeight:'600' }}>{c.label}</div>
              {c.sub && <div style={{ color:'#475569', fontSize:'10px', marginTop:'2px' }}>{c.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      {catEntries.length > 0 && (
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif", marginBottom:'14px' }}>🏷️ By Category</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {catEntries.map(([cat, amt], i) => {
              const pct = Math.round((amt / totalManual) * 100)
              const color = PALETTE[i % PALETTE.length]
              return (
                <div key={cat}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <span style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{cat}</span>
                    <span style={{ color, fontWeight:'800', fontSize:'13px' }}>₹{amt.toLocaleString('en-IN')} <span style={{ color:'#475569', fontWeight:'500', fontSize:'11px' }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:'5px', borderRadius:'3px', background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, borderRadius:'3px', background:color, transition:'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
            {filteredRefunds.length > 0 && (
              <div style={{ marginTop:'4px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'700' }}>↩️ Fee Refunds (auto)</span>
                  <span style={{ color:'#f87171', fontWeight:'800', fontSize:'13px' }}>₹{totalRefunds.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collections — period breakdown */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <div style={{ fontWeight:'800', fontSize:'16px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>📅 Expenditure History</div>
          <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.06)', padding:'4px', borderRadius:'10px' }}>
            {(['month','week'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setExpandedPeriod(null) }}
                style={{ padding:'5px 12px', borderRadius:'7px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'700', fontSize:'12px',
                  background: view === v ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
                  color: view === v ? 'white' : '#64748b' }}>
                {v === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {sortedKeys.length === 0 && <p style={{ color:'#475569', fontSize:'13px' }}>No expenditure data yet</p>}
          {sortedKeys.map(key => {
            const grp      = groups[key]
            const manTotal = grp.manual.reduce((s, e) => s + Number(e.amount), 0)
            const refTotal = grp.refunds.reduce((s, r) => s + r.amount, 0)
            const total    = manTotal + refTotal
            const isOpen   = expandedPeriod === key
            const isFuture = key > nowKey
            const label    = view === 'month'
              ? format(new Date(key + '-01'), 'MMMM yyyy') + (isFuture ? ' 🔮' : '')
              : `Week of ${format(new Date(key), 'dd MMM yyyy')}` + (isFuture ? ' 🔮' : '')

            return (
              <div key={key}>
                <div onClick={() => setExpandedPeriod(isOpen ? null : key)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', borderRadius:'11px', background: isOpen ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)', border:`1px solid ${isOpen ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`, cursor:'pointer', transition:'all 0.15s' }}>
                  <div>
                    <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{label}</div>
                    <div style={{ color:'#64748b', fontSize:'11px', marginTop:'1px' }}>
                      {grp.manual.length} entries{refTotal > 0 ? ` · ↩️ ₹${refTotal.toLocaleString('en-IN')} refunds` : ''}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ color:'#f87171', fontWeight:'800', fontSize:'15px', fontFamily:"'Sora', sans-serif" }}>₹{total.toLocaleString('en-IN')}</div>
                    <div style={{ color:'#64748b', fontSize:'16px', transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>›</div>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop:'6px', marginLeft:'8px', display:'flex', flexDirection:'column', gap:'5px', animation:'fadeIn 0.2s ease' }}>
                    {/* Manual entries */}
                    {grp.manual.map((e, i) => (
                      <div key={e.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                          <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`rgba(239,68,68,0.15)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>
                            {e.category === 'Rent' ? '🏠' : e.category === 'Electricity' ? '⚡' : e.category === 'Salaries' ? '👷' : e.category === 'Maintenance' ? '🔧' : e.category === 'Supplies' ? '📦' : e.category === 'Internet' ? '🌐' : '💸'}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>{e.category}</div>
                            <div style={{ color:'#64748b', fontSize:'11px' }}>
                              {e.account} · {format(new Date(e.date), 'dd MMM yyyy')}
                              {e.block && <span style={{ color:'#475569' }}> · Block {e.block}</span>}
                            </div>
                            {e.description && <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                          <div style={{ color:'#f87171', fontWeight:'800', fontSize:'14px' }}>-₹{Number(e.amount).toLocaleString('en-IN')}</div>
                          <button onClick={() => handleEdit(e)} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'#94a3b8', fontSize:'11px', fontFamily:'inherit' }}>✏️</button>
                          <button onClick={() => handleDelete(e.id)} style={{ background:'rgba(239,68,68,0.1)', border:'none', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'#f87171', fontSize:'11px', fontFamily:'inherit' }}>🗑</button>
                        </div>
                      </div>
                    ))}
                    {/* Auto refund entries */}
                    {grp.refunds.map((r, i) => (
                      <div key={`ref-${i}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'10px', background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.1)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                          <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>↩️</div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'700' }}>Fee Refund — {r.student.name}</div>
                            <div style={{ color:'#64748b', fontSize:'11px' }}>
                              {r.account} · {format(new Date(r.date), 'dd MMM yyyy')} · Block {r.block}
                            </div>
                          </div>
                        </div>
                        <div style={{ color:'#f87171', fontWeight:'800', fontSize:'14px', flexShrink:0 }}>-₹{r.amount.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:'480px', background:'#1e293b', borderRadius:'24px 24px 0 0', border:'1.5px solid rgba(255,255,255,0.1)', padding:'24px 20px 32px', display:'flex', flexDirection:'column', gap:'14px', fontFamily:"'Nunito', sans-serif" }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'4px' }}>
              <div style={{ fontWeight:'800', fontSize:'18px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>{editingId ? '✏️ Edit Expenditure' : '➕ Add Expenditure'}</div>
              <button onClick={() => setShowForm(false)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'18px' }}>×</button>
            </div>

            {/* Category pills */}
            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Category *</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => set('category', cat)}
                    style={{ padding:'6px 14px', borderRadius:'20px', border:`2px solid ${form.category === cat ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`, cursor:'pointer', background: form.category === cat ? 'rgba(99,102,241,0.2)' : 'transparent', color: form.category === cat ? '#a5b4fc' : '#64748b', fontWeight:'700', fontSize:'12px', fontFamily:'inherit', transition:'all 0.15s' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Amount */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Date *</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Amount (₹) *</label>
                <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" style={inp} />
              </div>
            </div>

            {/* Account + Block */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Account *</label>
                <select value={form.account} onChange={e => set('account', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Block</label>
                <select value={form.block} onChange={e => set('block', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="1">Block 1</option>
                  <option value="2">Block 2</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Description</label>
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional note…" style={inp} />
            </div>

            <button onClick={handleSave} disabled={saving || !form.amount}
              style={{ padding:'14px', borderRadius:'12px', border:'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'15px', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white', opacity: saving || !form.amount ? 0.6 : 1, transition:'opacity 0.2s' }}>
              {saving ? 'Saving…' : editingId ? '✅ Update' : '✅ Save Expenditure'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
