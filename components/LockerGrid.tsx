'use client'
import { Student, getSeatStatus } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'

interface Props {
  students: Student[]
  canEdit: boolean
  isAdmin: boolean
  onLockerClick?: (lockerNum: number, student: Student | null) => void
}

const LOCKER_NUMBERS = Array.from({ length: 30 }, (_, i) => i + 1)

function getLockerStatus(student: Student | undefined) {
  if (!student) return 'vacant'
  return getSeatStatus(student)
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  vacant:     { background:'rgba(34,197,94,0.2)',   border:'2px solid rgba(34,197,94,0.5)',   color:'#4ade80' },
  occupied:   { background:'rgba(249,168,212,0.2)', border:'2px solid rgba(249,168,212,0.5)', color:'#f9a8d4' },
  'due-soon': { background:'rgba(253,224,71,0.2)',  border:'2px solid rgba(253,224,71,0.5)',  color:'#fde047' },
  overdue:    { background:'rgba(239,68,68,0.5)',   border:'2px solid rgba(239,68,68,0.8)',   color:'#fff'    },
}

export default function LockerGrid({ students, canEdit, isAdmin, onLockerClick }: Props) {
  // Build locker→student map from students' locker_numbers arrays
  const lockerMap = new Map<number, Student>()
  students.forEach(s => {
    (s.locker_numbers || []).forEach(n => lockerMap.set(n, s))
  })

  const occupied = lockerMap.size
  const vacant   = 30 - occupied
  const overdue  = [...lockerMap.values()].filter(s => getSeatStatus(s) === 'overdue').length
  const dueSoon  = [...lockerMap.values()].filter(s => getSeatStatus(s) === 'due-soon').length

  return (
    <div style={{ marginTop:'20px', paddingTop:'16px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px', flexWrap:'wrap', gap:'6px' }}>
        <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'14px', color:'#e2e8f0' }}>🔒 Lockers</div>
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
          {[
            { label:`${vacant} free`,    color:'#4ade80', bg:'rgba(34,197,94,0.12)'   },
            { label:`${occupied} used`,  color:'#f9a8d4', bg:'rgba(249,168,212,0.12)' },
            ...(dueSoon > 0 ? [{ label:`${dueSoon} due soon`, color:'#fde047', bg:'rgba(253,224,71,0.12)' }] : []),
            ...(overdue > 0 ? [{ label:`${overdue} overdue`,  color:'#f87171', bg:'rgba(239,68,68,0.12)'  }] : []),
          ].map(s => (
            <span key={s.label} style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', color:s.color, background:s.bg }}>{s.label}</span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
        {LOCKER_NUMBERS.map(n => {
          const student = lockerMap.get(n)
          const status  = getLockerStatus(student)
          const style   = STATUS_STYLE[status]
          return (
            <div key={n}
              onClick={() => onLockerClick?.(n, student || null)}
              title={student ? `${student.name} · Due ${new Date(student.due_date).toLocaleDateString('en-IN')}` : `Locker ${n} (Vacant)`}
              style={{ ...style, width:'42px', height:'38px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', cursor: onLockerClick ? 'pointer' : 'default', fontFamily:"'Sora', sans-serif", transition:'all 0.12s' }}
              onMouseEnter={e => { if (onLockerClick) e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
              {n}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop:'8px', color:'#334155', fontSize:'10px' }}>
        Tap a locker to see details · Assign lockers via the student form
      </div>
    </div>
  )
}
