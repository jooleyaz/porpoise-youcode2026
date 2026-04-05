'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import { getSession } from '@/lib/session'
import { getShifts, getAvailability } from '@/lib/api'
import type { AvailabilityRecurring } from '@/types'

// Hours to display (6am–10pm)
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function formatHour(h: number) {
  if (h === 12) return '12pm'
  if (h === 0) return '12am'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

interface ShiftBlock {
  dayIndex: number   // 0–6
  startHour: number
  endHour: number
  label: string
  shiftId: string
}

// Demo data for dev fallback
const DEMO_SHIFTS: ShiftBlock[] = [
  { dayIndex: 3, startHour: 18, endHour: 20, label: 'Cook · 6–8pm', shiftId: 's1' },
  { dayIndex: 4, startHour: 17, endHour: 21, label: 'Server · 5–9pm', shiftId: 's2' },
  { dayIndex: 0, startHour: 9, endHour: 12, label: 'Setup · 9am–12', shiftId: 's3' },
]

// Demo availability: free evenings Mon–Fri, all day Sat
const DEMO_AVAIL: AvailabilityRecurring[] = [
  { id: 'r1', user_id: '', day_of_week: 1, start_time: '17:00', end_time: '22:00' },
  { id: 'r2', user_id: '', day_of_week: 2, start_time: '17:00', end_time: '22:00' },
  { id: 'r3', user_id: '', day_of_week: 3, start_time: '17:00', end_time: '22:00' },
  { id: 'r4', user_id: '', day_of_week: 4, start_time: '17:00', end_time: '22:00' },
  { id: 'r5', user_id: '', day_of_week: 5, start_time: '17:00', end_time: '22:00' },
  { id: 'r6', user_id: '', day_of_week: 6, start_time: '08:00', end_time: '22:00' },
]

export default function MyShiftsPage() {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [shiftBlocks, setShiftBlocks] = useState<ShiftBlock[]>(DEMO_SHIFTS)
  const [availability, setAvailability] = useState<AvailabilityRecurring[]>(DEMO_AVAIL)

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }
    if (session.isAdmin) { router.replace('/shifts'); return }

    // Load availability
    getAvailability(session.userId)
      .then(r => { if (r.recurring.length) setAvailability(r.recurring) })
      .catch(() => {})

    // Load assigned shifts for the week
    getShifts()
      .then(shifts => {
        const blocks: ShiftBlock[] = []
        shifts.forEach(s => {
          const date = new Date(s.shift_date)
          const dow = date.getDay()
          const startH = parseInt(s.start_time.split(':')[0])
          const endH = parseInt(s.end_time.split(':')[0])
          const role = s.positions?.[0]?.role?.name ?? 'Shift'
          blocks.push({ dayIndex: dow, startHour: startH, endHour: endH, label: `${role} · ${formatHour(startH)}–${formatHour(endH)}`, shiftId: s.id })
        })
        if (blocks.length) setShiftBlocks(blocks)
      })
      .catch(() => {})
  }, [router, weekStart])

  // Availability lookup: is a given day/hour "available"?
  function isAvail(dayIndex: number, hour: number) {
    return availability.some(a => {
      if (a.day_of_week !== dayIndex) return false
      const start = parseInt(a.start_time.split(':')[0])
      const end = parseInt(a.end_time.split(':')[0])
      return hour >= start && hour < end
    })
  }

  // Shift lookup: is a given day/hour occupied by a shift?
  function shiftAt(dayIndex: number, hour: number): ShiftBlock | undefined {
    return shiftBlocks.find(b => b.dayIndex === dayIndex && hour >= b.startHour && hour < b.endHour)
  }

  function shiftStartsAt(dayIndex: number, hour: number): ShiftBlock | undefined {
    return shiftBlocks.find(b => b.dayIndex === dayIndex && b.startHour === hour)
  }

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))

  const weekLabel = `${DAYS[0]} ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${DAYS[6]} ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <PageShell className="gap-[8px]">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <button onClick={prevWeek} className="text-[11px] text-[#9aa0bc] hover:text-[#3D4975]">← prev</button>
          <div className="text-[13px] font-semibold text-[#2a2a3d]">{weekLabel}</div>
          <button onClick={nextWeek} className="text-[11px] text-[#9aa0bc] hover:text-[#3D4975]">next →</button>
        </div>
        <button
          onClick={() => router.push('/availability')}
          className="bg-[#BDDEDE] text-[#2d5a5a] rounded-lg px-[10px] py-[5px] text-[11px] font-medium flex items-center gap-1"
        >
          Edit availability ✏️
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-[10px] text-[10px] text-[#5a6490]">
        <div className="flex items-center gap-1"><div className="w-[10px] h-[10px] rounded bg-[#C2CAE7]" /> Your shift</div>
        <div className="flex items-center gap-1"><div className="w-[10px] h-[10px] rounded bg-[#eef8f2]" /> Available</div>
        <div className="flex items-center gap-1">
          <div className="w-[10px] h-[10px] rounded" style={{ background: 'repeating-linear-gradient(45deg,#e8d9b8,#e8d9b8 2px,#f5eedd 2px,#f5eedd 5px)' }} />
          Busy
        </div>
      </div>

      {/* Week grid */}
      <div className="border border-[#e8eaf0] rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b border-[#e8eaf0]" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div className="bg-[#fafafa]" />
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(weekStart, i)
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={`text-center py-[5px] text-[9px] font-semibold border-l border-[#e8eaf0] ${isToday ? 'text-[#3D4975]' : 'text-[#5a6490]'}`}>
                <div>{DAY_SHORT[i]}</div>
                <div className={`text-[8px] font-normal ${isToday ? 'font-semibold' : ''}`}>{d.getDate()}</div>
              </div>
            )
          })}
        </div>

        {/* Hour rows */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid border-b border-[#f0f2f6] last:border-b-0" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            {/* Time label */}
            <div className="text-[8px] text-[#9aa0bc] text-right pr-[6px] flex items-center justify-end h-[28px] bg-[#fafafa] border-r border-[#e8eaf0]">
              {formatHour(hour)}
            </div>

            {/* Day cells */}
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const shift = shiftAt(dayIdx, hour)
              const startsHere = shiftStartsAt(dayIdx, hour)
              const avail = isAvail(dayIdx, hour)

              let cellBg = ''
              if (shift) {
                cellBg = 'bg-[#C2CAE7]'
              } else if (avail) {
                cellBg = 'bg-[#eef8f2]'
              } else {
                cellBg = ''
              }

              return (
                <div
                  key={dayIdx}
                  className={`h-[28px] border-l border-[#f0f2f6] relative ${cellBg}`}
                  style={!shift && !avail ? { background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(232,217,184,0.3) 4px,rgba(232,217,184,0.3) 8px)' } : undefined}
                >
                  {startsHere && (
                    <div className="absolute inset-x-0 top-0 px-[3px] py-[2px] z-10">
                      <div
                        className="text-[8px] font-semibold text-[#1a4a7a] leading-tight truncate cursor-pointer hover:opacity-80"
                        onClick={() => router.push(`/drop?shiftId=${startsHere.shiftId}`)}
                        title={startsHere.label}
                      >
                        {startsHere.label}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </PageShell>
  )
}
