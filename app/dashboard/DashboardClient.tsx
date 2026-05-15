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
import Expenditure from '@/components/Expenditure'
import Transactions from '@/components/Transactions'
import LockerGrid from '@/components/LockerGrid'

type Tab = 'block1' | 'block2' | 'students' | 'transactions' | 'analytics'
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
  const [oldStudents, setOldStudents]           = useState<Student[]>([])
  const [loading, setLoading]                   = useState(true)
  const [search, setSearch]                     = useState('')
  const [statusFilter, setStatusFilter]         = useState<string | null>(null)
  const [selectedSeat, setSelectedSeat]         = useState<SeatWithStudent | null>(null)
  const [showForm, setShowForm]                 = useState(false)
  const [showFlexibleForm, setShowFlexibleForm] = useState(false)
  const [editingStudent, setEditingStudent]     = useState<Student | null>(null)
  const [oldSelectedStudent, setOldSelectedStudent] = useState<Student | null>(null)
  const [lockerDetail, setLockerDetail] = useState<{ num: number; student: Student | null } | null>(null)
  const [showExpenditure, setShowExpenditure] = useState<1 | 2 | null>(null)
  const [studentView, setStudentView]         = useState<'active' | 'vacated'>('active')

  const isAdmin   = role === 'admin'
  const canEdit   = role === 'admin' || role === 'staff'
  const canVacate = role === 'admin' || role === 'staff'

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: roleData } = await supabase.rpc('get_my_role')
      if (roleData === 'admin') setRole('admin')
      else if (roleData === 'staff') setRole('staff')
      else {
        const r = session.user?.user_metadata?.role
        if (r === 'admin') setRole('admin')
        else if (r === 'staff') setRole('staff')
        else setRole('viewer')
      }
    }
    init()
  }, [])

  const loadStudents = useCallback(async () => {
    const [active, old] = await Promise.all([
      supabase.from('students').select('*').eq('is_active', true),
      supabase.from('students').select('*').eq('is_active', false).order('vacated_at', { ascending: false }),
    ])
    if (active.data) setStudents(active.data as Student[])
    if (old.data)    setOldStudents(old.data as Student[])
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

  const fixedStudents = students.filter(s => !s.is_flexible && s.seat_number)
  const flexStudents  = students.filter(s => s.is_flexible || !s.seat_number)
  const totalSeats    = b1Seats.length + b2Seats.length
  const occupied      = fixedStudents.length
  const vacant        = totalSeats - occupied
  const overdue       = students.filter(s => getSeatStatus(s) === 'overdue').length
  const dueSoon       = students.filter(s => getSeatStatus(s) === 'due-soon').length

  const handleSeatClick = (seat: SeatWithStudent) => {
    setSelectedSeat(seat); setShowForm(false); setEditingStudent(null)
  }

  const filtered = students.filter(s => {
    if (statusFilter && getSeatStatus(s) !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) ||
        s.exam.toLowerCase().includes(q) ||
        s.college.toLowerCase().includes(q) ||
        String(s.seat_number).includes(search) ||
        (s.phone && s.phone.includes(search))
    }
    return true
  })

  const tabs: { key: Tab; label: string; emoji: string; allowedRoles: Role[] }[] = [
    { key:'block1',    label:'Block 1',      emoji:'🏠', allowedRoles:['admin','staff','viewer'] },
    { key:'block2',    label:'Block 2',      emoji:'🏢', allowedRoles:['admin','staff','viewer'] },
    { key:'students',  label:'Students',     emoji:'👥', allowedRoles:['admin','staff','viewer'] },
    { key:'transactions', label:'Transactions', emoji:'💳', allowedRoles:['admin'] },
    { key:'analytics',   label:'Analytics',    emoji:'📊', allowedRoles:['admin'] },
  ]

  const badge = roleBadge[role]

  const InfoBox = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>{icon} {label}</div>
      <div style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'600' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', fontFamily:"'Nunito', sans-serif", color:'#f1f5f9' }}>

      {/* TOPBAR */}
      <header style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(15,23,42,0.95)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>📚</div>
          <div>
            <div style={{ fontWeight:'800', fontSize:'14px', fontFamily:"'Sora', sans-serif", color:'#f1f5f9', lineHeight:1 }}>Legacy</div>
            <span style={{ display:'inline-block', marginTop:'2px', padding:'1px 7px', borderRadius:'8px', fontSize:'9px', fontWeight:'700', background:badge.bg, color:badge.color }}>{badge.label}</span>
          </div>
        </div>

        {/* Alert pills — hidden on small screens */}
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', justifyContent:'center', flex:1 }}>
          {overdue > 0  && <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)', whiteSpace:'nowrap' }}>🔴 {overdue}</span>}
          {dueSoon > 0  && <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', background:'rgba(251,191,36,0.15)', color:'#fde047', border:'1px solid rgba(251,191,36,0.25)', whiteSpace:'nowrap' }}>🟡 {dueSoon}</span>}
          {flexStudents.length > 0 && <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', background:'rgba(103,232,249,0.15)', color:'#67e8f9', border:'1px solid rgba(103,232,249,0.25)', whiteSpace:'nowrap' }}>🔄 {flexStudents.length}</span>}
          <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700', background:'rgba(99,102,241,0.15)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.25)', whiteSpace:'nowrap' }}>🪑 {occupied}</span>
        </div>

        <button onClick={handleLogout} style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#64748b', fontSize:'11px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
          Out
        </button>
      </header>

      {/* BOTTOM TAB BAR — mobile style */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:40, background:'rgba(15,23,42,0.97)', backdropFilter:'blur(16px)', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'8px 4px 12px', display:'flex', justifyContent:'space-around' }}>
        {tabs.filter(t => t.allowedRoles.includes(role)).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setStatusFilter(null) }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', padding:'6px 12px', borderRadius:'12px', border:'none', cursor:'pointer', fontFamily:'inherit', background: tab === t.key ? 'rgba(99,102,241,0.2)' : 'transparent', transition:'all 0.15s', minWidth:'48px' }}>
            <span style={{ fontSize:'18px', lineHeight:1 }}>{t.emoji}</span>
            <span style={{ fontSize:'9px', fontWeight:'700', color: tab === t.key ? '#a5b4fc' : '#475569', whiteSpace:'nowrap' }}>{t.label}</span>
          </button>
        ))}
      </div>

      <main style={{ padding:'16px 16px 80px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'16px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'50%', border:'4px solid rgba(99,102,241,0.2)', borderTop:'4px solid #6366f1', animation:'spin 0.8s linear infinite' }} />
            <div style={{ color:'#475569', fontSize:'14px' }}>Loading…</div>
          </div>
        ) : (
          <>
            {/* STAT CARDS — clickable, open filtered student list */}
            <div style={{ display:'flex', gap:'10px', overflowX:'auto', marginBottom:'16px', paddingBottom:'4px', WebkitOverflowScrolling:'touch' }}>
              {[
                { emoji:'🪑', label:'Total Seats',  value: String(totalSeats), color:'#a5b4fc', filter: null,       clickable: false },
                { emoji:'✅', label:'Occupied',      value: String(occupied),   color:'#4ade80', filter:'occupied',   clickable: true,  sub:`${vacant} vacant` },
                ...(flexStudents.length > 0 ? [{ emoji:'🔄', label:'Flexible', value: String(flexStudents.length), color:'#67e8f9', filter:'flexible', clickable: true }] : []),
                ...(dueSoon > 0  ? [{ emoji:'⏰', label:'Due Soon',  value: String(dueSoon),  color:'#fde047', filter:'due-soon', clickable: true }] : []),
                ...(overdue > 0  ? [{ emoji:'🚨', label:'Overdue',   value: String(overdue),  color:'#f87171', filter:'overdue',  clickable: true }] : []),
              ].map(c => (
                <div key={c.label}
                  onClick={() => c.clickable && setStatusFilter((c.filter as string | null))}
                  style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'14px 16px', border:`1.5px solid ${statusFilter === c.filter && c.filter ? c.color + '55' : 'rgba(255,255,255,0.07)'}`, flexShrink:0, minWidth:'110px', cursor: c.clickable ? 'pointer' : 'default', transition:'all 0.15s', position:'relative' }}>
                  <div style={{ fontSize:'20px', marginBottom:'6px' }}>{c.emoji}</div>
                  <div style={{ fontSize:'22px', fontWeight:'800', color:c.color, fontFamily:"'Sora', sans-serif", lineHeight:1 }}>{c.value}</div>
                  <div style={{ color:'#64748b', fontSize:'11px', marginTop:'4px', fontWeight:'600' }}>{c.label}</div>
                  {'sub' in c && c.sub && <div style={{ color:'#475569', fontSize:'10px', marginTop:'1px' }}>{c.sub}</div>}
                  {c.clickable && <div style={{ position:'absolute', top:'8px', right:'8px', fontSize:'9px', color:'#475569' }}>›</div>}
                </div>
              ))}
            </div>

            {/* LEGEND — display only */}
            {(tab === 'block1' || tab === 'block2') && (
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px' }}>
                {[
                  { label:'Vacant',   color:'#4ade80', bg:'rgba(34,197,94,0.12)'   },
                  { label:'Occupied', color:'#f9a8d4', bg:'rgba(249,168,212,0.12)' },
                  { label:'Due Soon', color:'#fde047', bg:'rgba(253,224,71,0.12)'  },
                  { label:'Overdue',  color:'#f87171', bg:'rgba(239,68,68,0.12)'   },
                ].map(l => (
                  <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'4px 8px', borderRadius:'20px', background:l.bg }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:l.color }} />
                    <span style={{ fontSize:'10px', fontWeight:'700', color:l.color }}>{l.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* FLEXIBLE STUDENT BUTTON */}
            {canEdit && (tab === 'block1' || tab === 'block2') && (
              <div style={{ marginBottom:'12px' }}>
                <button onClick={() => setShowFlexibleForm(true)} style={{ padding:'8px 14px', borderRadius:'10px', border:'1.5px solid rgba(14,116,144,0.5)', background:'rgba(14,116,144,0.12)', color:'#67e8f9', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'6px' }}>
                  🔄 Add Flexible Student <span style={{ color:'#475569', fontWeight:'500', fontSize:'11px' }}>(no fixed seat)</span>
                </button>
              </div>
            )}

            {/* BLOCK VIEWS */}
            {tab === 'block1' && (
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'16px', padding:'14px', border:'1.5px solid rgba(255,255,255,0.07)', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                  <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'15px', color:'#e2e8f0' }}>🏠 Block 1</div>
                  {isAdmin && <button onClick={() => setShowExpenditure(1)} style={{ padding:'5px 12px', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#f87171', fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>📤 Expenditure</button>}
                </div>
                <Block1Grid seatsData={b1Seats} onSeatClick={handleSeatClick} />
                <LockerGrid students={students} canEdit={canEdit} isAdmin={isAdmin} onLockerClick={(num, student) => setLockerDetail({ num, student })} />
              </div>
            )}
            {tab === 'block2' && (
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'16px', padding:'14px', border:'1.5px solid rgba(255,255,255,0.07)', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                  <div style={{ fontFamily:"'Sora', sans-serif", fontWeight:'700', fontSize:'15px', color:'#e2e8f0' }}>🏢 Block 2</div>
                  {isAdmin && <button onClick={() => setShowExpenditure(2)} style={{ padding:'5px 12px', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#f87171', fontSize:'11px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>📤 Expenditure</button>}
                </div>
                <Block2Grid seatsData={b2Seats} onSeatClick={handleSeatClick} />
              </div>
            )}

            {/* ANALYTICS */}
            {tab === 'analytics'   && isAdmin && <Analytics />}

            {/* TRANSACTIONS */}
            {tab === 'transactions' && isAdmin && <Transactions />}

            {/* STUDENTS LIST */}
            {tab === 'students' && (
              <div>
                {/* Active / Vacated toggle */}
                <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.04)', padding:'4px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'12px', alignSelf:'flex-start', width:'fit-content' }}>
                  {(['active','vacated'] as const).map(v => (
                    <button key={v} onClick={() => { setStudentView(v); setSearch('') }}
                      style={{ padding:'6px 18px', borderRadius:'7px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:'800', fontSize:'12px', transition:'all 0.2s',
                        background: studentView === v ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent',
                        color: studentView === v ? 'white' : '#64748b' }}>
                      {v === 'active' ? `Active (${students.length})` : `Vacated (${oldStudents.length})`}
                    </button>
                  ))}
                </div>
                <div style={{ position:'relative', marginBottom:'12px' }}>
                  <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'14px' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, phone, exam, seat…"
                    style={{ width:'100%', padding:'11px 14px 11px 38px', borderRadius:'12px', border:'1.5px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.05)', color:'#f1f5f9', fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                </div>

                {/* Vacated students list */}
                {studentView === 'vacated' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {oldStudents.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search))).length === 0 && <div style={{ textAlign:'center', padding:'60px 0', color:'#475569', fontSize:'14px' }}>No vacated students yet</div>}
                    {oldStudents.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone && s.phone.includes(search))).map(student => (
                      <div key={student.id} onClick={() => setOldSelectedStudent(student)}
                        style={{ background:'rgba(255,255,255,0.03)', borderRadius:'14px', padding:'12px 14px', border:'1.5px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', cursor:'pointer' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                          <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'16px', color:'#64748b', flexShrink:0 }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:'700', color:'#94a3b8', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{student.name}</div>
                            <div style={{ color:'#475569', fontSize:'11px', marginTop:'1px' }}>{student.exam} · {student.phone || ''}</div>
                            <div style={{ color:'#334155', fontSize:'10px', marginTop:'1px' }}>B{student.block}{student.seat_number ? ` · Seat ${student.seat_number}` : ' · Flexible'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ color:'#475569', fontSize:'10px' }}>Vacated</div>
                          <div style={{ color:'#64748b', fontSize:'11px', fontWeight:'600', whiteSpace:'nowrap' }}>
                            {student.vacated_at ? new Date(student.vacated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                          </div>
                          {canEdit && student.security_deposit > 0 && (
                            <div style={{ fontSize:'10px', fontWeight:'700', marginTop:'3px', color: student.security_deposit_status === 'forfeited' ? '#f87171' : student.security_deposit_status === 'refunded' ? '#a5b4fc' : '#94a3b8' }}>
                              🔐 {student.security_deposit_status === 'forfeited' ? '❌' : student.security_deposit_status === 'refunded' ? '↩️' : '—'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Active students list */}
                {studentView === 'active' && (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {filtered.length === 0 && <div style={{ textAlign:'center', padding:'60px 0', color:'#475569', fontSize:'14px' }}>{search ? 'No results' : 'No active students yet'}</div>}
                  {filtered.map(student => {
                    const st = getSeatStatus(student)
                    const sc: Record<string,string> = { occupied:'#a5b4fc', 'due-soon':'#fde047', overdue:'#f87171', vacant:'#4ade80' }
                    const sb: Record<string,string> = { occupied:'rgba(99,102,241,0.1)', 'due-soon':'rgba(253,224,71,0.1)', overdue:'rgba(239,68,68,0.1)', vacant:'rgba(34,197,94,0.1)' }
                    const sl: Record<string,string> = { occupied:'Active', 'due-soon':'Due Soon', overdue:'Overdue', vacant:'Inactive' }
                    return (
                      <div key={student.id}
                        onClick={() => { const seat: SeatWithStudent = { block: student.block as 1|2, seat_number: student.seat_number, student, status: st }; setSelectedSeat(seat) }}
                        style={{ background:'rgba(255,255,255,0.04)', borderRadius:'14px', padding:'12px 14px', border:'1.5px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', cursor:'pointer' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                          <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'16px', color:'white', flexShrink:0 }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{student.name}</div>
                            <div style={{ color:'#64748b', fontSize:'11px', marginTop:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{student.exam} · {student.phone || ''}</div>
                            <div style={{ color:'#475569', fontSize:'10px', marginTop:'1px' }}>B{student.block} · {student.seat_number ? `Seat ${student.seat_number}` : 'Flexible'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <span style={{ padding:'3px 8px', borderRadius:'8px', fontSize:'10px', fontWeight:'700', background:sb[st], color:sc[st] }}>{sl[st]}</span>
                          <div style={{ color:'#64748b', fontSize:'10px', marginTop:'4px', whiteSpace:'nowrap' }}>{new Date(student.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>
                          {canEdit && <div style={{ color:'#6366f1', fontSize:'11px', fontWeight:'700', marginTop:'2px' }}>₹{Number(student.amount).toLocaleString('en-IN')}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}
              </div>
            )}


          </>
        )}
      </main>

      {/* EXPENDITURE SHEET */}
      {showExpenditure && isAdmin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => setShowExpenditure(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:'540px', background:'#1e293b', borderRadius:'24px 24px 0 0', border:'1.5px solid rgba(255,255,255,0.1)', maxHeight:'85vh', overflowY:'auto', fontFamily:"'Nunito', sans-serif" }}>
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#1e293b', zIndex:1 }}>
              <div style={{ fontWeight:'800', fontSize:'17px', color:'#e2e8f0', fontFamily:"'Sora', sans-serif" }}>📤 Block {showExpenditure} Expenditure</div>
              <button onClick={() => setShowExpenditure(null)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'18px' }}>×</button>
            </div>
            <div style={{ padding:'16px 20px 32px' }}>
              <Expenditure defaultBlock={showExpenditure} />
            </div>
          </div>
        </div>
      )}

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
          allSeats={[...b1Seats, ...b2Seats]}
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
      {showFlexibleForm && (
        <StudentForm
          block={1}
          seatNumber={null}
          isFlexible={true}
          onClose={() => setShowFlexibleForm(false)}
          onSaved={() => { setShowFlexibleForm(false); loadStudents() }}
        />
      )}

      {/* OLD STUDENT DETAIL MODAL */}
      {oldSelectedStudent && (
        <div className="modal-backdrop" onClick={() => setOldSelectedStudent(null)}>
          <div onClick={e => e.stopPropagation()} className="animate-slideUp" style={{
            width:'100%', maxWidth:'440px', background:'#1e293b', borderRadius:'24px',
            border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
            overflow:'hidden', maxHeight:'90vh', overflowY:'auto', fontFamily:"'Nunito', sans-serif"
          }}>
            <div style={{ padding:'18px 20px 14px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'relative' }}>
              <button onClick={() => setOldSelectedStudent(null)} style={{ position:'absolute', top:'12px', right:'12px', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              <div style={{ color:'#475569', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>
                Past Student · B{oldSelectedStudent.block}{oldSelectedStudent.seat_number ? ` · Seat ${oldSelectedStudent.seat_number}` : ' · Flexible'}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'18px', color:'#64748b', flexShrink:0 }}>
                  {oldSelectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:'20px', fontWeight:'800', color:'#94a3b8', fontFamily:"'Sora', sans-serif" }}>{oldSelectedStudent.name}</div>
                  <div style={{ color:'#475569', fontSize:'11px' }}>{oldSelectedStudent.insider_outsider === 'insider' ? '📍 Local' : '✈️ Outstation'}</div>
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 18px 20px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <InfoBox icon="📅" label="Joined"  value={new Date(oldSelectedStudent.joining_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })} />
                <InfoBox icon="🚪" label="Vacated" value={oldSelectedStudent.vacated_at ? new Date(oldSelectedStudent.vacated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'} />
              </div>
              {oldSelectedStudent.vacate_notes && (
                <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'12px', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>📝 Reason</div>
                  <div style={{ color:'#94a3b8', fontSize:'13px', fontStyle:'italic' }}>"{oldSelectedStudent.vacate_notes}"</div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <InfoBox icon="📖" label="Exam"     value={oldSelectedStudent.exam} />
                <InfoBox icon="🎓" label="College"  value={oldSelectedStudent.college} />
                <InfoBox icon="📱" label="Phone"    value={oldSelectedStudent.phone || '—'} />
                <InfoBox icon="⏱️" label="Duration" value={`${oldSelectedStudent.duration_months}m`} />
              </div>
              <InfoBox icon="📍" label="Address" value={oldSelectedStudent.address} />
              {isAdmin && (
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'10px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  <div style={{ color:'#475569', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em' }}>💰 Financials</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <InfoBox icon="💰" label="Amount"       value={`₹${Number(oldSelectedStudent.amount).toLocaleString('en-IN')}`} />
                    <InfoBox icon="🏦" label="Account"      value={oldSelectedStudent.account} />
                    <InfoBox icon="📅" label="Payment Date" value={new Date(oldSelectedStudent.payment_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })} />
                    {Number(oldSelectedStudent.refund_amount) > 0 && (
                      <InfoBox icon="💸" label={`Fee Refund (${oldSelectedStudent.refund_account || ''})`} value={`-₹${Number(oldSelectedStudent.refund_amount).toLocaleString('en-IN')}`} />
                    )}
                    {oldSelectedStudent.security_deposit > 0 && (
                      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px', border:'1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'4px' }}>🔐 Deposit</div>
                        <div style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'600' }}>₹{Number(oldSelectedStudent.security_deposit).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize:'11px', marginTop:'2px', color: oldSelectedStudent.security_deposit_status === 'forfeited' ? '#fde047' : '#a5b4fc' }}>
                          {oldSelectedStudent.security_deposit_status === 'forfeited' ? '❌ Forfeited' : '↩️ Refunded'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAT FILTER MODAL */}
      {statusFilter && (
        <div className="modal-backdrop" onClick={() => setStatusFilter(null)}>
          <div onClick={e => e.stopPropagation()} className="animate-slideUp" style={{
            width:'100%', maxWidth:'480px', background:'#1e293b', borderRadius:'24px',
            border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
            overflow:'hidden', maxHeight:'85vh', display:'flex', flexDirection:'column', fontFamily:"'Nunito', sans-serif"
          }}>
            {/* Header */}
            {(() => {
              const cfg: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
                'occupied':  { emoji:'✅', label:'Occupied Seats',    color:'#4ade80', bg:'rgba(74,222,128,0.1)'  },
                'due-soon':  { emoji:'⏰', label:'Due Soon',          color:'#fde047', bg:'rgba(253,224,71,0.1)'  },
                'overdue':   { emoji:'🚨', label:'Overdue',           color:'#f87171', bg:'rgba(239,68,68,0.1)'   },
                'flexible':  { emoji:'🔄', label:'Flexible Students', color:'#67e8f9', bg:'rgba(103,232,249,0.1)' },
              }
              const c = cfg[statusFilter] || cfg['occupied']
              const filterStudents = statusFilter === 'flexible'
                ? flexStudents
                : students.filter(s => getSeatStatus(s) === statusFilter)
              const totalFees = filterStudents.reduce((sum, s) => sum + Number(s.amount), 0)

              return (
                <>
                  <div style={{ padding:'16px 18px 14px', background:`linear-gradient(135deg, ${c.bg}, transparent)`, borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                    <div>
                      <div style={{ fontSize:'20px', fontWeight:'800', color:c.color, fontFamily:"'Sora', sans-serif", display:'flex', alignItems:'center', gap:'8px' }}>
                        {c.emoji} {c.label}
                        <span style={{ fontSize:'14px', color:'#64748b', fontWeight:'600' }}>({filterStudents.length})</span>
                      </div>
                      {isAdmin && totalFees > 0 && (
                        <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px' }}>
                          Total fees: <span style={{ color:'#4ade80', fontWeight:'700' }}>₹{totalFees.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setStatusFilter(null)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', cursor:'pointer', color:'#94a3b8', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>

                  {/* Student list */}
                  <div style={{ overflowY:'auto', padding:'12px 16px 16px', display:'flex', flexDirection:'column', gap:'8px' }}>
                    {filterStudents.length === 0 && (
                      <div style={{ textAlign:'center', padding:'40px 0', color:'#475569', fontSize:'14px' }}>No students in this category</div>
                    )}
                    {filterStudents.map(student => {
                      const st = getSeatStatus(student)
                      const daysLeft = Math.ceil((new Date(student.due_date).getTime() - Date.now()) / 86400000)
                      return (
                        <div key={student.id}
                          onClick={() => {
                            setStatusFilter(null)
                            const seat: SeatWithStudent = { block: student.block as 1|2, seat_number: student.seat_number, student, status: st }
                            setSelectedSeat(seat)
                          }}
                          style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', transition:'border-color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = c.color + '55')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
                            <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'15px', color:'white', flexShrink:0 }}>
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{student.name}</div>
                              <div style={{ color:'#64748b', fontSize:'11px', marginTop:'1px' }}>{student.exam} · {student.phone || ''}</div>
                              <div style={{ color:'#475569', fontSize:'10px', marginTop:'1px' }}>
                                B{student.block}{student.seat_number ? ` · Seat ${student.seat_number}` : ' · Flexible'}
                                {(student.locker_numbers || []).length > 0 && <span style={{ marginLeft:'4px', color:'#6366f1' }}>🔒{student.locker_numbers.join(',')}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ color: daysLeft < 0 ? '#f87171' : daysLeft <= 2 ? '#fde047' : '#64748b', fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap' }}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                            </div>
                            <div style={{ color:'#475569', fontSize:'10px', marginTop:'2px' }}>
                              {new Date(student.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                            </div>
                            {canEdit && (
                              <div style={{ color:'#6366f1', fontSize:'11px', fontWeight:'700', marginTop:'3px' }}>
                                ₹{Number(student.amount).toLocaleString('en-IN')}
                                {Number(student.locker_amount) > 0 && <span style={{ color:'#67e8f9' }}> +₹{Number(student.locker_amount).toLocaleString('en-IN')}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* LOCKER DETAIL MODAL */}
      {lockerDetail && (
        <div className="modal-backdrop" onClick={() => setLockerDetail(null)}>
          <div onClick={e => e.stopPropagation()} className="animate-slideUp" style={{
            width:'100%', maxWidth:'360px', background:'#1e293b', borderRadius:'20px',
            border:'1.5px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 80px rgba(0,0,0,0.6)',
            overflow:'hidden', fontFamily:"'Nunito', sans-serif"
          }}>
            <div style={{ padding:'16px 18px 14px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ color:'#475569', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.1em' }}>Locker</div>
                <div style={{ fontSize:'22px', fontWeight:'800', color:'#f1f5f9', fontFamily:"'Sora', sans-serif" }}>#{lockerDetail.num}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'700', background: lockerDetail.student ? 'rgba(249,168,212,0.15)' : 'rgba(34,197,94,0.15)', color: lockerDetail.student ? '#f9a8d4' : '#4ade80', border: `1px solid ${lockerDetail.student ? 'rgba(249,168,212,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                  {lockerDetail.student ? 'Occupied' : 'Vacant'}
                </span>
                <button onClick={() => setLockerDetail(null)} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'7px', width:'28px', height:'28px', cursor:'pointer', color:'#94a3b8', fontSize:'16px' }}>×</button>
              </div>
            </div>

            <div style={{ padding:'14px 18px 18px' }}>
              {!lockerDetail.student ? (
                <div style={{ textAlign:'center', padding:'16px 0' }}>
                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>🔓</div>
                  <div style={{ color:'#64748b', fontSize:'13px', marginBottom:'12px' }}>Available — assign via student form</div>
                  <button onClick={() => setLockerDetail(null)} style={{ padding:'8px 20px', borderRadius:'9px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#64748b', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>Close</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {/* Student */}
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', background:'rgba(255,255,255,0.04)', padding:'10px 12px', borderRadius:'11px', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:'linear-gradient(135deg,#6366f1,#ec4899)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'15px', color:'white', flexShrink:0 }}>
                      {lockerDetail.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:'700', color:'#f1f5f9', fontSize:'14px' }}>{lockerDetail.student.name}</div>
                      <div style={{ color:'#64748b', fontSize:'11px' }}>{lockerDetail.student.phone || ''} · B{lockerDetail.student.block}{lockerDetail.student.seat_number ? `, Seat ${lockerDetail.student.seat_number}` : ''}</div>
                    </div>
                  </div>
                  {/* Due + financials */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    {[
                      { icon:'📅', label:'Due Date', value: new Date(lockerDetail.student.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) },
                      ...(canEdit ? [
                        { icon:'💰', label:'Amount', value: `₹${Number(lockerDetail.student.locker_amount).toLocaleString('en-IN')}` },
                        { icon:'🏦', label:'Account', value: lockerDetail.student.locker_account || lockerDetail.student.account },
                        { icon:'🔒', label:'All Lockers', value: (lockerDetail.student.locker_numbers || []).sort((a: number,b: number)=>a-b).map((n: number) => `#${n}`).join(', ') },
                      ] : []),
                    ].map(({ icon, label, value }) => (
                      <div key={label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'9px', padding:'10px 12px', border:'1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ color:'#64748b', fontSize:'10px', fontWeight:'700', textTransform:'uppercase', marginBottom:'3px' }}>{icon} {label}</div>
                        <div style={{ color:'#e2e8f0', fontSize:'12px', fontWeight:'600' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {canEdit && (
                    <button onClick={() => {
                      setLockerDetail(null)
                      const seat: any = { block: lockerDetail.student!.block, seat_number: lockerDetail.student!.seat_number, student: lockerDetail.student, status: 'occupied' }
                      setSelectedSeat(seat)
                    }} style={{ padding:'10px', borderRadius:'10px', border:'1px solid rgba(99,102,241,0.35)', background:'rgba(99,102,241,0.1)', color:'#a5b4fc', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit' }}>
                      ✏️ Edit Student to Change Lockers
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
        select option { background: #1e293b; color: #f1f5f9; }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
