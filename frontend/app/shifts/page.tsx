'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import StatCard from '@/components/admin/StatCard'
import ChartArea from '@/components/admin/ChartArea'
import { getSession } from '@/lib/session'
import { getVolunteers, getShifts } from '@/lib/api'
import type { Shift } from '@/types'

const FALLBACK_SHIFTS: Shift[] = [
  { id: 's1', shift_date: '2026-05-12', start_time: '11:00', end_time: '14:00', is_recurring: false, status: 'open', positions: [{ id: 'p1', shift_id: 's1', role_id: 'r1', slots_total: 5, slots_filled: 4, role: { id: 'r1', name: 'Kitchen ×2, Front of House ×3' } }] },
  { id: 's2', shift_date: '2026-05-14', start_time: '17:00', end_time: '21:00', is_recurring: false, status: 'filled', positions: [{ id: 'p2', shift_id: 's2', role_id: 'r2', slots_total: 4, slots_filled: 4, role: { id: 'r2', name: 'Kitchen ×3, First Aid ×1' } }] },
  { id: 's3', shift_date: '2026-05-17', start_time: '09:00', end_time: '12:00', is_recurring: false, status: 'open', positions: [{ id: 'p3', shift_id: 's3', role_id: 'r3', slots_total: 4, slots_filled: 1, role: { id: 'r3', name: 'Front of House ×4' } }] },
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

export default function AdminShiftsPage() {
  const router = useRouter()
  const [volunteerCount, setVolunteerCount] = useState(124)
  const [fillRate, setFillRate] = useState(94)
  const [autoCovered] = useState({ covered: 29, total: 31 })
  const [shifts, setShifts] = useState<Shift[]>(FALLBACK_SHIFTS)

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }
    if (!session.isAdmin) { router.replace('/dashboard'); return }

    getVolunteers().then(v => setVolunteerCount(v.length)).catch(() => {})
    getShifts()
      .then(s => {
        setShifts(s.length ? s : FALLBACK_SHIFTS)
        const filled = s.filter(x => x.status === 'filled').length
        if (s.length > 0) setFillRate(Math.round((filled / s.length) * 100))
      })
      .catch(() => {})
  }, [router])

  const statusLabel = (s: Shift) => {
    if (s.status === 'filled') return { text: 'Fully filled', cls: 'bg-[#D8EAEF] text-[#2d5a5a]' }
    if (s.status === 'open') {
      const pos = s.positions?.[0]
      if (pos && pos.slots_filled < pos.slots_total * 0.5) return { text: 'Needs cover', cls: 'bg-[#fde8e8] text-[#8a2020]' }
      return { text: 'Cover running', cls: 'bg-[#fdf0cc] text-[#7a5a10]' }
    }
    return { text: s.status, cls: 'bg-[#f0f2f8] text-[#5a6490]' }
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[17px] text-[#2a2a3d]">Hello <strong>Admin!</strong></div>
          <div className="hidden md:block text-[11px] text-[#9aa0bc] mt-0.5">May 2026</div>
        </div>
        <Image src="/logos/main.png" alt="Porpoise" width={72} height={24} className="object-contain opacity-60 md:hidden" />
      </div>

      {/* Stat cards — row on desktop */}
      <div className="flex flex-col md:flex-row gap-[8px]">
        <StatCard value={`${volunteerCount} active volunteers`} sub="+12% vs last month" variant="lavender" />
        <StatCard value={`${fillRate}% of shifts fully filled`} sub="avg 18 min to cover a gap" variant="sky" />
        <StatCard value={`${autoCovered.covered} of ${autoCovered.total} drops auto-covered`} sub="this month" variant="plain" />
      </div>

      {/* CTAs */}
      <div className="flex flex-col md:flex-row gap-[8px]">
        <Button variant="primary" onClick={() => router.push('/shifts/new')}>Create new shift</Button>
        <Button variant="secondary" onClick={() => router.push('/shifts/schedule')}>View schedule</Button>
        <Button variant="secondary" onClick={() => router.push('/volunteers/invite')}>+ Add new volunteer</Button>
      </div>

      {/* Upcoming shifts table (desktop) / card list (mobile) */}
      <div>
        <div className="text-[12px] font-semibold text-[#2a2a3d] mb-2">Upcoming shifts</div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#eef0f6]">
                {['Date', 'Time', 'Roles', 'Fill status', 'Status'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#9aa0bc] font-medium pb-[6px] px-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const pos = s.positions?.[0]
                const filled = pos?.slots_filled ?? 0
                const total = pos?.slots_total ?? 1
                const pct = Math.round((filled / total) * 100)
                const barColor = pct === 100 ? 'bg-[#3D4975]' : pct >= 50 ? 'bg-[#e8c96a]' : 'bg-[#c05050]'
                const { text, cls } = statusLabel(s)
                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/shifts/${s.id}`)}
                    className="border-b border-[#f0f2f6] hover:bg-[#f8f9fc] cursor-pointer"
                  >
                    <td className="text-[11px] text-[#3D4975] font-semibold px-[10px] py-[8px]">{formatDate(s.shift_date)}</td>
                    <td className="text-[11px] text-[#3D4975] px-[10px] py-[8px]">{formatTime(s.start_time)}–{formatTime(s.end_time)}</td>
                    <td className="text-[11px] text-[#3D4975] px-[10px] py-[8px]">{pos?.role?.name ?? '—'}</td>
                    <td className="px-[10px] py-[8px]">
                      <div className="flex items-center gap-[6px]">
                        <div className="w-[72px] h-[6px] bg-[#e8eaf0] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-[#3D4975]">{filled}/{total}</span>
                      </div>
                    </td>
                    <td className="px-[10px] py-[8px]">
                      <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded ${cls}`}>{text}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden flex flex-col gap-[8px]">
          {shifts.map(s => {
            const pos = s.positions?.[0]
            const { text, cls } = statusLabel(s)
            return (
              <button
                key={s.id}
                onClick={() => router.push(`/shifts/${s.id}`)}
                className="bg-[#C2CAE7] rounded-xl px-[12px] py-[10px] text-left flex justify-between items-start"
              >
                <div>
                  <div className="text-[13px] font-semibold text-[#3D4975]">{formatDate(s.shift_date)}</div>
                  <div className="text-[11px] text-[#5a6490]">{formatTime(s.start_time)}–{formatTime(s.end_time)}</div>
                  <div className="text-[11px] text-[#5a6490] mt-0.5">{pos?.role?.name}</div>
                </div>
                <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded mt-0.5 ${cls}`}>{text}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ChartArea title="Shifts filled per month" />

      <button
        onClick={() => router.push('/settings')}
        className="md:hidden bg-[#BDDEDE] text-[#2d5a5a] rounded-xl px-[14px] py-[10px] text-[13px] font-medium text-center"
      >
        Settings
      </button>
    </PageShell>
  )
}
