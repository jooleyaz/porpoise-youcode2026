import type { Shift } from '@/types'

interface UpcomingListProps {
  shifts: Array<{ date: string; time: string; role: string }>
}

export default function UpcomingList({ shifts }: UpcomingListProps) {
  return (
    <div className="bg-[#C2CAE7] rounded-xl px-[12px] py-[10px]">
      <div className="text-[12px] font-bold text-[#3D4975] mb-[6px]">Upcoming shifts:</div>
      {shifts.length === 0 ? (
        <div className="text-[11px] text-[#5a6490]">No upcoming shifts.</div>
      ) : (
        shifts.map((s, i) => (
          <div key={i} className="text-[11px] text-[#4a5280] py-0.5">
            {s.date}, {s.time} — {s.role}
          </div>
        ))
      )}
    </div>
  )
}
