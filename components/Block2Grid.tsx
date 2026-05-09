'use client'
import { SeatWithStudent } from '@/lib/types'

interface Props {
  seatsData: SeatWithStudent[]
  onSeatClick: (seat: SeatWithStudent) => void
}

const STATUS_CLASS: Record<string, string> = {
  vacant: 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200',
  occupied: 'bg-rose-200 border-rose-400 text-rose-900 hover:bg-rose-300',
  'due-soon': 'bg-amber-200 border-amber-400 text-amber-900 animate-pulse-warning',
  overdue: 'bg-red-500 border-red-700 text-white animate-pulse-danger',
}

function SeatCell({ seat, onClick }: { seat: SeatWithStudent; onClick: () => void }) {
  const cls = STATUS_CLASS[seat.status]
  return (
    <div onClick={onClick}
      className={`seat-cell w-10 h-9 rounded border-2 flex items-center justify-center text-[11px] font-bold select-none ${cls}`}
      title={seat.student?.name || `Seat ${seat.seat_number} (Vacant)`}>
      {seat.seat_number}
    </div>
  )
}

export default function Block2Grid({ seatsData, onSeatClick }: Props) {
  const seatMap = new Map(seatsData.map(s => [s.seat_number, s]))
  const getSeat = (n: number): SeatWithStudent => seatMap.get(n) || { block: 2, seat_number: n, status: 'vacant' }

  const topRow = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  const row12 = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
  const row37 = [37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25]
  const row38 = [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]
  const row56 = [56, 55, 54, 53, 52, 51, 50, 49]
  const row57 = [57, 58, 59, 60, 61, 62, 63, 64]
  const rightColPairs = [[75, 76], [74, 77], [73, 78], [72, 79], [71, 80], [70, 81], [69, 82], [68, 83], [67, 84], [66, 85], [65, 86]]

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex gap-2">
        {/* Main block */}
        <div className="flex flex-col gap-1">
          {/* Top row: 11-1 + ENTRANCE */}
          <div className="flex gap-1 items-center">
            {topRow.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
            <div className="flex items-center justify-center rounded border-2 border-green-600 bg-green-500 text-white text-[9px] font-bold h-9 ml-1"
              style={{ width: '100px' }}>ENTRANCE</div>
          </div>

          {/* Gap */}
          <div className="h-9" />

          {/* Row 12-24 */}
          <div className="flex gap-1">
            {row12.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
          </div>
          {/* Row 37-25 */}
          <div className="flex gap-1">
            {row37.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
          </div>

          {/* Gap */}
          <div className="h-9" />
          <div className="h-9" />

          {/* Row 38-48 */}
          <div className="flex gap-1">
            {row38.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
          </div>

          {/* Gap */}
          <div className="h-9" />

          {/* Washrooms row */}
          <div className="flex gap-1 items-center">
            <div className="flex items-center justify-center rounded border-2 border-red-600 bg-red-500 text-white text-[9px] font-bold h-9"
              style={{ width: '170px' }}>WASHROOMS</div>
            <div className="w-4" />
            {/* Row 56-49 */}
            {row56.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
          </div>
          {/* Row 57-64 */}
          <div className="flex gap-1" style={{ marginLeft: '182px' }}>
            {row57.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
          </div>

          {/* Bottom gap */}
          <div className="h-9" />
        </div>

        {/* Right column - pairs */}
        <div className="flex flex-col gap-1 pt-9">
          <div className="h-9" /> {/* gap row */}
          {rightColPairs.map(([a, b]) => (
            <div key={a} className="flex gap-1">
              <SeatCell seat={getSeat(a)} onClick={() => onSeatClick(getSeat(a))} />
              <SeatCell seat={getSeat(b)} onClick={() => onSeatClick(getSeat(b))} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
