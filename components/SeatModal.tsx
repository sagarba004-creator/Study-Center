'use client'
import { Student, SeatStatus } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'
import { X, User, Calendar, MapPin, BookOpen, CreditCard, Building2, Clock, IndianRupee } from 'lucide-react'

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
  vacant: { label: 'Vacant', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  occupied: { label: 'Occupied', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'due-soon': { label: 'Due Soon', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  overdue: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

export default function SeatModal({ student, seatNumber, block, status, isAdmin, onClose, onAddStudent, onEditStudent, onVacateSeat }: Props) {
  const cfg = STATUS_CONFIG[status]
  const today = new Date()
  const dueDate = student ? new Date(student.due_date) : null
  const daysLeft = dueDate ? differenceInDays(dueDate, today) : null

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Block {block}</div>
              <h2 className="text-2xl text-white" style={{ fontFamily: 'DM Serif Display, serif' }}>
                Seat {seatNumber}
              </h2>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                {cfg.label}
                {daysLeft !== null && status !== 'vacant' && (
                  <span className="ml-1">
                    {daysLeft < 0 ? `(${Math.abs(daysLeft)}d overdue)` : daysLeft === 0 ? '(Today!)' : `(${daysLeft}d left)`}
                  </span>
                )}
              </span>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {status === 'vacant' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-stone-500 mb-6">This seat is available</p>
              {isAdmin && (
                <button onClick={onAddStudent}
                  className="px-6 py-3 rounded-xl text-white font-medium text-sm active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #d4a017, #c84b31)' }}>
                  Assign Student
                </button>
              )}
            </div>
          ) : student ? (
            <div className="space-y-4">
              {/* Student Name */}
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #d4a017, #c84b31)' }}>
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-stone-800">{student.name}</div>
                  <div className="text-xs text-stone-500">{student.insider_outsider === 'insider' ? '📍 Local' : '✈️ Outsider'}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={<BookOpen className="w-4 h-4" />} label="Exam" value={student.exam} />
                <InfoCard icon={<Building2 className="w-4 h-4" />} label="College" value={student.college} />
                <InfoCard icon={<Calendar className="w-4 h-4" />} label="Joined" value={format(new Date(student.joining_date), 'dd MMM yyyy')} />
                <InfoCard icon={<Clock className="w-4 h-4" />} label="Duration" value={`${student.duration_months} month${student.duration_months > 1 ? 's' : ''}`} />
              </div>

              {/* Due Date - prominent */}
              <div className={`p-3 rounded-xl border-2 ${status === 'overdue' ? 'bg-red-50 border-red-200' : status === 'due-soon' ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200'}`}>
                <div className="text-xs text-stone-500 uppercase tracking-wide mb-1">Due Date</div>
                <div className={`font-bold text-lg ${status === 'overdue' ? 'text-red-600' : status === 'due-soon' ? 'text-amber-600' : 'text-stone-800'}`}>
                  {format(new Date(student.due_date), 'dd MMMM yyyy')}
                </div>
                {daysLeft !== null && (
                  <div className={`text-sm mt-1 ${status === 'overdue' ? 'text-red-500' : 'text-stone-500'}`}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today!' : `${daysLeft} days remaining`}
                  </div>
                )}
              </div>

              {/* Admin-only fields */}
              {isAdmin && (
                <>
                  <div className="border-t border-stone-100 pt-3 space-y-3">
                    <InfoCard icon={<MapPin className="w-4 h-4" />} label="Address" value={student.address} full />
                    <div className="grid grid-cols-2 gap-3">
                      <InfoCard icon={<IndianRupee className="w-4 h-4" />} label="Amount Paid" value={`₹${student.amount.toLocaleString('en-IN')}`} />
                      <InfoCard icon={<CreditCard className="w-4 h-4" />} label="Account" value={student.account} />
                    </div>
                    <InfoCard icon={<Calendar className="w-4 h-4" />} label="Payment Date" value={format(new Date(student.payment_date), 'dd MMM yyyy')} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={onEditStudent}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #d4a017, #c84b31)' }}>
                      Edit Student
                    </button>
                    <button onClick={onVacateSeat}
                      className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200 active:scale-95">
                      Vacate Seat
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value, full }: { icon: React.ReactNode; label: string; value: string; full?: boolean }) {
  return (
    <div className={`p-3 bg-stone-50 rounded-xl ${full ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 text-stone-400 text-xs uppercase tracking-wide mb-1">
        {icon} {label}
      </div>
      <div className="text-stone-800 text-sm font-medium">{value}</div>
    </div>
  )
}
