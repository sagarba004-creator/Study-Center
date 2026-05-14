'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student, StudentLocker, getLockerStatus } from '@/lib/types'
import { format, differenceInDays, addMonths } from 'date-fns'

interface Props {
  students: Student[]
  canEdit: boolean
  isAdmin: boolean
  onRefresh?: () => void
}

const LOCKER_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1)

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  vacant:     { background:'rgba(34,197,94,0.2)',   border:'2px solid rgba(34,197,94,0.5)',   color:'#4ade80' },
  occupied:   { background:'rgba(249,168,212,0.2)', border:'2px solid rgba(249,168,212,0.5)', color:'#f9a8d4' },
  'due-soon': { background:'rgba(253,224,71,0.2)',  border:'2px solid rgba(253,224,71,0.5)',  color:'#fde047' },
  overdue:    { background:'rgba(239,68,68,0.5)',   border:'2px solid rgba(239,68,68,0.8)',   color:'#fff'    },
}

const inp: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'9px',
  border:'1.5px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)',
  color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
}

const accounts = ['Account 1','Account 2','Cash','UPI','Other']

export default function LockerGrid({ students, canEdit, isAdmin, onRefresh }: Props) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<StudentLocker[]>([])
  const [selected, setSelected]       = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [panel, setPanel]             = useState<'detail' | 'assign' | 'vacate'>('detail')

  // Form state for assign
  const [assignStudentId, setAssignStudentId]   = useState('')
  const [assignAmount, setAssignAmount]         = useState('')
  const [assignAccount, setAssignAccount]       = useState('Account 1')
  const [assignDate, setAssignDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [assignDueDate, setAssignDueDate]       = useState('')
  const [assignDuration, setAssignDuration]     = useState('1m')
  const [assignLoading, setAssignLoading]       = useState(false)
  const [assignError, setAssignError]           = useState('')

  // Form state for vacate
  const [vacateLoading, setVacateLoading] = useState(false)

  const DURATION_OPTIONS = [
    { label:'1 Day', value:'1d' }, { label:'3 Days', value:'3d' },
    { label:'7 Days', value:'7d' }, { label:'15 Days', value:'15d' },
    { label:'1 Month', value:'1m' }, { label:'2 Months', value:'2m' },
    { label:'3 Months', value:'3m' }, { label:'6 Months', value:'6m' },
    { label:'1 Year', value:'1y' },
  ]

  const calcDue = (from: string, dur: string) => {
    if (!from || !dur) return ''
    const base = new Date(from)
    const val  = parseInt(dur)
    const unit = dur.slice(-1)
    let d: Date
    if (unit === 'd') d = new Date(base.getTime() + val * 86400000)
    else if (unit === 'm') d = addMonths(base, val)
    else d = addMonths(base, val * 12)
    return format(d, 'yyyy-MM-dd')
  }

  useEffect(() => {
    setAssignDueDate(calcDue(assignDate, assignDuration))
  }, [assignDate, assignDuration])

  const load = useCallback(async () => {
    const { data } = await supabase.from('student_lockers').select('*').eq('is_active', true)
    if (data) setAssignments(data as StudentLocker[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getAssignment = (n: number) => assignments.find(a => a.locker_number === n)

  const handleSelect = (n: number) => {
    setSelected(n)
    setPanel('detail')
    setAssignError('')
    // Reset form
    const asgn = getAssignment(n)
    if (!asgn) {
      setAssignStudentId('')
      setAssignAmount('')
      setAssignAccount('Account 1')
      setAssignDate(format(new Date(), 'yyyy-MM-dd'))
      setAssignDuration('1m')
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !assignStudentId) return
    setAssignLoading(true); setAssignError('')

    // Find student to get due_date
    const student = students.find(s => s.id === assignStudentId)
    const due = assignDueDate || (student ? student.due_date : '')

    const { error } = await supabase.from('student_lockers').insert({
      locker_number:  selected,
      student_id:     assignStudentId,
      amount:         Number(assignAmount),
      account:        assignAccount,
      assigned_date:  assignDate,
      due_date:       due,
      is_active:      true,
    })
    if (error) { setAssignError(error.message); setAssignLoading(false) }
    else { await load(); setPanel('detail'); setAssignLoading(false); onRefresh?.() }
  }

  const handleVacate = async () => {
    const asgn = selected ? getAssignment(selected) : null
    if (!asgn) return
    setVacateLoading(true)
    await supabase.from('student_lockers').update({ is_active: false, vacated_at: new Date().toISOString() }).eq('id', asgn.id)
    await load(); setPanel('detail'); setVacateLoading(false); onRefresh?.()
  }

  // Stats
  const occupied  = assignments.length
  const vacant    = 30 - occupied
  const overdue   = assignments.filter(a => getLockerStatus(a) === 'overdue').length
  const dueSoon   = assignments.filter(a => getLockerStatus(a) === 'due-soon').length

  // Eligible students — only fixed and flexible (not viewers)
  const eligibleStudents = students.filter(s => !s.is_flexible || s.seat_number !== null || s.is_flexible)

  if (loading) return <div style={{ color:'#475569', fontSize:'13px', padding:'20px' }}>Loading lockers…</div>

  const selectedAsgn    = selected ? (getAssignment(selected) ?? null) : null
  const selectedStudent = selectedAsgn ? students.find(s => s.id === selectedAsgn.student_id) : null
  const selectedStatus  = selected ? getLockerStatus(selectedAsgn ?? undefined) : 'vacant' as const
  const today           = new Date()
  const daysLeft        = selectedAsgn ? differenceInDays(new Date(selectedAsgn.due_date), today) : null

  return (
    <div style={{ marginTop:'20px' }}>
      {/* Header + stats */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'15px', color:'#e2e8f0' }}>🔒 Lockers</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {[
            { label:`${vacant} free`,   color:'#4ade80', bg:'rgba(34,197,94,0.12)'   },
            { label:`${occupied} used`, color:'#f9a8d4', bg:'rgba(249,168,212,0.12)' },
            ...(dueSoon > 0  ? [{ label:`${dueSoon} due soon`,  color:'#fde047', bg:'rgba(253,224,71,0.12)'  }] : []),
            ...(overdue > 0  ? [{ label:`${overdue} overdue`,   color:'#f87171', bg:'rgba(239,68,68,0.12)'   }] : []),
          ].map(s => (
            <span key={s.label} style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', color:s.color, background:s.bg }}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'16px' }}>
        {LOCKER_NUMBERS.map(n => {
          const asgn   = getAssignment(n)
          const status = getLockerStatus(asgn)
          const style  = STATUS_STYLE[status]
          const isSelected = selected === n
          return (
            <div key={n} onClick={() => handleSelect(n)}
              style={{ ...style, width:'44px', height:'40px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', cursor:'pointer', fontFamily:"'Sora', sans-serif", transition:'all 0.15s', outline: isSelected ? '2px solid white' : 'none', outlineOffset:'2px' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {n}
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected !== null && (
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', border:'1.5px solid rgba(255,255,255,0.1)', overflow:'hidden' }}>
          {/* Panel header */}
          <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ color:'#475569', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em' }}>Locker</div>
              <div style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', fontFamily:"'Sora', sans-serif", display:'flex', alignItems:'center', gap:'8px' }}>
                #{selected}
                <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:STATUS_STYLE[selectedStatus].background, border:STATUS_STYLE[selectedStatus].border, color:STATUS_STYLE[selectedStatus].color }}>
                  {selectedStatus === 'vacant' ? 'Vacant' : selectedStatus === 'occupied' ? 'Occupied' : selectedStatus === 'due-soon' ? 'Due Soon' : 'Overdue'}
                </span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'28px', height:'28px', cursor:'pointer', color:'#94a3b8', fontSize:'16px' }}>×</button>
          </div>

          <div style={{ padding:'14px 16px' }}>

            {/* VACANT */}
            {selectedStatus === 'vacant' && panel !== 'assign' && (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:'36px', marginBottom:'10px' }}>🔓</div>
                <p style={{ color:'#64748b', fontSize:'13px', marginBottom:'16px' }}>Locker #{selected} is available</p>
                {canEdit && (
                  <button onClick={() => setPanel('assign')} style={{ padding:'10px 24px', borderRadius:'10px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white', fontSize:'13px', fontWeight:'700', fontFamily:'inherit' }}>
                    + Assign Locker
                  </button>
                )}
              </div>
            )}

            {/* OCCUPIED — detail */}
            {selectedStatus !== 'vacant' && selectedStudent && panel === 'detail' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {/* Student info */}
                <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'rgba(255,255,255,0.04)', padding:'10px 12px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'16px', color:'white', flexShrink:0 }}>
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'14px' }}>{selectedStudent.name}</div>
                    <div style={{ color:'#64748b', fontSize:'11px' }}>{selectedStudent.phone || ''} · B{selectedStudent.block}{selectedStudent.seat_number ? `, Seat ${selectedStudent.seat_number}` : ''}</div>
                  </div>
                </div>

                {/* Due date */}
                <div style={{ background: daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.1)' : daysLeft !== null && daysLeft <= 2 ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.08)', borderRadius:'10px', padding:'12px 14px', border:`1px solid ${daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.25)' : daysLeft !== null && daysLeft <= 2 ? 'rgba(251,191,36,0.25)' : 'rgba(99,102,241,0.2)'}` }}>
                  <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>📅 Due Date</div>
                  <div style={{ fontSize:'16px', fontWeight:'800', color: daysLeft !== null && daysLeft < 0 ? '#f87171' : daysLeft !== null && daysLeft <= 2 ? '#fde047' : '#a5b4fc', fontFamily:"'Sora', sans-serif" }}>
                    {format(new Date(selectedAsgn!.due_date), 'dd MMMM yyyy')}
                  </div>
                  <div style={{ color:'#94a3b8', fontSize:'11px', marginTop:'2px' }}>
                    {daysLeft !== null && (daysLeft < 0 ? `⚠️ ${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? '⚠️ Due today' : `✅ ${daysLeft}d remaining`)}
                  </div>
                </div>

                {/* Financial info — staff/admin only */}
                {canEdit && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    {[
                      { icon:'📅', label:'Assigned', value: format(new Date(selectedAsgn!.assigned_date), 'dd MMM yyyy') },
                      { icon:'💰', label:'Amount',   value: `₹${Number(selectedAsgn!.amount).toLocaleString('en-IN')}` },
                      { icon:'🏦', label:'Account',  value: selectedAsgn!.account },
                    ].map(({ icon, label, value }) => (
                      <div key={label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'9px', padding:'10px 12px', border:'1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>{icon} {label}</div>
                        <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'4px' }}>
                    <button onClick={() => setPanel('assign')} style={{ padding:'10px', borderRadius:'10px', border:'1px solid rgba(99,102,241,0.35)', background:'rgba(99,102,241,0.1)', color:'#a5b4fc', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>
                      🔄 Reassign
                    </button>
                    <button onClick={() => setPanel('vacate')} style={{ padding:'10px', borderRadius:'10px', border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>
                      🔓 Release
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ASSIGN FORM */}
            {panel === 'assign' && canEdit && (
              <div className="animate-fadeIn">
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
                  <button onClick={() => setPanel('detail')} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'7px', width:'28px', height:'28px', cursor:'pointer', color:'#94a3b8', fontSize:'14px' }}>←</button>
                  <div style={{ fontWeight:'700', fontSize:'14px', color:'#f1f5f9' }}>Assign Locker #{selected}</div>
                </div>

                <form onSubmit={handleAssign} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {/* Student picker */}
                  <div>
                    <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Student *</label>
                    <select required value={assignStudentId} onChange={e => {
                      setAssignStudentId(e.target.value)
                      // Auto-fill due date from student's seat due date
                      const s = students.find(st => st.id === e.target.value)
                      if (s) setAssignDueDate(s.due_date)
                    }} style={{ ...inp, cursor:'pointer' }}>
                      <option value="">Select student</option>
                      {eligibleStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — B{s.block}{s.seat_number ? `, Seat ${s.seat_number}` : ' (Flex)'} · Due {new Date(s.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration pills */}
                  <div>
                    <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Duration *</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                      {DURATION_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" onClick={() => setAssignDuration(opt.value)}
                          style={{ padding:'6px 12px', borderRadius:'20px', border:`2px solid ${assignDuration === opt.value ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`, cursor:'pointer', background: assignDuration === opt.value ? 'rgba(99,102,241,0.2)' : 'transparent', color: assignDuration === opt.value ? '#a5b4fc' : '#64748b', fontWeight:'700', fontSize:'11px', fontFamily:'inherit' }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date + auto due */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div>
                      <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>From Date *</label>
                      <input type="date" required value={assignDate} onChange={e => setAssignDate(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Due Date (auto)</label>
                      <div style={{ padding:'10px 12px', borderRadius:'9px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#a5b4fc', fontWeight:'700', fontSize:'12px', fontFamily:"'Sora', sans-serif" }}>
                        {assignDueDate ? new Date(assignDueDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Amount + account */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div>
                      <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Amount (₹) *</label>
                      <input type="number" required min={0} value={assignAmount} onChange={e => setAssignAmount(e.target.value)} placeholder="0" style={inp} />
                    </div>
                    <div>
                      <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>Account *</label>
                      <select required value={assignAccount} onChange={e => setAssignAccount(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>

                  {assignError && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'9px', padding:'10px', color:'#f87171', fontSize:'12px' }}>⚠️ {assignError}</div>}

                  <div style={{ display:'flex', gap:'8px' }}>
                    <button type="button" onClick={() => setPanel('detail')} style={{ flex:1, padding:'11px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)', background:'transparent', color:'#94a3b8', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                    <button type="submit" disabled={assignLoading} style={{ flex:2, padding:'11px', borderRadius:'10px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white', fontSize:'12px', fontWeight:'800', opacity: assignLoading ? 0.7 : 1, fontFamily:'inherit' }}>
                      {assignLoading ? 'Assigning…' : '✅ Assign Locker'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* VACATE CONFIRM */}
            {panel === 'vacate' && (
              <div className="animate-fadeIn" style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ fontSize:'36px', marginBottom:'10px' }}>🔓</div>
                <div style={{ fontWeight:'800', fontSize:'15px', color:'#f1f5f9', marginBottom:'6px' }}>Release Locker #{selected}?</div>
                <div style={{ color:'#64748b', fontSize:'13px', marginBottom:'20px' }}>
                  <span style={{ color:'#f1f5f9', fontWeight:'700' }}>{selectedStudent?.name}</span> will lose access to this locker.
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setPanel('detail')} style={{ flex:1, padding:'11px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)', background:'transparent', color:'#94a3b8', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                  <button onClick={handleVacate} disabled={vacateLoading} style={{ flex:1, padding:'11px', borderRadius:'10px', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.8)', color:'white', fontSize:'12px', fontWeight:'800', opacity: vacateLoading ? 0.7 : 1, fontFamily:'inherit' }}>
                    {vacateLoading ? 'Releasing…' : '🔓 Release'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
