'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import PorpoiseIcon from '@/components/ui/PorpoiseIcon'
import Button from '@/components/ui/Button'
import ChartArea from '@/components/admin/ChartArea'
import { getSession } from '@/lib/session'
import { getShifts } from '@/lib/api'

interface UpcomingShift { date: string; time: string; role: string; location?: string }

const FALLBACK_SHIFTS: UpcomingShift[] = [
  { date: 'May 3', time: '6:30–8:30pm', role: 'Cook', location: 'Sprouts Cafe' },
  { date: 'May 4', time: '5:00–9:00pm', role: 'Server', location: 'Sprouts Cafe' },
  { date: 'May 7', time: '9:00am–12pm', role: 'Setup', location: 'Sprouts Cafe' },
]

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [name, setName] = useState('Volunteer')
  const [shiftsThisMonth] = useState(7)
  const [streakWeeks] = useState(3)
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>(FALLBACK_SHIFTS)

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }
    if (session.isAdmin) { router.replace('/shifts'); return }
    setName(session.name)

    getShifts({ status: 'open' })
      .then(shifts => {
        const mapped = shifts.slice(0, 5).map(s => ({
          date: new Date(s.shift_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: `${formatTime(s.start_time)}–${formatTime(s.end_time)}`,
          role: s.positions?.[0]?.role?.name ?? 'Staff',
        }))
        if (mapped.length) setUpcomingShifts(mapped)
      })
      .catch(() => {})
  }, [router])

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] text-[#2a2a3d]">
            {/* Desktop: more personal greeting */}
            <span className="hidden md:inline">Welcome back, <strong>{name}</strong></span>
            <span className="md:hidden">Hello <strong>{name}!</strong></span>
          </div>
          <div className="hidden md:block text-[11px] text-[#9aa0bc] mt-0.5">
            You&rsquo;ve volunteered {shiftsThisMonth} times this month — the team appreciates every single one.
          </div>
        </div>
        <PorpoiseIcon size={28} className="opacity-50 md:hidden" />
        {/* Desktop: Pick up a shift CTA in header */}
        <button
          onClick={() => router.push('/pickup')}
          className="hidden md:block bg-[#3D4975] text-white rounded-lg px-[12px] py-[5px] text-[11px] font-medium"
        >
          Pick up a shift
        </button>
      </div>

      {/* Desktop: stat tiles row */}
      <div className="hidden md:flex gap-[10px]">
        <div className="flex-1 bg-[#C2CAE7] rounded-xl px-[12px] py-[10px]">
          <div className="text-[20px] font-semibold text-[#3D4975] leading-tight">{shiftsThisMonth}</div>
          <div className="text-[10px] text-[#7a80a0]">Shifts this month</div>
          <div className="text-[10px] text-[#9aa0bc]">{streakWeeks}-week streak</div>
        </div>
        <div className="flex-1 bg-[#D8EAEF] rounded-xl px-[12px] py-[10px]">
          <div className="text-[20px] font-semibold text-[#3D4975] leading-tight">{shiftsThisMonth * 3}h</div>
          <div className="text-[10px] text-[#7a80a0]">Hours contributed</div>
          <div className="text-[10px] text-[#9aa0bc]">this month</div>
        </div>
        <div className="flex-1 bg-[#f0f2f8] rounded-xl px-[12px] py-[10px]">
          <div className="text-[20px] font-semibold text-[#3D4975] leading-tight">3</div>
          <div className="text-[10px] text-[#7a80a0]">Badges earned</div>
          <div className="text-[10px] text-[#9aa0bc]">1 locked</div>
        </div>
      </div>

      {/* Mobile: streak banner */}
      <div className="md:hidden bg-[#3D4975] rounded-xl px-[12px] py-[10px] flex items-center gap-[10px]">
        <div className="text-[22px] font-bold text-white leading-none">{shiftsThisMonth}</div>
        <div>
          <div className="text-[11px] text-[#c2cae7]">shifts this month</div>
          <div className="text-[10px] text-[#8a96c0] mt-[1px]">
            {streakWeeks > 0 ? `You're on a ${streakWeeks}-week streak. Thank you!` : 'Keep it up!'}
          </div>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-[6px]">
        <span className="flex items-center gap-1 bg-[#3D4975] text-white rounded-full px-[8px] py-[4px] text-[10px] font-medium">
          ⚡ Last Minute Hero
        </span>
        <span className="flex items-center gap-1 bg-[#C2CAE7] text-[#3D4975] rounded-full px-[8px] py-[4px] text-[10px] font-medium">
          🔥 On a Roll
        </span>
        <span className="flex items-center gap-1 bg-[#C2CAE7] text-[#3D4975] rounded-full px-[8px] py-[4px] text-[10px] font-medium">
          🤝 Team Player
        </span>
        <span className="flex items-center gap-1 bg-[#f0f2f8] text-[#9aa0bc] rounded-full px-[8px] py-[4px] text-[10px] font-medium opacity-60">
          🌟 25 shifts — 18 to go
        </span>
      </div>

      {/* Upcoming shifts */}
      <div>
        <div className="text-[12px] font-semibold text-[#2a2a3d] mb-2">Upcoming shifts</div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#eef0f6]">
                {['Date', 'Time', 'Role', 'Location', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] text-[#9aa0bc] font-medium pb-[6px] px-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingShifts.map((s, i) => (
                <tr key={i} className="border-b border-[#f0f2f6]">
                  <td className="text-[11px] text-[#3D4975] font-semibold px-[10px] py-[8px]">{s.date}</td>
                  <td className="text-[11px] text-[#3D4975] px-[10px] py-[8px]">{s.time}</td>
                  <td className="text-[11px] text-[#3D4975] px-[10px] py-[8px]">{s.role}</td>
                  <td className="text-[11px] text-[#9aa0bc] px-[10px] py-[8px]">{s.location ?? '—'}</td>
                  <td className="px-[10px] py-[8px]">
                    <button
                      onClick={() => router.push('/drop')}
                      className="text-[10px] text-[#9aa0bc] underline underline-offset-2 hover:text-[#533A3A]"
                    >
                      Can&rsquo;t make it
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile upcoming list */}
        <div className="md:hidden bg-[#C2CAE7] rounded-xl px-[12px] py-[10px]">
          <div className="text-[12px] font-bold text-[#3D4975] mb-[5px]">Upcoming shifts:</div>
          {upcomingShifts.map((s, i) => (
            <div key={i} className="text-[11px] text-[#4a5280] py-[2px]">
              {s.date}, {s.time} — {s.role}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile-only action buttons */}
      <div className="md:hidden flex flex-col gap-[8px]">
        <Button variant="primary" onClick={() => router.push('/pickup')}>Pick up a shift</Button>
        <Button variant="ghost" onClick={() => router.push('/availability')}>Change availability</Button>
      </div>

      {/* Desktop action buttons */}
      <div className="hidden md:flex gap-[8px]">
        <Button variant="ghost" onClick={() => router.push('/availability')}>Edit availability</Button>
      </div>

      <ChartArea title="Your shifts per month" />

      <button className="bg-[#BDDEDE] text-[#2d5a5a] rounded-xl px-[14px] py-[10px] text-[13px] font-medium text-center">
        Settings
      </button>

      <button
        onClick={() => router.push('/drop')}
        className="text-[11px] text-[#9aa0bc] underline underline-offset-2 text-center py-1 hover:text-[#533A3A]"
      >
        I can&rsquo;t make a shift
      </button>
    </PageShell>
  )
}
