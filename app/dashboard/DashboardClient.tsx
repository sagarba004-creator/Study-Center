'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Student, SeatWithStudent, getSeatStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import Block1Grid from '@/components/Block1Grid'
import Block2Grid from '@/components/Block2Grid'
import SeatModal from '@/components/SeatModal'
import StudentForm from '@/components/StudentForm'
import Analytics from '@/components/Analytics'

type Tab = 'block1' | 'block2' | 'students' | 'analytics'
type Role = 'admin' | 'staff' | 'viewer'

const BLOCK1_ALL = [
  38,37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,
  19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,
  39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,
  140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,
  139,138,137,136,135,134,133,132,131,130,129,128,127,126,125,124,123,122,
  104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
  103,102,101,100,99,98,97,96,95,94,93,92,91,90,89,88,87,86,
  70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,
  69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,
]
const BLOCK2_ALL = Array.from({ length: 86 }, (_, i) => i + 1)

function StatCard({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'18px 20px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'130px' }}>
      <div style={{ fontSize:'22px', marginBottom:'10px' }}>{emoji}</div>
      <div style={{ fontSize:'24px', fontWeight:'800', color, fontFamily:"'Sora', sans-serif", lineHeight:1 }}>{value}</div>
      <div style={{ color:'#94a3b8', fontSize:'12px', marginTop:'5px', fontWeight:'600' }}>{label}</div>
      {sub && <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px' }}>{sub}</div>}
    </div>
  )
}

const roleBadge: Record<Role, { label: string; color: string; bg: string }> = {
  admin:  { label: '⚡ Admin',  color: '#fde047', bg: 'rgba(253,224,71,0.12)'  },
  staff:  { label: '🧑‍💼 Staff',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  viewer: { label: '👤 Viewer', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

export default function DashboardClient() {
  const router   = useRouter()
  const supabase = createClient()
  const [role, setRole]                         = useState<Role>('viewer')
  const [tab, setTab]                           = useState<Tab>('block1')
  const [students, setStudents]                 = useState<Student[]>([])
  const [loading, setLoading]                   = useState(true)
  const [search, setSearch]                     = useState('')
  const [selectedSeat, setSelectedSeat]         = useState<SeatWithStudent | null>(null)
  const [showForm, setShowForm]                 = useState(false)
  const [editingStudent, setEditingStudent]     = useState<Student | null>(null)

  const isAdmin   = role === 'admin'
  const canEdit   = role === 'admin' || role === 'staff'   // add / renew / edit
  const canVacate = role === 'admin' || role === 'staff'   // staff can also vacate

  useEffect(() => {
    // Use getSession for the JWT which has the latest metadata
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }

      // Force refresh the session to get latest metadata from DB
      const { data: refreshed } = await supabase.auth.refreshSession()
      const user = refreshed?.session?.user || session.user

      // Try multiple paths where Supabase stores role
      const meta = user?.user_metadata || {}
      const appMeta = user?.app_metadata || {}
      const r = meta?.role || appMeta?.role || null

      console.log('User metadata:', meta)
      console.log('App metadata:', appMeta)
      console.log('Role detected:', r)

      if (r === 'admin') setRole('admin')
      else if (r === 'staff') setRole('staff')
      else setRole('viewer')
    })
  }, [])

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('students').select('*').eq('is_active', true)
    if (data) setStudents(data as Student[])
    setLoading(false)
  }, [])

  useEffect(() => { loadStudents() }, [loadStudents])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const buildSeats = (block: 1 | 2, nums: number[]): SeatWithStudent[] =>
    [...new Set(nums)].map(n => {
      const student = students.find(s => s.block === block && s.seat_number === n)
      return { block, seat_number: n, student, status: getSeatStatus(student) }
    })

  const b1Seats = buildSeats(1, BLOCK1_ALL)
  const b2Seats = buildSeats(2, BLOCK2_ALL)

  const totalSeats = b1Seats.length + b2Seats.length
  const occupied   = students.length
  const vacant     = totalSeats - occupied
  const overdue    = students.filter(s => getSeatStatus(s) === 'overdue').length
  const dueSoon    = students.filter(s => getSeatStatus(s) === 'due-soon').length

  const handleSeatClick = (seat: SeatWithStudent) => {
    setSelectedSeat(seat); setShowForm(false); setEditingStudent(null)
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.exam.toLowerCase().includes(search.toLowerCase()) ||
    s.college.toLowerCase().includes(search.toLowerCase()) ||
    String(s.seat_number).includes(search)
  )

  const tabs: { key: Tab; label: string; emoji: string; allowedRoles: Role[] }[] = [
    { key:'block1',    label:'Block 1',   emoji:'🏠', allowedRoles:['admin','staff','viewer'] },
    { key:'block2',    label:'Block 2',   emoji:'🏢', allowedRoles:['admin','staff','viewer'] },
    { key:'students',  label:'Students',  emoji:'👥', allowedRoles:['admin','staff','viewer'] },
    { key:'analytics', label:'Analytics', emoji:'📊', allowedRoles:['admin'] },
  ]

  const sBtn = (active: boolean): React.CSSProperties => ({
    padding:'9px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit',
    fontWeight:'700', fontSize:'13px', transition:'all 0.2s', whiteSpace:'nowrap',
    background: active ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'transparent',
    color: active ? 'white' : '#64748b',
    boxShadow: active ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
  })

  const badge = roleBadge[role]

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', fontFamily:"'Nunito', sans-serif", color:'#f1f5f9' }}>

      {/* TOPBAR */}
      <header style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(15,23,42,0.95)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'11px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>📚</div>
          <div>
            <div style={{ fontWeight:'800', fontSize:'15px', fontFamily:"'Sora', sans-serif", color:'#f1f5f9', lineHeight:1 }}>StudyNest</div>
            <span style={{ display:'inline-block', marginTop:'3px', padding:'2px 8px', borderRadius:'10px', fontSize:'10px', fontWeight:'700', background:badge.bg, color:badge.color }}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Alert pills */}
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', flex:1, justifyContent:'center' }}>
          {overdue > 0  && <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}>🔴 {overdue} Overdue</span>}
          {dueSoon > 0  && <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:'rgba(251,191,36,0.15)', color:'#fde047', border:'1px solid rgba(251,191,36,0.25)' }}>🟡 {dueSoon} Due Soon</span>}
          <span style={{ padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background:'rgba(99,102,241,0.15)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.25)' }}>👥 {occupied} Active</span>
        </div>

        <button onClick={handleLogout} style={{ padding:'7px 14px', borderRadius:'9px', border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
          Sign Out
        </button>
      </header>

      <main style={{ padding:'20px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'50%', border:'4px solid rgba(99,102,241,0.2)', borderTop:'4px solid #6366f1', animation:'spin 0.8s linear infinite' }} />
            <div style={{ color:'#475569', fontSize:'14px' }}>Loading…</div>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'20px' }}>
              <StatCard emoji="🪑" label="Total Seats" value={totalSeats} color="#a5b4fc" />
              <StatCard emoji="✅" label="Occupied"    value={occupied}   color="#4ade80" sub={`${vacant} vacant`} />
              {dueSoon > 0  && <StatCard emoji="⏰" label="Due Soon" value={dueSoon} color="#fde047" />}
              {overdue > 0  && <StatCard emoji="🚨" label="Overdue"  value={overdue} color="#f87171" />}
            </div>

            {/* TABS */}
            <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.04)', padding:'5px', borderRadius:'13px', border:'1px solid rgba(255,255,255,0.07)', width:'fit-content', marginBottom:'18px', overflowX:'auto' }}>
              {tabs.filter(t => t.allowedRoles.includes(role)).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={sBtn(tab === t.key)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* LEGEND */}
            {(tab === 'block1' || tab === 'block2') && (
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px' }}>
                {[
                  { label:'Vacant',   color:'#4ade80', bg:'rgba(34,197,94,0.12)'    },
                  { label:'Occupied', color:'#f9a8d4', bg:'rgba(249,168,212,0.12)'  },
                  { label:'Due Soon', color:'#fde047', bg:'rgba(253,224,71,0.12)'   },
                  { label:'Overdue',  color:'#f87171', bg:'rgba(239,68,68,0.12)'    },
                ].map(l => (
                  <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px', borderRadius:'20px', background:l.bg, border:`1px solid ${l.color}30` }}>
                    <div style={{ width:'9px', height:'9px', borderRadius:'3px', background:l.color }} />
                    <span style={{ fontSize:'11px', fontWeight:'700', color:l.color }}>{l.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* BLOCK VIEWS */}
            {tab === 'block1' && (
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'18px', padding:'18px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'16px', color:'#e2e8f0', marginBottom:'14px' }}>🏠 Block 1</div>
                <Block1Grid seatsData={b1Seats} onSeatClick={handleSeatClick} />
              </div>
            )}
            {tab === 'block2' && (
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'18px', padding:'18px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'16px', color:'#e2e8f0', marginBottom:'14px' }}>🏢 Block 2</div>
                <Block2Grid seatsData={b2Seats} onSeatClick={handleSeatClick} />
              </div>
            )}

            {/* ANALYTICS — admin only */}
            {tab === 'analytics' && isAdmin && <Analytics />}

            {/* STUDENTS LIST */}
            {tab === 'students' && (
              <div>
                <div style={{ position:'relative', marginBottom:'14px' }}>
                  <span style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', fontSize:'15px' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, exam, college, seat…"
                    style={{ width:'100%', padding:'11px 16px 11px 40px', borderRadius:'12px', border:'1.5px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.05)', color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {filtered.length === 0 && (
                    <div style={{ textAlign:'center', padding:'60px 0', color:'#475569', fontSize:'14px' }}>
                      {search ? 'No students match your search' : 'No active students yet'}
                    </div>
                  )}
                  {filtered.map(student => {
                    const st = getSeatStatus(student)
                    const sc: Record<string,string> = { occupied:'#a5b4fc', 'due-soon':'#fde047', overdue:'#f87171', vacant:'#4ade80' }
                    const sb: Record<string,string> = { occupied:'rgba(99,102,241,0.1)', 'due-soon':'rgba(253,224,71,0.1)', overdue:'rgba(239,68,68,0.1)', vacant:'rgba(34,197,94,0.1)' }
                    const sl: Record<string,string> = { occupied:'Active', 'due-soon':'Due Soon', overdue:'Overdue', vacant:'Inactive' }
                    return (
                      <div key={student.id}
                        onClick={() => { const seat: SeatWithStudent = { block: student.block as 1|2, seat_number: student.seat_number, student, status: st }; setSelectedSeat(seat) }}
                        style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'13px 15px', border:'1.5px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', cursor:'pointer', transition:'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                        <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                          <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'17px', color:'white', flexShrink:0, fontFamily:"'Sora', sans-serif" }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'14px' }}>{student.name}</div>
                            <div style={{ color:'#64748b', fontSize:'11px', marginTop:'1px' }}>{student.exam} · {student.college}</div>
                            <div style={{ color:'#475569', fontSize:'10px', marginTop:'1px' }}>Block {student.block} · Seat {student.seat_number}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <span style={{ padding:'3px 9px', borderRadius:'10px', fontSize:'10px', fontWeight:'700', background:sb[st], color:sc[st] }}>{sl[st]}</span>
                          <div style={{ color:'#64748b', fontSize:'10px', marginTop:'4px' }}>Due: {new Date(student.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                          {/* Only admin sees amount in list */}
                          {isAdmin && <div style={{ color:'#6366f1', fontSize:'11px', fontWeight:'700', marginTop:'2px' }}>₹{Number(student.amount).toLocaleString('en-IN')}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS */}
      {selectedSeat && !showForm && (
        <SeatModal
          student={selectedSeat.student || null}
          seatNumber={selectedSeat.seat_number}
          block={selectedSeat.block}
          status={selectedSeat.status}
          isAdmin={isAdmin}
          canEdit={canEdit}
          canVacate={canVacate}
          onClose={() => setSelectedSeat(null)}
          onAddStudent={() => { setEditingStudent(null); setShowForm(true) }}
          onEditStudent={() => { setEditingStudent(selectedSeat.student || null); setShowForm(true) }}
          onVacateSeat={() => {}}
          onRefresh={loadStudents}
        />
      )}
      {showForm && selectedSeat && (
        <StudentForm
          block={selectedSeat.block}
          seatNumber={selectedSeat.seat_number}
          student={editingStudent}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setSelectedSeat(null); loadStudents() }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>
    </div>
  )
}
