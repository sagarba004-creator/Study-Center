'use client'
import { useState, useEffect } from 'react'
import { Student } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { addMonths, format } from 'date-fns'

interface Props {
  block: number
  seatNumber: number
  student?: Student | null
  onClose: () => void
  onSaved: () => void
}

const inp: React.CSSProperties = {
  width:'100%', padding:'11px 14px', borderRadius:'10px',
  border:'1.5px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)',
  color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
}

const sel: React.CSSProperties = { ...inp, cursor:'pointer' }

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>{children}</label>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export default function StudentForm({ block, seatNumber, student, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    name: student?.name || '',
    exam: student?.exam || '',
    insider_outsider: student?.insider_outsider || 'insider',
    address: student?.address || '',
    college: student?.college || '',
    duration_months: student?.duration_months || 1,
    payment_date: student?.payment_date || today,
    amount: student?.amount || '',
    account: student?.account || '',
    joining_date: student?.joining_date || today,
    due_date: student?.due_date || '',
  })

  useEffect(() => {
    if (form.joining_date && form.duration_months) {
      const due = addMonths(new Date(form.joining_date), Number(form.duration_months))
      setForm(f => ({ ...f, due_date: format(due, 'yyyy-MM-dd') }))
    }
  }, [form.joining_date, form.duration_months])

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    // First vacate any existing active student in this seat
    if (!student?.id) {
      await supabase.from('students').update({ is_active: false })
        .eq('block', block).eq('seat_number', seatNumber).eq('is_active', true)
    }

    const payload = { ...form, amount: Number(form.amount), duration_months: Number(form.duration_months), block, seat_number: seatNumber, is_active: true }
    const res = student?.id
      ? await supabase.from('students').update(payload).eq('id', student.id)
      : await supabase.from('students').insert(payload)

    if (res.error) { setError(res.error.message); setLoading(false) }
    else onSaved()
  }

  const exams    = ['UPSC','MPSC','NEET','JEE','CA','CET','Banking','Railway','SSC','GATE','IAS','IPS','Other']
  const accounts = ['Account 1','Account 2','Cash','UPI','Other']

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="animate-slideUp" style={{
        width:'100%', maxWidth:'500px', background:'#1e293b', borderRadius:'24px',
        border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
        overflow:'hidden', maxHeight:'93vh', overflowY:'auto', fontFamily:"'Nunito', sans-serif"
      }}>
        {/* Header */}
        <div style={{ padding:'22px 24px 18px', background:'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:'14px', right:'16px', background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'white', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>Block {block} · Seat {seatNumber}</div>
          <h2 style={{ color:'white', fontSize:'22px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>
            {student ? '✏️ Edit Student' : '➕ Assign Student'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:'20px 24px 24px', display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Name */}
          <Field label="Full Name *">
            <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Student full name" style={inp} />
          </Field>

          {/* Exam + Type */}
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

          {/* College */}
          <Field label="College / Institution *">
            <input required value={form.college} onChange={e => set('college', e.target.value)} placeholder="College or institution name" style={inp} />
          </Field>

          {/* Address */}
          <Field label="Complete Address (as per Aadhaar) *">
            <textarea required value={form.address} onChange={e => set('address', e.target.value)} rows={3}
              placeholder="Full address as on Aadhaar card — house no., street, area, city, state, pincode"
              style={{ ...inp, resize:'vertical', lineHeight:'1.5' }} />
          </Field>

          {/* Joining + Duration */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Field label="Joining Date *">
              <input type="date" required value={form.joining_date} onChange={e => set('joining_date', e.target.value)} style={inp} />
            </Field>
            <Field label="Duration (months) *">
              <input type="number" required min={1} max={24} value={form.duration_months} onChange={e => set('duration_months', parseInt(e.target.value))} style={inp} />
            </Field>
          </div>

          {/* Auto Due Date */}
          <div style={{ background:'rgba(99,102,241,0.1)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(99,102,241,0.25)' }}>
            <div style={{ color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>📅 Due Date (auto-calculated)</div>
            <div style={{ color:'#a5b4fc', fontSize:'16px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>
              {form.due_date ? new Date(form.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—'}
            </div>
          </div>

          {/* Payment Date + Amount */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Field label="Payment Date *">
              <input type="date" required value={form.payment_date} onChange={e => set('payment_date', e.target.value)} style={inp} />
            </Field>
            <Field label="Amount (₹) *">
              <input type="number" required min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" style={inp} />
            </Field>
          </div>

          {/* Account */}
          <Field label="Payment Account *">
            <select required value={form.account} onChange={e => set('account', e.target.value)} style={sel}>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>

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
              background:'linear-gradient(135deg, #6366f1, #ec4899)', color:'white', fontSize:'14px', fontWeight:'800',
              opacity: loading ? 0.7 : 1, fontFamily:'inherit', boxShadow:'0 8px 20px rgba(99,102,241,0.35)'
            }}>
              {loading ? 'Saving…' : student ? '✅ Save Changes' : '✅ Assign Seat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
