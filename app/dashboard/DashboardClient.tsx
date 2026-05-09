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
import { BookOpen, LogOut, Users, TrendingUp, Grid3X3, LayoutGrid, Search } from 'lucide-react'

type Tab = 'block1' | 'block2' | 'analytics' | 'students'

// All seat numbers for each block
const BLOCK1_ALL = [
  38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20,
  19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5,
  1, 2, 3, 4,
  39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157,
  139, 138, 137, 136, 135, 134, 133, 132, 131, 130, 129, 128, 127, 126, 125, 124, 123, 122,
  104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121,
  103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86,
  70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85,
  69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55,
]

const BLOCK2_ALL = Array.from({ length: 86 }, (_, i) => i + 1)

export default function DashboardClient() {
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<Tab>('block1')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<SeatWithStudent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      setIsAdmin(user.user_metadata?.role === 'admin')
    })
  }, [router, supabase.auth])

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('students').select('*').eq('is_active', true)
    if (data) setStudents(data as Student[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadStudents() }, [loadStudents])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const buildSeats = (block: 1 | 2, allNums: number[]): SeatWithStudent[] => {
    const unique = [...new Set(allNums)]
    return unique.map(n => {
      const student = students.find(s => s.block === block && s.seat_number === n)
      return { block, seat_number: n, student, status: getSeatStatus(student) }
    })
  }

  const block1Seats = buildSeats(1, BLOCK1_ALL)
  const block2Seats = buildSeats(2, BLOCK2_ALL)

  const overdueCount = students.filter(s => getSeatStatus(s) === 'overdue').length
  const dueSoonCount = students.filter(s => getSeatStatus(s) === 'due-soon').length

  const handleSeatClick = (seat: SeatWithStudent) => {
    setSelectedSeat(seat)
    setShowForm(false)
    setEditingStudent(null)
  }

  const handleVacate = async () => {
    if (!selectedSeat?.student) return
    if (!confirm(`Vacate seat ${selectedSeat.seat_number}? The student will be marked inactive.`)) return
    await supabase.from('students').update({ is_active: false }).eq('id', selectedSeat.student.id)
    setSelectedSeat(null)
    loadStudents()
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.exam.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(s.seat_number).includes(searchQuery)
  )

  const availableTabs: { key: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: 'block1', label: 'Block 1', icon: <Grid3X3 className="w-4 h-4" /> },
    { key: 'block2', label: 'Block 2', icon: <LayoutGrid className="w-4 h-4" /> },
    { key: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
    { key: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" />, adminOnly: true },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0ece4 0%, #e8e0d4 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between"
        style={{ background: 'rgba(248,245,240,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e5ddd0' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d4a017, #c84b31)' }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-stone-800 text-sm leading-none" style={{ fontFamily: 'DM Serif Display, serif' }}>StudyNest</div>
            <div className="text-[10px] text-stone-400">{isAdmin ? '⚡ Admin' : '👤 Staff'}</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-600 font-medium">{students.length} Active</span>
          {dueSoonCount > 0 && <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{dueSoonCount} Due Soon</span>}
          {overdueCount > 0 && <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">{overdueCount} Overdue</span>}
        </div>

        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="px-4 md:px-6 pt-4">
        <div className="flex gap-1 bg-white/50 p-1 rounded-2xl border border-stone-200 w-fit">
          {availableTabs.filter(t => !t.adminOnly || isAdmin).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Color legend for seat views */}
            {(tab === 'block1' || tab === 'block2') && (
              <div className="flex flex-wrap gap-3 mb-4">
                {[
                  { label: 'Vacant', cls: 'bg-emerald-100 border-emerald-300' },
                  { label: 'Occupied', cls: 'bg-rose-200 border-rose-400' },
                  { label: 'Due Soon (≤2 days)', cls: 'bg-amber-200 border-amber-400' },
                  { label: 'Overdue', cls: 'bg-red-500 border-red-700' },
                ].map(({ label, cls }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded border-2 ${cls}`} />
                    <span className="text-xs text-stone-500">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'block1' && (
              <div className="bg-white/60 rounded-2xl p-4 border border-stone-200 overflow-x-auto">
                <h2 className="text-lg font-medium text-stone-700 mb-4" style={{ fontFamily: 'DM Serif Display, serif' }}>Block 1</h2>
                <Block1Grid seatsData={block1Seats} onSeatClick={handleSeatClick} />
              </div>
            )}

            {tab === 'block2' && (
              <div className="bg-white/60 rounded-2xl p-4 border border-stone-200 overflow-x-auto">
                <h2 className="text-lg font-medium text-stone-700 mb-4" style={{ fontFamily: 'DM Serif Display, serif' }}>Block 2</h2>
                <Block2Grid seatsData={block2Seats} onSeatClick={handleSeatClick} />
              </div>
            )}

            {tab === 'analytics' && isAdmin && <Analytics />}

            {tab === 'students' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, exam, college, or seat number…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>

                <div className="space-y-2">
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-12 text-stone-400 text-sm">
                      {searchQuery ? 'No students match your search' : 'No active students yet'}
                    </div>
                  )}
                  {filteredStudents.map(student => {
                    const status = getSeatStatus(student)
                    const badgeColors: Record<string, string> = {
                      occupied: 'bg-rose-100 text-rose-700',
                      'due-soon': 'bg-amber-100 text-amber-700',
                      overdue: 'bg-red-100 text-red-700',
                      vacant: 'bg-stone-100 text-stone-600',
                    }
                    const badgeLabel: Record<string, string> = {
                      occupied: 'Active',
                      'due-soon': 'Due Soon',
                      overdue: 'Overdue',
                      vacant: 'Inactive',
                    }
                    return (
                      <div key={student.id}
                        className="bg-white/70 rounded-2xl p-4 border border-stone-200 flex items-start justify-between gap-4 cursor-pointer hover:border-amber-300 transition-colors"
                        onClick={() => {
                          const seat: SeatWithStudent = { block: student.block as 1 | 2, seat_number: student.seat_number, student, status }
                          setSelectedSeat(seat)
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg, #d4a017, #c84b31)' }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-stone-800">{student.name}</div>
                            <div className="text-xs text-stone-500">{student.exam} · {student.college}</div>
                            <div className="text-xs text-stone-400 mt-0.5">Block {student.block} · Seat {student.seat_number}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColors[status]}`}>{badgeLabel[status]}</span>
                          <div className="text-xs text-stone-400 mt-1">Due: {new Date(student.due_date).toLocaleDateString('en-IN')}</div>
                          {isAdmin && <div className="text-xs font-semibold text-stone-700 mt-0.5">₹{Number(student.amount).toLocaleString('en-IN')}</div>}
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

      {/* Seat Modal */}
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

      {/* Student Form Modal */}
      {showForm && selectedSeat && (
        <StudentForm
          block={selectedSeat.block}
          seatNumber={selectedSeat.seat_number}
          student={editingStudent}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setSelectedSeat(null); loadStudents() }}
        />
      )}
    </div>
  )
}
