'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import { getSession } from '@/lib/session'
import { getAvailableShifts, acceptShift } from '@/lib/api'
import type { Shift } from '@/types'

export default function PickupPage() {
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }

    getAvailableShifts(session.userId)
      .catch(() => [
        // Dev fallback
        {
          id: 's1', shift_date: '2026-05-10', start_time: '11:00', end_time: '14:00',
          is_recurring: false, status: 'open',
          positions: [{ id: 'p1', shift_id: 's1', role_id: 'r1', slots_total: 3, slots_filled: 2, role: { id: 'r1', name: 'Front of House' } }],
        } as Shift,
        {
          id: 's2', shift_date: '2026-05-12', start_time: '09:00', end_time: '12:00',
          is_recurring: false, status: 'open',
          positions: [{ id: 'p2', shift_id: 's2', role_id: 'r2', slots_total: 2, slots_filled: 1, role: { id: 'r2', name: 'Kitchen' } }],
        } as Shift,
      ])
      .then(setShifts)
      .finally(() => setLoading(false))
  }, [router])

  async function handleClaim(shift: Shift) {
    const positionId = shift.positions?.[0]?.id
    if (!positionId) return
    const session = getSession()
    if (!session) return
    setClaiming(shift.id)
    try {
      await acceptShift({ shift_position_id: positionId, user_id: session.userId })
      setClaimed(prev => new Set([...prev, shift.id]))
    } catch {
      setClaimed(prev => new Set([...prev, shift.id])) // dev
    } finally {
      setClaiming(null)
    }
  }

  return (
    <PageShell>
      <BackRow title="Available" boldPart="shifts" href="/dashboard" />

      {loading ? (
        <div className="text-[12px] text-[#9aa0bc] text-center mt-8">
          Loading shifts…
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-[12px] text-[#9aa0bc] text-center mt-8">
          No available shifts right now. Check back soon!
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {shifts.map(shift => {
            const role = shift.positions?.[0]?.role?.name ?? 'Staff'
            const date = new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            const time = `${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`
            const isClaimed = claimed.has(shift.id)

            return (
              <div key={shift.id} className="bg-[#C2CAE7] rounded-xl px-[12px] py-[10px] flex flex-col gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#3D4975]">{role}</div>
                  <div className="text-[11px] text-[#5a6490]">{date}, {time}</div>
                </div>
                {isClaimed ? (
                  <div className="text-[11px] font-semibold text-[#2d6a40] bg-[#e8f5ee] rounded-lg px-3 py-2 text-center">
                    Shift claimed ✓
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={claiming === shift.id}
                    onClick={() => handleClaim(shift)}
                  >
                    {claiming === shift.id ? 'Claiming…' : 'Claim shift'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}
