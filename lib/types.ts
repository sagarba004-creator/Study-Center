export type Block = 1 | 2

export type SeatStatus = 'vacant' | 'occupied' | 'due-soon' | 'overdue'

export interface Seat {
  block: Block
  seat_number: number
}

export interface Student {
  id: string
  name: string
  exam: string
  insider_outsider: 'insider' | 'outsider'
  address: string
  college: string
  duration_months: number
  duration: string | null
  payment_date: string
  amount: number
  account: string
  joining_date: string
  due_date: string
  block: Block
  seat_number: number | null
  is_active: boolean
  is_flexible: boolean
  security_deposit: number
  security_deposit_status: 'none' | 'collected' | 'refunded' | 'forfeited'
  phone: string | null
  locker_numbers: number[]
  locker_amount: number
  locker_account: string | null
  locker_start_date: string | null
  locker_due_date: string | null
  refund_amount: number
  refund_account: string | null
  refund_date: string | null
  vacated_at: string | null
  vacate_notes: string | null
  created_at: string
  updated_at: string
}

export interface SeatWithStudent {
  block: Block
  seat_number: number | null
  student?: Student
  status: SeatStatus
}

export interface UserRole {
  role: 'admin' | 'user'
}

export interface Analytics {
  block: number
  payment_month: string
  payment_week: string
  account: string
  student_count: number
  total_amount: number
  avg_amount: number
}

// Block 1 layout definition
export const BLOCK1_LAYOUT = {
  // Outer seats (perimeter)
  outerTop: [38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20],
  outerLeft: [39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  outerRight: [19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5],
  outerBottom: [1, 2, 3, 4],
  // Inner rows (tables)
  innerRows: [
    // Row group 1 (rows 41-42)
    { top: [140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, null, 152, 153, 154, 155, 156, 157] },
    { bottom: [139, 138, 137, 136, 135, 134, 133, 132, 131, 130, 129, 128, null, 127, 126, 125, 124, 123, 122] },
    // Row group 2 (rows 45-46)
    { top: [104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, null, 116, 117, 118, 119, 120, 121] },
    { bottom: [103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, null, 91, 90, 89, 88, 87, 86] },
    // Row group 3 (rows 49-50)
    { top: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, null, null, null, null, 82, 83, 84, 85] },
    { bottom: [69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58, null, null, null, null, 57, 56, 55, null] },
  ]
}

// Block 2 layout definition
export const BLOCK2_LAYOUT = {
  topRow: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  rightColumn: [75, 76, 74, 77, 73, 78, 72, 79, 71, 80, 70, 81, 69, 82, 68, 83, 67, 84, 66, 85, 65, 86],
  innerRows: [
    { top: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
    { bottom: [37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25] },
    { top: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48] },
    { top: [56, 55, 54, 53, 52, 51, 50, 49] },
    { bottom: [57, 58, 59, 60, 61, 62, 63, 64] },
  ]
}

export function getSeatStatus(student: Student | undefined): SeatStatus {
  if (!student || !student.is_active) return 'vacant'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(student.due_date)
  dueDate.setHours(0, 0, 0, 0)
  const twoDaysBefore = new Date(dueDate)
  twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
  
  if (today >= dueDate) return 'overdue'
  if (today >= twoDaysBefore) return 'due-soon'
  return 'occupied'
}

export const STATUS_COLORS = {
  vacant: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-400' },
  occupied: { bg: 'bg-rose-200', border: 'border-rose-400', text: 'text-rose-900', dot: 'bg-rose-500' },
  'due-soon': { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900', dot: 'bg-amber-500' },
  overdue: { bg: 'bg-red-500', border: 'border-red-700', text: 'text-white', dot: 'bg-red-800' },
}

export interface Locker {
  id: string
  locker_number: number
  is_active: boolean
}

export interface StudentLocker {
  id: string
  student_id: string
  locker_number: number
  amount: number
  account: string
  assigned_date: string
  due_date: string
  is_active: boolean
  vacated_at: string | null
  created_at: string
  // Joined
  student?: Student
}

export type LockerStatus = 'vacant' | 'occupied' | 'due-soon' | 'overdue'

export function getLockerStatus(assignment: StudentLocker | undefined): LockerStatus {
  if (!assignment || !assignment.is_active) return 'vacant'
  return getSeatStatus({ due_date: assignment.due_date } as Student) as LockerStatus
}
