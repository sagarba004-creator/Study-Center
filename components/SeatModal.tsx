'use client'
import { Student, SeatStatus, SeatWithStudent } from '@/lib/types'
import { format, differenceInDays, addMonths } from 'date-fns'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  student: Student | null
  seatNumber: number
  block: number
  status: SeatStatus
  isAdmin: boolean
  canEdit: boolean
  canVacate: boolean
  allSeats: SeatWithStudent[]   // for seat transfer
  onClose: () => void
  onAddStudent: () => void
  onEditStudent: () => void
  onVacateSeat: () => void
  onRefresh: () => void
}

const STATUS_CONFIG = {
  vacant:     { label:'Vacant',   bg:'rgba(34,197,94,0.15)',  border:'rgba(34,197,94,0.4)',  text:'#4ade80' },
  occupied:   { label:'Occupied', bg:'rgba(99,102,241,0.15)', border:'rgba(99,102,241,0.4)', text:'#a5b4fc' },
  'due-soon': { label:'Due Soon', bg:'rgba(251,191,36,0.15)', border:'rgba(251,191,36,0.4)', text:'#fde047' },
  overdue:    { label:'Overdue',  bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.4)',  text:'#f87171' },
}

function InfoBox({ label, value, icon }: { label:string; value:string; icon:string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>{icon} {label}</div>
      <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{value}</div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width:'100%', padding:'11px 14px', borderRadius:'10px',
  border:'1.5px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.07)',
  color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
}

type Panel = 'main' | 'renew' | 'vacate' | 'transfer'

export default function SeatModal({ student, seatNumber, block, status, isAdmin, canEdit, canVacate, allSeats, onClose, onAddStudent, onEditStudent, onVacateSeat, onRefresh }: Props) {
  const supabase = createClient()
  const cfg      = STATUS_CONFIG[status]
  const today    = new Date()
  const dueDate  = student ? new Date(student.due_date) : null
  const daysLeft = dueDate ? differenceInDays(dueDate, today) : null
  const [panel, setPanel] = useState<Panel>('main')

  // Renew state
  const [renewMonths, setRenewMonths]   = useState(1)
  const [renewAmount, setRenewAmount]   = useState('')
  const [renewAccount, setRenewAccount] = useState(student?.account || '')
  const [renewDue, setRenewDue]         = useState('')
  const [renewLoading, setRenewLoading] = useState(false)
  const [renewError, setRenewError]     = useState('')

  // Transfer state
  const [transferBlock, setTransferBlock]   = useState<1|2>(block as 1|2)
  const [transferSeat, setTransferSeat]     = useState<number | ''>('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError]   = useState('')

  // Vacate state
  const [vacateLoading, setVacateLoading] = useState(false)

  const accounts = ['Account 1','Account 2','Cash','UPI','Other']

  useEffect(() => {
    if (!student) return
    const base = daysLeft !== null && daysLeft < 0 ? new Date() : new Date(student.due_date)
    setRenewDue(format(addMonths(base, Number(renewMonths)), 'yyyy-MM-dd'))
  }, [renewMonths, student])

  // Vacant seats for transfer
  const vacantSeats = allSeats.filter(s =>
    s.status === 'vacant' &&
    s.block === transferBlock &&
    !(s.block === block && s.seat_number === seatNumber)
  ).sort((a, b) => a.seat_number - b.seat_number)

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) return
    setRenewLoading(true); setRenewError('')
    const { error } = await supabase.from('students').update({
      due_date:        renewDue,
      duration_months: student.duration_months + Number(renewMonths),
      payment_date:    format(new Date(), 'yyyy-MM-dd'),
      amount:          Number(renewAmount),
      account:         renewAccount,
    }).eq('id', student.id)
    if (error) { setRenewError(error.message); setRenewLoading(false) }
    else { onRefresh(); onClose() }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student || !transferSeat) return
    setTransferLoading(true); setTransferError('')

    // Vacate any student in target seat first
    await supabase.from('students').update({ is_active: false })
      .eq('block', transferBlock).eq('seat_number', transferSeat).eq('is_active', true)

    // Move student to new seat
    const { error } = await supabase.from('students').update({
      block:       transferBlock,
      seat_number: transferSeat,
      is_flexible: false,
    }).eq('id', student.id)

    if (error) { setTransferError(error.message); setTransferLoading(false) }
    else { onRefresh(); onClose() }
  }

  const handleVacate = async () => {
    if (!student) return
    setVacateLoading(true)
    await supabase.from('students').update({ is_active: false }).eq('id', student.id)
    onRefresh(); onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="animate-slideUp" style={{
        width:'100%', maxWidth:'440px', background:'#1e293b', borderRadius:'24px',
        border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
        overflow:'hidden', maxHeight:'92vh', overflowY:'auto', fontFamily:"'Nunito', sans-serif"
      }}>
        {/* HEADER */}
        <div style={{ padding:'20px 22px 16px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          <div style={{ color:'#475569', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'5px' }}>Block {block}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
            <div style={{ fontSize:'24px', fontWeight:'800', color:'#f1f5f9', fontFamily:"'Sora', sans-serif" }}>Seat {seatNumber}</div>
            <span style={{ padding:'3px 11px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.text }}>
              {cfg.label}
              {daysLeft !== null && daysLeft <= 2 && status !== 'vacant' && (
                <span style={{ marginLeft:'5px' }}>
                  {daysLeft < 0 ? `(${Math.abs(daysLeft)}d overdue)` : daysLeft === 0 ? '(Today)' : `(${daysLeft}d left)`}
                </span>
              )}
            </span>
          </div>
        </div>

        <div style={{ padding:'16px 20px 20px' }}>

          {/* ── VACANT ── */}
          {status === 'vacant' && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>🪑</div>
              <p style={{ color:'#64748b', marginBottom:'20px', fontSize:'14px' }}>This seat is available</p>
              {canEdit
                ? <button onClick={onAddStudent} style={{ padding:'12px 28px', borderRadius:'12px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white', fontSize:'14px', fontWeight:'700', fontFamily:'inherit', boxShadow:'0 8px 20px rgba(99,102,241,0.35)' }}>+ Assign Student</button>
                : <div style={{ color:'#475569', fontSize:'13px' }}>View only — contact staff to assign</div>
              }
            </div>
          )}

          {/* ── MAIN PANEL ── */}
          {status !== 'vacant' && student && panel === 'main' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {/* Name */}
              <div style={{ display:'flex', alignItems:'center', gap:'13px', background:'rgba(255,255,255,0.04)', padding:'13px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'13px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'19px', fontWeight:'800', color:'white', flexShrink:0, fontFamily:"'Sora', sans-serif" }}>
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:'800', fontSize:'15px', color:'#f1f5f9' }}>{student.name}</div>
                  <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px' }}>{student.insider_outsider === 'insider' ? '📍 Local' : '✈️ Outstation'}</div>
                </div>
              </div>

              {/* Due date */}
              <div style={{ background: daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.1)' : daysLeft !== null && daysLeft <= 2 ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.08)', borderRadius:'12px', padding:'13px 15px', border:`1px solid ${daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.25)' : daysLeft !== null && daysLeft <= 2 ? 'rgba(251,191,36,0.25)' : 'rgba(99,102,241,0.2)'}` }}>
                <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>📅 Due Date</div>
                <div style={{ fontSize:'18px', fontWeight:'800', color: daysLeft !== null && daysLeft < 0 ? '#f87171' : daysLeft !== null && daysLeft <= 2 ? '#fde047' : '#a5b4fc', fontFamily:"'Sora', sans-serif" }}>
                  {format(new Date(student.due_date), 'dd MMMM yyyy')}
                </div>
                <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'3px' }}>
                  {daysLeft !== null && (daysLeft < 0 ? `⚠️ ${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? '⚠️ Due today!' : `✅ ${daysLeft} days remaining`)}
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <InfoBox icon="📖" label="Exam"     value={student.exam} />
                <InfoBox icon="🎓" label="College"  value={student.college} />
                <InfoBox icon="📅" label="Joined"   value={format(new Date(student.joining_date), 'dd MMM yyyy')} />
                <InfoBox icon="⏱️" label="Duration" value={`${student.duration_months} month${student.duration_months > 1 ? 's' : ''}`} />
              </div>

              {/* Payment — admin + staff */}
              {canEdit && (
                <>
                  <InfoBox icon="📍" label="Address (Aadhaar)" value={student.address} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <InfoBox icon="💰" label="Amount Paid"  value={`₹${Number(student.amount).toLocaleString('en-IN')}`} />
                    <InfoBox icon="🏦" label="Account"      value={student.account} />
                    <InfoBox icon="📅" label="Payment Date" value={format(new Date(student.payment_date), 'dd MMM yyyy')} />
                  </div>
                </>
              )}

              {/* ACTION BUTTONS */}
              {canEdit && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'4px' }}>
                  <button onClick={onEditStudent} style={{ padding:'11px 8px', borderRadius:'10px', border:'1px solid rgba(99,102,241,0.35)', cursor:'pointer', background:'rgba(99,102,241,0.12)', color:'#a5b4fc', fontSize:'12px', fontWeight:'700', fontFamily:'inherit' }}>✏️ Edit</button>
                  <button onClick={() => setPanel('renew')} style={{ padding:'11px 8px', borderRadius:'10px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white', fontSize:'12px', fontWeight:'700', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(99,102,241,0.3)' }}>🔄 Renew</button>
                  <button onClick={() => setPanel('transfer')} style={{ padding:'11px 8px', borderRadius:'10px', border:'1px solid rgba(34,197,94,0.35)', cursor:'pointer', background:'rgba(34,197,94,0.1)', color:'#4ade80', fontSize:'12px', fontWeight:'700', fontFamily:'inherit' }}>🔀 Transfer Seat</button>
                  {canVacate && <button onClick={() => setPanel('vacate')} style={{ padding:'11px 8px', borderRadius:'10px', border:'1px solid rgba(239,68,68,0.35)', cursor:'pointer', background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:'12px', fontWeight:'700', fontFamily:'inherit' }}>🚪 Vacate</button>}
                </div>
              )}
              {!canEdit && <div style={{ textAlign:'center', padding:'8px 0', color:'#475569', fontSize:'12px' }}>View only</div>}
            </div>
          )}

          {/* ── RENEW PANEL ── */}
          {panel === 'renew' && student && (
            <div className="animate-fadeIn">
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <button onClick={() => setPanel('main')} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'16px' }}>←</button>
                <div style={{ fontWeight:'800', fontSize:'16px', color:'#f1f5f9', fontFamily:"'Sora', sans-serif" }}>🔄 Renew Seat</div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'14px' }}>
                <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>Current Due Date</div>
                <div style={{ color: daysLeft !== null && daysLeft < 0 ? '#f87171' : '#94a3b8', fontWeight:'700', fontSize:'14px' }}>
                  {format(new Date(student.due_date), 'dd MMMM yyyy')}
                  {daysLeft !== null && daysLeft < 0 && <span style={{ marginLeft:'8px', fontSize:'11px', color:'#f87171' }}>({Math.abs(daysLeft)}d overdue — renews from today)</span>}
                </div>
              </div>
              <form onSubmit={handleRenew} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Extend By (months) *</label>
                  <input type="number" required min={1} max={24} value={renewMonths} onChange={e => setRenewMonths(parseInt(e.target.value))} style={inp} />
                </div>
                <div style={{ background:'rgba(99,102,241,0.1)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(99,102,241,0.25)' }}>
                  <div style={{ color:'#94a3b8', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>📅 New Due Date</div>
                  <div style={{ color:'#a5b4fc', fontSize:'18px', fontWeight:'800', fontFamily:"'Sora', sans-serif" }}>
                    {renewDue ? new Date(renewDue).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '—'}
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Renewal Amount (₹) *</label>
                  <input type="number" required min={0} value={renewAmount} onChange={e => setRenewAmount(e.target.value)} placeholder="0" style={inp} />
                </div>
                <div>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Payment Account *</label>
                  <select required value={renewAccount} onChange={e => setRenewAccount(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                    <option value="">Select</option>
                    {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {renewError && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'10px', color:'#f87171', fontSize:'13px' }}>⚠️ {renewError}</div>}
                <div style={{ display:'flex', gap:'8px' }}>
                  <button type="button" onClick={() => setPanel('main')} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)', background:'transparent', color:'#94a3b8', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                  <button type="submit" disabled={renewLoading} style={{ flex:2, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#ec4899)', color:'white', fontSize:'13px', fontWeight:'800', opacity: renewLoading ? 0.7 : 1, fontFamily:'inherit' }}>
                    {renewLoading ? 'Renewing…' : '✅ Confirm Renewal'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── TRANSFER PANEL ── */}
          {panel === 'transfer' && student && (
            <div className="animate-fadeIn">
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <button onClick={() => { setPanel('main'); setTransferError('') }} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'16px' }}>←</button>
                <div style={{ fontWeight:'800', fontSize:'16px', color:'#f1f5f9', fontFamily:"'Sora', sans-serif" }}>🔀 Transfer Seat</div>
              </div>

              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'14px' }}>
                <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>Moving</div>
                <div style={{ color:'#f1f5f9', fontWeight:'700', fontSize:'14px' }}>{student.name}</div>
                <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px' }}>Current: Block {block}, Seat {seatNumber}</div>
              </div>

              <form onSubmit={handleTransfer} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {/* Block selector */}
                <div>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>Target Block *</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    {([1,2] as const).map(b => (
                      <button key={b} type="button" onClick={() => { setTransferBlock(b); setTransferSeat('') }}
                        style={{ padding:'11px', borderRadius:'10px', border:`2px solid ${transferBlock === b ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`, cursor:'pointer', background: transferBlock === b ? 'rgba(99,102,241,0.15)' : 'transparent', color: transferBlock === b ? '#a5b4fc' : '#64748b', fontWeight:'700', fontSize:'13px', fontFamily:'inherit' }}>
                        {b === 1 ? '🏠 Block 1' : '🏢 Block 2'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seat selector */}
                <div>
                  <label style={{ display:'block', color:'#94a3b8', fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>
                    Select Vacant Seat * ({vacantSeats.length} available)
                  </label>
                  {vacantSeats.length === 0
                    ? <div style={{ color:'#f87171', fontSize:'13px', padding:'12px', background:'rgba(239,68,68,0.08)', borderRadius:'10px', border:'1px solid rgba(239,68,68,0.2)' }}>No vacant seats in Block {transferBlock}</div>
                    : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', maxHeight:'160px', overflowY:'auto', padding:'4px' }}>
                        {vacantSeats.map(s => (
                          <button key={s.seat_number} type="button" onClick={() => setTransferSeat(s.seat_number)}
                            style={{ width:'44px', height:'36px', borderRadius:'8px', border:`2px solid ${transferSeat === s.seat_number ? 'rgba(34,197,94,0.7)' : 'rgba(34,197,94,0.3)'}`, cursor:'pointer', background: transferSeat === s.seat_number ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.06)', color: transferSeat === s.seat_number ? '#4ade80' : '#6b7280', fontWeight:'700', fontSize:'11px', fontFamily:'inherit', transition:'all 0.1s' }}>
                            {s.seat_number}
                          </button>
                        ))}
                      </div>
                    )
                  }
                </div>

                {transferError && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'10px', color:'#f87171', fontSize:'13px' }}>⚠️ {transferError}</div>}

                <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                  <button type="button" onClick={() => setPanel('main')} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)', background:'transparent', color:'#94a3b8', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                  <button type="submit" disabled={!transferSeat || transferLoading} style={{ flex:2, padding:'12px', borderRadius:'10px', border:'none', cursor: !transferSeat ? 'not-allowed' : 'pointer', background:'linear-gradient(135deg,#059669,#10b981)', color:'white', fontSize:'13px', fontWeight:'800', opacity: !transferSeat || transferLoading ? 0.5 : 1, fontFamily:'inherit' }}>
                    {transferLoading ? 'Transferring…' : `✅ Move to Seat ${transferSeat || '—'}`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── VACATE CONFIRM ── */}
          {panel === 'vacate' && student && (
            <div className="animate-fadeIn" style={{ textAlign:'center', padding:'12px 0' }}>
              <div style={{ fontSize:'44px', marginBottom:'14px' }}>🚪</div>
              <div style={{ fontWeight:'800', fontSize:'16px', color:'#f1f5f9', marginBottom:'8px', fontFamily:"'Sora', sans-serif" }}>Vacate Seat {seatNumber}?</div>
              <div style={{ color:'#64748b', fontSize:'13px', marginBottom:'6px' }}>
                <span style={{ color:'#f1f5f9', fontWeight:'700' }}>{student.name}</span> will be marked inactive.
              </div>
              <div style={{ color:'#475569', fontSize:'12px', marginBottom:'22px' }}>The seat will become available for a new student.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => setPanel('main')} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)', background:'transparent', color:'#94a3b8', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                <button onClick={handleVacate} disabled={vacateLoading} style={{ flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.8)', color:'white', fontSize:'13px', fontWeight:'800', opacity: vacateLoading ? 0.7 : 1, fontFamily:'inherit' }}>
                  {vacateLoading ? 'Vacating…' : '🚪 Yes, Vacate'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
