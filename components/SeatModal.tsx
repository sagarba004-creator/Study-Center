'use client'
import { Student, SeatStatus } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'

interface Props {
  student: Student | null
  seatNumber: number
  block: number
  status: SeatStatus
  isAdmin: boolean
  onClose: () => void
  onAddStudent: () => void
  onEditStudent: () => void
  onVacateSeat: () => void
}

const STATUS_CONFIG = {
  vacant:     { label: 'Vacant',    bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#4ade80' },
  occupied:   { label: 'Occupied',  bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', text: '#a5b4fc' },
  'due-soon': { label: 'Due Soon',  bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fde047' },
  overdue:    { label: 'Overdue',   bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#f87171' },
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px' }}>{icon} {label}</div>
      <div style={{ color:'#e2e8f0', fontSize:'13px', fontWeight:'600' }}>{value}</div>
    </div>
  )
}

export default function SeatModal({ student, seatNumber, block, status, isAdmin, onClose, onAddStudent, onEditStudent, onVacateSeat }: Props) {
  const cfg = STATUS_CONFIG[status]
  const today    = new Date()
  const dueDate  = student ? new Date(student.due_date) : null
  const daysLeft = dueDate ? differenceInDays(dueDate, today) : null

  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div onClick={stopProp} className="animate-slideUp" style={{
        width:'100%', maxWidth:'440px', background:'#1e293b', borderRadius:'24px',
        border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
        overflow:'hidden', maxHeight:'90vh', overflowY:'auto', fontFamily:"'Nunito', sans-serif"
      }}>
        {/* Header */}
        <div style={{ padding:'24px 24px 20px', background:'linear-gradient(135deg, #1e293b, #0f172a)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:'16px', right:'16px', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', color:'#94a3b8', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          <div style={{ color:'#64748b', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Block {block}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ fontSize:'28px', fontWeight:'800', color:'#f1f5f9', fontFamily:"'Sora', sans-serif" }}>Seat {seatNumber}</div>
            <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:cfg.bg, border:`1px solid ${cfg.border}`, color:cfg.text }}>
              {cfg.label}
              {daysLeft !== null && daysLeft <= 2 && (
                <span style={{ marginLeft:'6px' }}>
                  {daysLeft < 0 ? `(${Math.abs(daysLeft)}d overdue)` : daysLeft === 0 ? '(Today)' : `(${daysLeft}d left)`}
                </span>
              )}
            </span>
          </div>
        </div>

        <div style={{ padding:'20px 24px 24px' }}>
          {status === 'vacant' ? (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>🪑</div>
              <p style={{ color:'#64748b', marginBottom:'24px', fontSize:'14px' }}>This seat is available</p>
              <button onClick={onAddStudent} style={{
                padding:'13px 32px', borderRadius:'12px', border:'none', cursor:'pointer',
                background:'linear-gradient(135deg, #6366f1, #ec4899)', color:'white', fontSize:'14px', fontWeight:'700', fontFamily:'inherit',
                boxShadow:'0 8px 20px rgba(99,102,241,0.4)'
              }}>+ Assign Student</button>
            </div>
          ) : student ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {/* Student avatar + name */}
              <div style={{ display:'flex', alignItems:'center', gap:'14px', background:'rgba(255,255,255,0.04)', padding:'14px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'linear-gradient(135deg, #6366f1, #ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'800', color:'white', flexShrink:0, fontFamily:"'Sora', sans-serif" }}>
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:'800', fontSize:'16px', color:'#f1f5f9' }}>{student.name}</div>
                  <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px' }}>
                    {student.insider_outsider === 'insider' ? '📍 Local Student' : '✈️ Outstation Student'}
                  </div>
                </div>
              </div>

              {/* Due date — prominent */}
              <div style={{ background: daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.12)' : daysLeft !== null && daysLeft <= 2 ? 'rgba(251,191,36,0.12)' : 'rgba(99,102,241,0.1)', borderRadius:'12px', padding:'14px 16px', border:`1px solid ${daysLeft !== null && daysLeft < 0 ? 'rgba(239,68,68,0.3)' : daysLeft !== null && daysLeft <= 2 ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.2)'}` }}>
                <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>📅 Due Date</div>
                <div style={{ fontSize:'18px', fontWeight:'800', color: daysLeft !== null && daysLeft < 0 ? '#f87171' : daysLeft !== null && daysLeft <= 2 ? '#fde047' : '#a5b4fc', fontFamily:"'Sora', sans-serif" }}>
                  {format(new Date(student.due_date), 'dd MMMM yyyy')}
                </div>
                {daysLeft !== null && (
                  <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'4px' }}>
                    {daysLeft < 0 ? `⚠️ ${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? '⚠️ Due today!' : `✅ ${daysLeft} days remaining`}
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <InfoBox icon="📖" label="Exam" value={student.exam} />
                <InfoBox icon="🎓" label="College" value={student.college} />
                <InfoBox icon="📅" label="Joined" value={format(new Date(student.joining_date), 'dd MMM yyyy')} />
                <InfoBox icon="⏱️" label="Duration" value={`${student.duration_months} month${student.duration_months > 1 ? 's' : ''}`} />
              </div>

              {/* Admin-only fields */}
              {isAdmin && (
                <>
                  <InfoBox icon="📍" label="Address (Aadhaar)" value={student.address} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <InfoBox icon="💰" label="Amount Paid" value={`₹${Number(student.amount).toLocaleString('en-IN')}`} />
                    <InfoBox icon="🏦" label="Account" value={student.account} />
                    <InfoBox icon="📅" label="Payment Date" value={format(new Date(student.payment_date), 'dd MMM yyyy')} />
                  </div>
                </>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                <button onClick={onEditStudent} style={{
                  flex:1, padding:'12px', borderRadius:'10px', border:'none', cursor:'pointer',
                  background:'linear-gradient(135deg, #6366f1, #ec4899)', color:'white', fontSize:'13px', fontWeight:'700', fontFamily:'inherit'
                }}>✏️ Edit</button>
                {isAdmin && (
                  <button onClick={onVacateSeat} style={{
                    flex:1, padding:'12px', borderRadius:'10px', border:'1px solid rgba(239,68,68,0.4)', cursor:'pointer',
                    background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:'13px', fontWeight:'700', fontFamily:'inherit'
                  }}>🚪 Vacate</button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
