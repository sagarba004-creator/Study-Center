'use client'
import { SeatWithStudent } from '@/lib/types'

interface Props {
  seatsData: (SeatWithStudent & { _dimmed?: boolean })[]
  onSeatClick: (seat: SeatWithStudent) => void
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  vacant:     { background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.5)', color: '#4ade80' },
  occupied:   { background: 'rgba(249,168,212,0.25)', border: '2px solid rgba(249,168,212,0.5)', color: '#f9a8d4' },
  'due-soon': { background: 'rgba(253,224,71,0.25)', border: '2px solid rgba(253,224,71,0.5)', color: '#fde047' },
  overdue:    { background: 'rgba(239,68,68,0.6)', border: '2px solid rgba(239,68,68,0.8)', color: '#fff' },
}

function S({ n, seatsData, onSeatClick }: { n: number; seatsData: (SeatWithStudent & { _dimmed?: boolean })[]; onSeatClick: (s: SeatWithStudent) => void }) {
  const seat = seatsData.find(s => s.seat_number === n) || { block: 2 as const, seat_number: n, status: 'vacant' as const }
  const dimmed = (seat as any)._dimmed
  return (
    <div onClick={() => !dimmed && onSeatClick(seat)}
      title={seat.student?.name || `Seat ${n} (Vacant)`}
      style={{
        ...STATUS_STYLE[seat.status], width: '38px', height: '34px', borderRadius: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 'bold', cursor: dimmed ? 'default' : 'pointer', flexShrink: 0,
        transition: 'transform 0.1s', userSelect: 'none',
        opacity: dimmed ? 0.2 : 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >{n}</div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>{children}</div>
}

function EmptyRow() { return <div style={{ height: '34px' }} /> }
function Gap({ w }: { w: number }) { return <div style={{ width: `${w}px`, flexShrink: 0 }} /> }

export default function Block2Grid({ seatsData, onSeatClick }: Props) {
  const S2 = ({ n }: { n: number }) => <S n={n} seatsData={seatsData} onSeatClick={onSeatClick} />

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
      <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'flex-start' }}>

        {/* MAIN LEFT BLOCK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>

          {/* Top row: 11→1 + ENTRANCE */}
          <Row>
            {[11,10,9,8,7,6,5,4,3,2,1].map(n => <S2 key={n} n={n} />)}
            <Gap w={3} />
            <div style={{
              width: '120px', height: '34px', background: '#22c55e', border: '2px solid #15803d',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold', color: 'white', flexShrink: 0
            }}>ENTRANCE</div>
          </Row>

          {/* Gap */}
          <EmptyRow />
          <EmptyRow />

          {/* Rows 12–24 and 37–25 */}
          <Row>{[12,13,14,15,16,17,18,19,20,21,22,23,24].map(n => <S2 key={n} n={n} />)}</Row>
          <Row>{[37,36,35,34,33,32,31,30,29,28,27,26,25].map(n => <S2 key={n} n={n} />)}</Row>

          {/* Gap */}
          <EmptyRow />
          <EmptyRow />

          {/* Row 38–48 */}
          <Row>{[38,39,40,41,42,43,44,45,46,47,48].map(n => <S2 key={n} n={n} />)}</Row>

          {/* Gap */}
          <EmptyRow />

          {/* WASHROOMS row + seats 56–49 */}
          <Row>
            <div style={{
              width: '180px', height: '34px', background: '#ef4444', border: '2px solid #b91c1c',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold', color: 'white', flexShrink: 0
            }}>WASHROOMS</div>
            <Gap w={6} />
            {[56,55,54,53,52,51,50,49].map(n => <S2 key={n} n={n} />)}
          </Row>

          {/* Row 57–64 aligned with seats above */}
          <Row>
            <Gap w={192} />
            {[57,58,59,60,61,62,63,64].map(n => <S2 key={n} n={n} />)}
          </Row>

          <EmptyRow />
        </div>

        {/* RIGHT COLUMN — pairs: 75/76, 74/77, 73/78 ... 65/86 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginLeft: '6px' }}>
          <EmptyRow /> {/* align with gap after top row */}
          <EmptyRow />
          {[
            [75,76],[74,77],[73,78],[72,79],[71,80],
            [70,81],[69,82],[68,83],[67,84],[66,85],[65,86]
          ].map(([a, b]) => (
            <Row key={a}>
              <S2 n={a} />
              <S2 n={b} />
            </Row>
          ))}
        </div>

      </div>
    </div>
  )
}
