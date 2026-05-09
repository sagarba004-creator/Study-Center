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
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'16px', padding:'18px 20px', border:'1.5px solid rgba(255,255,255,0.07)', flex:1, minWidth:'140px' }}>
      <div style={{ fontSize:'24px', marginBottom:'10px' }}>{emoji}</div>
      <div style={{ fontSize:'26px', fontWeight:'800', color, fontFamily:"'Sora', sans-serif", lineHeight:1 }}>{value}</div>
      <div style={{ color:'#94a3b8', fontSize:'12px', marginTop:'5px', fontWeight:'600' }}>{label}</div>
      {sub && <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px' }}>{sub}</div>}
    </div>
  )
}

export default function DashboardClient() {
  const router   = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin]           = useState(false)
  const [tab, setTab]                   = useState<Tab>('block1')
  const [students, setStudents]         = useState<Student[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [selectedSeat, setSelectedSeat] = useState<SeatWithStudent | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setIsAdmin(user.user_metadata?.role === 'admin')
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

  const totalSeats   = b1Seats.length + b2Seats.length
  const occupied     = students.length
  const vacant       = totalSeats - occupied
  const overdue      = students.filter(s => getSeatStatus(s) === 'overdue').length
  const dueSoon      = students.filter(s => getSeatStatus(s) === 'due-soon').length

  const handleSeatClick = (seat: SeatWithStudent) => { setSelectedSeat(seat); setShowForm(false); setEditingStudent(null) }

  const handleVacate = async () => {
    if (!selectedSeat?.student || !isAdmin) return
    if (!confirm('Mark this seat as vacant?')) return
    await supabase.from('students').update({ is_active: false }).eq('id', selectedSeat.student.id)
    setSelectedSeat(null); loadStudents()
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.exam.toLowerCase().includes(search.toLowerCase()) ||
    s.college.toLowerCase().includes(search.toLowerCase()) ||
    String(s.seat_number).includes(search)
  )

  const tabs: { key: Tab; label: string; emoji: string; adminOnly?: boolean }[] = [
    { key:'block1',    label:'Block 1',    emoji:'🏠' },
    { key:'block2',    label:'Block 2',    emoji:'🏢' },
    { key:'students',  label:'Students',   emoji:'👥' },
    { key:'analytics', label:'Analytics',  emoji:'📊', adminOnly:true },
  ]

  const sBtn = (active: boolean): React.CSSProperties => ({
    padding:'9px 18px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit',
    fontWeight:'700', fontSize:'13px', transition:'all 0.2s',
    background: active ? 'linear-gradient(135deg, #6366f1, #ec4899)' : 'transparent',
    color: active ? 'white' : '#64748b',
    boxShadow: active ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
  })

  const legend = [
    { label:'Vacant',         color:'#4ade80', bg:'rgba(34,197,94,0.2)' },
    { label:'Occupied',       color:'#f9a8d4', bg:'rgba(249,168,212,0.2)' },
    { label:'Due Soon',       color:'#fde047', bg:'rgba(253,224,71,0.2)' },
    { label:'Overdue',        color:'#f87171', bg:'rgba(239,68,68,0.2)' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', fontFamily:"'Nunito', sans-serif", color:'#f1f5f9' }}>

      {/* TOP BAR */}
      <header style={{ padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(15,23,42,0.9)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>📚</div>
          <div>
            <div style={{ fontWeight:'800', fontSize:'16px', fontFamily:"'Sora', sans-serif", color:'#f1f5f9', lineHeight:1 }}>StudyNest</div>
            <div style={{ fontSize:'11px', color:'#475569', marginTop:'2px' }}>{isAdmin ? '⚡ Admin' : '👤 Staff'}</div>
          </div>
        </div>

        {/* Summary pills */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {overdue > 0  && <span style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)' }}>🔴 {overdue} Overdue</span>}
          {dueSoon > 0  && <span style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:'rgba(251,191,36,0.15)', color:'#fde047', border:'1px solid rgba(251,191,36,0.3)' }}>🟡 {dueSoon} Due Soon</span>}
          <span style={{ padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:'rgba(99,102,241,0.15)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.3)' }}>👥 {occupied} Active</span>
        </div>

        <button onClick={handleLogout} style={{ padding:'8px 16px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#64748b', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
      </header>

      <main style={{ padding:'24px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
            <div style={{ width:'48px', height:'48px', borderRadius:'50%', border:'4px solid rgba(99,102,241,0.2)', borderTop:'4px solid #6366f1', animation:'spin 0.8s linear infinite' }} />
            <div style={{ color:'#475569', fontSize:'14px' }}>Loading seats…</div>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'24px' }}>
              <StatCard emoji="🪑" label="Total Seats"    value={totalSeats} color="#a5b4fc" />
              <StatCard emoji="✅" label="Occupied"       value={occupied}   color="#4ade80" sub={`${vacant} vacant`} />
              {dueSoon > 0  && <StatCard emoji="⏰" label="Due Soon"  value={dueSoon}  color="#fde047" />}
              {overdue > 0  && <StatCard emoji="🚨" label="Overdue"   value={overdue}  color="#f87171" />}
            </div>

            {/* TABS */}
            <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.04)', padding:'6px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.07)', width:'fit-content', marginBottom:'20px' }}>
              {tabs.filter(t => !t.adminOnly || isAdmin).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={sBtn(tab === t.key)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* LEGEND for seat views */}
            {(tab === 'block1' || tab === 'block2') && (
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'16px' }}>
                {legend.map(l => (
                  <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'6px 12px', borderRadius:'20px', background:l.bg, border:`1px solid ${l.color}33` }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:l.color }} />
                    <span style={{ fontSize:'12px', fontWeight:'700', color:l.color }}>{l.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* BLOCK 1 */}
            {tab === 'block1' && (
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'20px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'18px', color:'#e2e8f0', marginBottom:'16px' }}>🏠 Block 1</div>
                <Block1Grid seatsData={b1Seats} onSeatClick={handleSeatClick} />
              </div>
            )}

            {/* BLOCK 2 */}
            {tab === 'block2' && (
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'20px', padding:'20px', border:'1.5px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'18px', color:'#e2e8f0', marginBottom:'16px' }}>🏢 Block 2</div>
                <Block2Grid seatsData={b2Seats} onSeatClick={handleSeatClick} />
              </div>
            )}

            {/* ANALYTICS */}
            {tab === 'analytics' && isAdmin && <Analytics />}

            {/* STUDENTS LIST */}
            {tab === 'students' && (
              <div>
                <div style={{ position:'relative', marginBottom:'16px' }}>
                  <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'16px' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, exam, college, seat number…"
                    style={{ width:'100%', padding:'12px 16px 12px 42px', borderRadius:'12px', border:'1.5px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#f1f5f9', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {filtered.length === 0 && (
                    <div style={{ textAlign:'center', padding:'60px 0', color:'#475569' }}>
                      {search ? 'No students match your search' : 'No active students yet'}
                    </div>
                  )}
                  {filtered.map(student => {
                    const status = getSeatStatus(student)
                    const statusColor: Record<string, string> = { occupied:'#a5b4fc', 'due-soon':'#fde047', overdue:'#f87171', vacant:'#4ade80' }
                    const statusBg: Record<string, string>    = { occupied:'rgba(99,102,241,0.12)', 'due-soon':'rgba(253,224,71,0.12)', overdue:'rgba(239,68,68,0.12)', vacant:'rgba(34,197,94,0.12)' }
                    const statusLabel: Record<string, string> = { occupied:'Active', 'due-soon':'Due Soon', overdue:'Overdue', vacant:'Inactive' }
                    return (
                      <div key={student.id} onClick={() => { const seat: SeatWithStudent = { block: student.block as 1|2, seat_number: student.seat_number, student, status }; setSelectedSeat(seat) }}
                        style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'14px 16px', border:'1.5px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', cursor:'pointer', transition:'border-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'18px', color:'white', flexShrink:0, fontFamily:"'Sora', sans-serif" }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'14px' }}>{student.name}</div>
                            <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px' }}>{student.exam} · {student.college}</div>
                            <div style={{ color:'#475569', fontSize:'11px', marginTop:'2px' }}>Block {student.block} · Seat {student.seat_number}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <span style={{ padding:'4px 10px', borderRadius:'12px', fontSize:'11px', fontWeight:'700', background:statusBg[status], color:statusColor[status] }}>{statusLabel[status]}</span>
                          <div style={{ color:'#64748b', fontSize:'11px', marginTop:'5px' }}>Due: {new Date(student.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>
                          {isAdmin && <div style={{ color:'#6366f1', fontSize:'12px', fontWeight:'700', marginTop:'2px' }}>₹{Number(student.amount).toLocaleString('en-IN')}</div>}
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
          onClose={() => setSelectedSeat(null)}
          onAddStudent={() => { setEditingStudent(null); setShowForm(true) }}
          onEditStudent={() => { setEditingStudent(selectedSeat.student || null); setShowForm(true) }}
          onVacateSeat={handleVacate}
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
        textarea::placeholder { color: #475569; }
        select option { background: #1e293b; color: #f1f5f9; }
      `}</style>
    </div>
  )
}
