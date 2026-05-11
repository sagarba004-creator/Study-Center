'use client'
import { useState, useEffect } from 'react'
import { Student } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { addDays, addMonths, addYears, format } from 'date-fns'

interface Props {
  block: number
  seatNumber?: number | null
  student?: Student | null
  isFlexible?: boolean
  onClose: () => void
  onSaved: () => void
}

const inp: React.CSSProperties = {
  width:'100%', padding:'11px 14px', borderRadius:'10px',
  border:'1.5px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)',
  color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
}
const sel: React.CSSProperties = { ...inp, cursor:'pointer' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>{label}</label>
      {children}
    </div>
  )
}

// Duration options with label and calculator
const DURATION_OPTIONS = [
  { label: '1 Day',    value: '1d'  },
  { label: '3 Days',   value: '3d'  },
  { label: '7 Days',   value: '7d'  },
  { label: '15 Days',  value: '15d' },
  { label: '1 Month',  value: '1m'  },
  { label: '2 Months', value: '2m'  },
  { label: '3 Months', value: '3m'  },
  { label: '6 Months', value: '6m'  },
  { label: '1 Year',   value: '1y'  },
]

function calcDueDate(joiningDate: string, duration: string): string {
  if (!joiningDate || !duration) return ''
  const base = new Date(joiningDate)
  const val  = parseInt(duration)
  const unit = duration.slice(-1)
  let due: Date
  if (unit === 'd') due = addDays(base, val)
  else if (unit === 'm') due = addMonths(base, val)
  else due = addYears(base, val)
  return format(due, 'yyyy-MM-dd')
}

// Convert duration string to months (approx) for DB storage
function durationToMonths(duration: string): number {
  const val  = parseInt(duration)
  const unit = duration.slice(-1)
  if (unit === 'd') return Math.max(1, Math.round(val / 30))
  if (unit === 'm') return val
  return val * 12
}

