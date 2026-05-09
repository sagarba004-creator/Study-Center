'use client'
import { SeatWithStudent } from '@/lib/types'

interface Props {
  seatsData: SeatWithStudent[]
  onSeatClick: (seat: SeatWithStudent) => void
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  vacant:   { background: '#dcfce7', border: '2px solid #86efac', color: '#166534' },
  occupied: { background: '#fecdd3', border: '2px solid #fb7185', color: '#881337' },
  'due-soon': { background: '#fde68a', border: '2px solid #fbbf24', color: '#78350f' },
  overdue:  { background: '#ef4444', border: '2px solid #b91c1c', color: '#fff' },
}

function S({ n, seatsData, onSeatClick }: { n: number; seatsData: SeatWithStudent[]; onSeatClick: (s: SeatWithStudent) => void }) {
  const seat = seatsData.find(s => s.seat_number === n) || { block: 1 as const, seat_number: n, status: 'vacant' as const }
  const style = STATUS_STYLE[seat.status]
  return (
    <div onClick={() => onSeatClick(seat)}
      title={seat.student?.name || `Seat ${n} (Vacant)`}
      style={{
        ...style, width: '36px', height: '32px', borderRadius: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0,
        transition: 'transform 0.1s', userSelect: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >{n}</div>
  )
}

function Gap({ w = 36 }: { w?: number }) {
  return <div style={{ width: `${w}px`, flexShrink: 0 }} />
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>{children}</div>
}

function EmptyRow() {
  return <div style={{ height: '32px' }} />
}

const label = (text: string, w: number, bg: string, color = 'white'): React.ReactNode => (
  <div style={{
    width: `${w}px`, height: '32px', background: bg, border: `2px solid ${bg === '#ef4444' ? '#b91c1c' : '#15803d'}`,
    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', fontWeight: 'bold', color, flexShrink: 0
  }}>{text}</div>
)

export default function Block1Grid({ seatsData, onSeatClick }: Props) {
  const S2 = ({ n }: { n: number }) => <S n={n} seatsData={seatsData} onSeatClick={onSeatClick} />

  // Measurements to match original layout
  // Each seat: 36px + 3px gap = 39px
  // Left column seats: 39,40,...54 (vertical, one per row)
  // Right column: 20,19,18,...5 (vertical)

  const innerLeftGroup1 = [140,141,142,143,144,145,146,147,148,149,150,151]  // 12 seats
  const innerRightGroup1 = [152,153,154,155,156,157]                           // 6 seats
  const innerLeftGroup1b = [139,138,137,136,135,134,133,132,131,130,129,128]
  const innerRightGroup1b = [127,126,125,124,123,122]

  const innerLeftGroup2 = [104,105,106,107,108,109,110,111,112,113,114,115]
  const innerRightGroup2 = [116,117,118,119,120,121]
  const innerLeftGroup2b = [103,102,101,100,99,98,97,96,95,94,93,92]
  const innerRightGroup2b = [91,90,89,88,87,86]

  const innerLeftGroup3 = [70,71,72,73,74,75,76,77,78,79,80,81]
  const innerRightGroup3 = [82,83,84,85]
  const innerLeftGroup3b = [69,68,67,66,65,64,63,62,61,60,59,58]
  const innerRightGroup3b = [57,56,55]

  // Gap between left 12-seat group and right 6-seat group
  // 12 seats = 12*36 + 11*3 = 432+33 = 465px
  // 6 seats = 6*36 + 5*3 = 216+15 = 231px
  // gap in original appears to be ~1 seat width gap between clusters
  const midGap = 42

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
      <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'flex-start' }}>

        {/* LEFT PERIMETER COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {/* Spacer for top row */}
          <div style={{ height: '32px' }} />
          {/* Rows 39-54 */}
          {[39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54].map(n => (
            <S2 key={n} n={n} />
          ))}
        </div>

        {/* MAIN INTERIOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>

          {/* TOP ROW: 38, 37→21, 20 */}
          <Row>
            <S2 n={38} />
            <Gap w={6} />
            {[37,36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21].map(n => <S2 key={n} n={n} />)}
            <Gap w={6} />
            <S2 n={20} />
          </Row>

          {/* Rows 39, 40 — empty interior */}
          <EmptyRow />
          <EmptyRow />

          {/* Row 41: inner table top */}
          <Row>
            {innerLeftGroup1.map(n => <S2 key={n} n={n} />)}
            <Gap w={midGap} />
            {innerRightGroup1.map(n => <S2 key={n} n={n} />)}
          </Row>
          {/* Row 42: inner table bottom */}
          <Row>
            {innerLeftGroup1b.map(n => <S2 key={n} n={n} />)}
            <Gap w={midGap} />
            {innerRightGroup1b.map(n => <S2 key={n} n={n} />)}
          </Row>

          {/* Rows 43, 44 — empty */}
          <EmptyRow />
          <EmptyRow />

          {/* Row 45 */}
          <Row>
            {innerLeftGroup2.map(n => <S2 key={n} n={n} />)}
            <Gap w={midGap} />
            {innerRightGroup2.map(n => <S2 key={n} n={n} />)}
          </Row>
          {/* Row 46 */}
          <Row>
            {innerLeftGroup2b.map(n => <S2 key={n} n={n} />)}
            <Gap w={midGap} />
            {innerRightGroup2b.map(n => <S2 key={n} n={n} />)}
          </Row>

          {/* Rows 47, 48 — empty */}
          <EmptyRow />
          <EmptyRow />

          {/* Row 49 */}
          <Row>
            {innerLeftGroup3.map(n => <S2 key={n} n={n} />)}
            <Gap w={midGap + (6*39)} />
            {innerRightGroup3.map(n => <S2 key={n} n={n} />)}
          </Row>
          {/* Row 50 */}
          <Row>
            {innerLeftGroup3b.map(n => <S2 key={n} n={n} />)}
            <Gap w={midGap + (6*39)} />
            {innerRightGroup3b.map(n => <S2 key={n} n={n} />)}
            <Gap w={36} /> {/* empty last cell */}
          </Row>

          {/* Rows 51-52 empty before bottom */}
          <EmptyRow />
          <EmptyRow />

          {/* BOTTOM ROW: 51,52,53,54 | WASHROOMS | ENTRANCE | 1,2,3,4 */}
          <Row>
            {[51,52,53,54].map(n => <S2 key={n} n={n} />)}
            <Gap w={3} />
            {label('WASHROOMS', 285, '#ef4444')}
            <Gap w={3} />
            {label('ENTRANCE', 195, '#22c55e')}
            <Gap w={3} />
            {[1,2,3,4].map(n => <S2 key={n} n={n} />)}
          </Row>
        </div>

        {/* RIGHT PERIMETER COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {/* Spacer for top row (38 row) */}
          <div style={{ height: '32px' }} />
          {/* 19 down to 5 */}
          {[19,18,17,16,15,14,13,12,11,10,9,8,7,6,5].map(n => (
            <S2 key={n} n={n} />
          ))}
        </div>

      </div>
    </div>
  )
}
