'use client'
import { useState, useEffect } from 'react'
import { Student } from '@/lib/types'
import { X, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addMonths, format } from 'date-fns'

interface Props {
  block: number
  seatNumber: number
  student?: Student | null
  onClose: () => void
  onSaved: () => void
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

  // Auto-calculate due date
  useEffect(() => {
    if (form.joining_date && form.duration_months) {
      const due = addMonths(new Date(form.joining_date), Number(form.duration_months))
      setForm(f => ({ ...f, due_date: format(due, 'yyyy-MM-dd') }))
    }
  }, [form.joining_date, form.duration_months])

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      amount: Number(form.amount),
      duration_months: Number(form.duration_months),
      block,
      seat_number: seatNumber,
      is_active: true,
    }

    let err
    if (student?.id) {
      const res = await supabase.from('students').update(payload).eq('id', student.id)
      err = res.error
    } else {
      const res = await supabase.from('students').insert(payload)
      err = res.error
    }

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onSaved()
    }
  }

  const exams = ['UPSC', 'MPSC', 'NEET', 'JEE', 'CA', 'CET', 'Banking', 'Railway', 'SSC', 'Other']
  const accounts = ['Account 1', 'Account 2', 'Cash', 'UPI']

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl bg-white"
        style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
          <div>
            <div className="text-white/50 text-xs uppercase tracking-widest">Block {block} · Seat {seatNumber}</div>
            <h2 className="text-xl text-white mt-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {student ? 'Edit Student' : 'Assign Student'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Full Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Student full name" />
          </div>

          {/* Exam + Insider/Outsider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Exam *</label>
              <select required value={form.exam} onChange={e => set('exam', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                <option value="">Select exam</option>
                {exams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Type *</label>
              <select required value={form.insider_outsider} onChange={e => set('insider_outsider', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                <option value="insider">Insider (Local)</option>
                <option value="outsider">Outsider</option>
              </select>
            </div>
          </div>

          {/* College */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">College *</label>
            <input required value={form.college} onChange={e => set('college', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="College / Institution name" />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Address (as per Aadhaar) *</label>
            <textarea required value={form.address} onChange={e => set('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Complete address as per Aadhaar card" />
          </div>

          {/* Duration + Joining Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Duration (months) *</label>
              <input type="number" required min={1} max={24} value={form.duration_months}
                onChange={e => set('duration_months', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Joining Date *</label>
              <input type="date" required value={form.joining_date} onChange={e => set('joining_date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>

          {/* Due date (auto-calculated, readonly) */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Due Date (Auto-calculated)</div>
            <div className="text-stone-800 font-medium">
              {form.due_date ? new Date(form.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Payment Date *</label>
              <input type="date" required value={form.payment_date} onChange={e => set('payment_date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Amount (₹) *</label>
              <input type="number" required min={0} value={form.amount} onChange={e => set('amount', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="0" />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Account *</label>
            <select required value={form.account} onChange={e => set('account', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="">Select account</option>
              {accounts.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium active:scale-95">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl text-white text-sm font-medium active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #d4a017, #c84b31)' }}>
              <Save className="w-4 h-4" />
              {loading ? 'Saving…' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