export default function StudentForm({ block, seatNumber, student, isFlexible = false, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [mode, setMode]               = useState<'new' | 'returning'>('new')
  const [oldStudentSearch, setOldStudentSearch] = useState('')
  const [oldStudents, setOldStudents] = useState<Student[]>([])
  const [searching, setSearching]     = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    name:                    student?.name || '',
    exam:                    student?.exam || '',
    insider_outsider:        student?.insider_outsider || 'insider',
    address:                 student?.address || '',
    college:                 student?.college || '',
    duration:                student ? '1m' : '1m',
    payment_date:            student?.payment_date || today,
    amount:                  student?.amount || '',
    account:                 student?.account || '',
    joining_date:            student?.joining_date || today,
    due_date:                student?.due_date || '',
    security_deposit:        student?.security_deposit ?? 300,
    security_deposit_status: student?.security_deposit_status || 'collected',
  })

  // Recalc due date whenever joining_date or duration changes
  useEffect(() => {
    const due = calcDueDate(form.joining_date, form.duration)
    setForm(f => ({ ...f, due_date: due }))
  }, [form.joining_date, form.duration])

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  // Search old (inactive) students
  useEffect(() => {
    if (!oldStudentSearch || oldStudentSearch.length < 2) { setOldStudents([]); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', false)
        .ilike('name', `%${oldStudentSearch}%`)
        .order('vacated_at', { ascending: false })
        .limit(8)
      setOldStudents((data as Student[]) || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [oldStudentSearch])

  // Pre-fill form from selected old student
  const selectOldStudent = (s: Student) => {
    setForm(f => ({
      ...f,
      name:             s.name,
      exam:             s.exam,
      insider_outsider: s.insider_outsider,
      address:          s.address,
      college:          s.college,
      amount:           s.amount,
      account:          s.account,
      security_deposit:        s.security_deposit,
      security_deposit_status: 'collected',
    }))
    setOldStudentSearch(s.name)
    setOldStudents([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    if (!student?.id && seatNumber) {
      await supabase.from('students').update({ is_active: false })
        .eq('block', block).eq('seat_number', seatNumber).eq('is_active', true)
    }

    const payload: Record<string, unknown> = {
      name:                    form.name,
      exam:                    form.exam,
      insider_outsider:        form.insider_outsider,
      address:                 form.address,
      college:                 form.college,
      duration_months:         durationToMonths(form.duration),
      payment_date:            form.payment_date,
      amount:                  Number(form.amount),
      account:                 form.account,
      joining_date:            form.joining_date,
      due_date:                form.due_date,
      security_deposit:        Number(form.security_deposit),
      security_deposit_status: form.security_deposit_status,
      block,
      is_active:   true,
      is_flexible: isFlexible || !seatNumber,
      seat_number: seatNumber || null,
      vacated_at:  null,
      vacate_notes: null,
    }

    const res = student?.id
      ? await supabase.from('students').update(payload).eq('id', student.id)
      : await supabase.from('students').insert(payload)

    if (res.error) { setError(res.error.message); setLoading(false) }
    else onSaved()
  }

  const exams    = ['UPSC','MPSC','NEET','JEE','CA','CET','Banking','Railway','SSC','GATE','IAS','IPS','Other']
  const accounts = ['Account 1','Account 2','Cash','UPI','Other']
  const isEdit   = !!student?.id
  const flexible = isFlexible || !seatNumber

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="animate-slideUp" style={{
        width:'100%', maxWidth:'500px', background:'#1e293b', borderRadius:'24px',
        border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
        overflow:'hidden', maxHeight:'93vh', overflowY:'auto', fontFamily:"'Nunito', sans-serif"
      }}>
        {/* Header */}
        <div style={{ padding:'22px 24px 18px', background: flexible ? 'linear-gradient(135deg,#0f4c75,#1b6ca8)' : 'linear-gradient(135deg,#6366f1,#ec4899)', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:'14px', right:'16px', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'white', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>
            Block {block} {seatNumber ? `· Seat ${seatNumber}` : '· Flexible Seat'}
          </div>
          <h2 style={{ color:'white', fontSize:'20px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>
            {isEdit ? '✏️ Edit Student' : flexible ? '🔄 Add Flexible Student' : '➕ Assign Student'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'20px 24px 24px', display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* NEW vs RETURNING toggle — only for new assignments */}
          {!isEdit && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {(['new','returning'] as const).map(m => (
                <button key={m} type="button" onClick={() => { setMode(m); setOldStudentSearch(''); setOldStudents([]) }}
                  style={{ padding:'11px', borderRadius:'10px', border:`2px solid ${mode === m ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, cursor:'pointer', background: mode === m ? 'rgba(99,102,241,0.15)' : 'transparent', color: mode === m ? '#a5b4fc' : '#64748b', fontWeight:'700', fontSize:'13px', fontFamily:'inherit', transition:'all 0.15s' }}>
                  {m === 'new' ? '🆕 New Student' : '🔄 Returning Student'}
                </button>
              ))}
            </div>
          )}

          {/* RETURNING STUDENT — search old students */}
          {!isEdit && mode === 'returning' && (
            <div style={{ background:'rgba(99,102,241,0.08)', borderRadius:'12px', padding:'14px', border:'1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ color:'#a5b4fc', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>Search Past Students</div>
              <div style={{ position:'relative' }}>
                <input value={oldStudentSearch} onChange={e => setOldStudentSearch(e.target.value)}
                  placeholder="Type student name to search…"
                  style={{ ...inp, background:'rgba(255,255,255,0.08)' }} />
                {searching && <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', color:'#64748b', fontSize:'12px' }}>…</div>}
              </div>
              {oldStudents.length > 0 && (
                <div style={{ marginTop:'8px', display:'flex', flexDirection:'column', gap:'6px', maxHeight:'180px', overflowY:'auto' }}>
                  {oldStudents.map(s => (
                    <button key={s.id} type="button" onClick={() => selectOldStudent(s)}
                      style={{ padding:'10px 12px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.05)', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                      <div style={{ color:'#f1f5f9', fontWeight:'700', fontSize:'13px' }}>{s.name}</div>
                      <div style={{ color:'#64748b', fontSize:'11px', marginTop:'2px' }}>
                        {s.exam} · {s.college} · Block {s.block}{s.seat_number ? `, Seat ${s.seat_number}` : ''}
                        {s.vacated_at && <span style={{ marginLeft:'8px', color:'#475569' }}>Vacated {new Date(s.vacated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {oldStudentSearch.length >= 2 && !searching && oldStudents.length === 0 && (
                <div style={{ color:'#475569', fontSize:'12px', marginTop:'8px', textAlign:'center' }}>No past students found</div>
              )}
              {form.name && mode === 'returning' && (
                <div style={{ marginTop:'8px', padding:'8px 10px', background:'rgba(74,222,128,0.08)', borderRadius:'8px', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80', fontSize:'12px', fontWeight:'600' }}>
                  ✅ Pre-filled from: {form.name}
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <Field label="Full Name *">
            <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Student full name" style={inp} />
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Field label="Exam *">
              <select required value={form.exam} onChange={e => set('exam', e.target.value)} style={sel}>
                <option value="">Select</option>
                {exams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </Field>
            <Field label="Student Type *">
              <select required value={form.insider_outsider} onChange={e => set('insider_outsider', e.target.value)} style={sel}>
                <option value="insider">📍 Insider (Local)</option>
                <option value="outsider">✈️ Outsider</option>
              </select>
            </Field>
          </div>

          <Field label="College / Institution *">
            <input required value={form.college} onChange={e => set('college', e.target.value)} placeholder="College or institution name" style={inp} />
          </Field>

          <Field label="Complete Address (as per Aadhaar) *">
            <textarea required value={form.address} onChange={e => set('address', e.target.value)} rows={2}
              placeholder="Full address as on Aadhaar card"
              style={{ ...inp, resize:'vertical', lineHeight:'1.5' }} />
          </Field>

          {/* Duration — pill selector */}
          <Field label="Duration *">
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set('duration', opt.value)}
                  style={{ padding:'7px 14px', borderRadius:'20px', border:`2px solid ${form.duration === opt.value ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`, cursor:'pointer', background: form.duration === opt.value ? 'rgba(99,102,241,0.2)' : 'transparent', color: form.duration === opt.value ? '#a5b4fc' : '#64748b', fontWeight:'700', fontSize:'12px', fontFamily:'inherit', transition:'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Field label="Joining Date *">
              <input type="date" required value={form.joining_date} onChange={e => set('joining_date', e.target.value)} style={inp} />
            </Field>
            {/* Auto due date */}
            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Due Date (auto)</label>
              <div style={{ padding:'11px 14px', borderRadius:'10px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#a5b4fc', fontWeight:'800', fontSize:'13px', fontFamily:"'Sora', sans-serif" }}>
                {form.due_date ? new Date(form.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Field label="Payment Date *">
              <input type="date" required value={form.payment_date} onChange={e => set('payment_date', e.target.value)} style={inp} />
            </Field>
            <Field label="Amount (₹) *">
              <input type="number" required min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" style={inp} />
            </Field>
          </div>

          <Field label="Payment Account *">
            <select required value={form.account} onChange={e => set('account', e.target.value)} style={sel}>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>

          {/* Security Deposit */}
          <div style={{ background:'rgba(251,191,36,0.08)', borderRadius:'12px', padding:'14px 16px', border:'1px solid rgba(251,191,36,0.2)' }}>
            <div style={{ color:'#fde047', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>🔐 Security Deposit</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Amount (₹)</label>
                <input type="number" min={0} value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} style={inp} placeholder="300" />
              </div>
              <div>
                <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Status</label>
                <select value={form.security_deposit_status} onChange={e => set('security_deposit_status', e.target.value)} style={sel}>
                  <option value="none">Not Collected</option>
                  <option value="collected">✅ Collected</option>
                </select>
              </div>
            </div>
            <div style={{ color:'#94a3b8', fontSize:'11px', marginTop:'8px' }}>
              {form.security_deposit_status === 'collected'
                ? `💡 ₹${Number(form.security_deposit).toLocaleString('en-IN')} collected — refund/forfeit handled at vacating`
                : 'No deposit collected for this student'}
            </div>
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'12px', color:'#f87171', fontSize:'13px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'13px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)', background:'transparent', color:'#94a3b8', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              flex:2, padding:'13px', borderRadius:'10px', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: flexible ? 'linear-gradient(135deg,#0f4c75,#1b6ca8)' : 'linear-gradient(135deg,#6366f1,#ec4899)',
              color:'white', fontSize:'14px', fontWeight:'800', opacity: loading ? 0.7 : 1, fontFamily:'inherit'
            }}>
              {loading ? 'Saving…' : isEdit ? '✅ Save Changes' : mode === 'returning' ? '🔄 Re-assign Student' : flexible ? '✅ Add Flexible Student' : '✅ Assign Seat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
