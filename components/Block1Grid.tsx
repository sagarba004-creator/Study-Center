'use client'
import { SeatWithStudent, getSeatStatus } from '@/lib/types'

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
      className={`seat-cell w-9 h-8 rounded border-2 flex items-center justify-center text-[10px] font-bold select-none ${cls}`}
      title={seat.student?.name || `Seat ${seat.seat_number} (Vacant)`}>
      {seat.seat_number}
    </div>
  )
}

function EmptyCell({ wide }: { wide?: boolean }) {
  return <div className={`${wide ? 'w-9' : 'w-9'} h-8`} />
}

function LabelCell({ label, rows = 1 }: { label: string; rows?: number }) {
  return (
    <div className={`w-12 flex items-center justify-center text-[10px] text-stone-400 font-medium ${rows > 1 ? 'row-span-2' : ''}`}>
      {label}
    </div>
  )
}

export default function Block1Grid({ seatsData, onSeatClick }: Props) {
  const seatMap = new Map(seatsData.map(s => [s.seat_number, s]))
  const getSeat = (n: number): SeatWithStudent => seatMap.get(n) || { block: 1, seat_number: n, status: 'vacant' }

  const topSeats = [37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21]
  const row41 = [140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151]
  const row41b = [152, 153, 154, 155, 156, 157]
  const row42 = [139, 138, 137, 136, 135, 134, 133, 132, 131, 130, 129, 128]
  const row42b = [127, 126, 125, 124, 123, 122]
  const row45 = [104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115]
  const row45b = [116, 117, 118, 119, 120, 121]
  const row46 = [103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92]
  const row46b = [91, 90, 89, 88, 87, 86]
  const row49 = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81]
  const row49b = [82, 83, 84, 85]
  const row50 = [69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 58]
  const row50b = [57, 56, 55]

  const leftCol = [39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]
  const rightCol = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5]

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-block min-w-max">
        {/* Top perimeter row */}
        <div className="flex gap-1 mb-1 ml-12">
          <SeatCell seat={getSeat(38)} onClick={() => onSeatClick(getSeat(38))} />
          <div className="w-3" />
          {topSeats.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
          <div className="w-3" />
          <SeatCell seat={getSeat(20)} onClick={() => onSeatClick(getSeat(20))} />
        </div>

        {/* Main content area */}
        <div className="flex gap-2">
          {/* Left column */}
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-stone-400 text-center mb-1 w-12">Row</div>
            {leftCol.map((n, i) => (
              <div key={n} className="flex items-center gap-1">
                <span className="text-[9px] text-stone-400 w-5 text-right">{39 + i}</span>
                <SeatCell seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />
              </div>
            ))}
            {[51, 52, 53, 54].map((n, i) => (
              <div key={n} className="flex items-center gap-1">
                <span className="text-[9px] text-stone-400 w-5 text-right">{51 + i}</span>
                <SeatCell seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />
              </div>
            ))}
          </div>

          {/* Interior */}
          <div className="flex flex-col gap-1 pt-6">
            {/* Empty rows 38-40 */}
            <div className="h-8" />
            <div className="h-8" />

            {/* Row 41 */}
            <div className="flex gap-1">
              {row41.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-4" />
              {row41b.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
            </div>
            {/* Row 42 */}
            <div className="flex gap-1">
              {row42.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-4" />
              {row42b.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
            </div>

            {/* Empty rows 43-44 */}
            <div className="h-8" />
            <div className="h-8" />

            {/* Row 45 */}
            <div className="flex gap-1">
              {row45.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-4" />
              {row45b.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
            </div>
            {/* Row 46 */}
            <div className="flex gap-1">
              {row46.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-4" />
              {row46b.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
            </div>

            {/* Empty rows 47-48 */}
            <div className="h-8" />
            <div className="h-8" />

            {/* Row 49 */}
            <div className="flex gap-1">
              {row49.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-[148px]" />
              {row49b.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
            </div>
            {/* Row 50 */}
            <div className="flex gap-1">
              {row50.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-[148px]" />
              {row50b.map(n => <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />)}
              <div className="w-9 h-8 bg-stone-100 rounded border-2 border-dashed border-stone-200" />
            </div>

            {/* Empty */}
            <div className="h-8" />
            <div className="h-8" />

            {/* Bottom row: washrooms + entrance + bottom seats */}
            <div className="flex gap-1 items-center">
              <SeatCell seat={getSeat(51)} onClick={() => onSeatClick(getSeat(51))} />
              <SeatCell seat={getSeat(52)} onClick={() => onSeatClick(getSeat(52))} />
              <SeatCell seat={getSeat(53)} onClick={() => onSeatClick(getSeat(53))} />
              <SeatCell seat={getSeat(54)} onClick={() => onSeatClick(getSeat(54))} />
              <div className="flex items-center justify-center rounded border-2 border-red-600 bg-red-500 text-white text-[9px] font-bold h-8"
                style={{ width: '268px' }}>WASHROOMS</div>
              <div className="flex items-center justify-center rounded border-2 border-green-600 bg-green-500 text-white text-[9px] font-bold h-8"
                style={{ width: '180px' }}>ENTRANCE</div>
              <SeatCell seat={getSeat(1)} onClick={() => onSeatClick(getSeat(1))} />
              <SeatCell seat={getSeat(2)} onClick={() => onSeatClick(getSeat(2))} />
              <SeatCell seat={getSeat(3)} onClick={() => onSeatClick(getSeat(3))} />
              <SeatCell seat={getSeat(4)} onClick={() => onSeatClick(getSeat(4))} />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-1 pt-6">
            {rightCol.map((n, i) => (
              <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />
            ))}
            {[5, 6, 7, 8].map(n => (
              <SeatCell key={n} seat={getSeat(n)} onClick={() => onSeatClick(getSeat(n))} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
