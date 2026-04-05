'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import RoleCardPair from '@/components/admin/RoleCardPair'
import VFBanner from '@/components/admin/VFBanner'
import CoverStatus from '@/components/admin/CoverStatus'
import { getSession } from '@/lib/session'
import { getShift, triggerCoverage } from '@/lib/api'
import type { Shift } from '@/types'

export default function ShiftDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [shift, setShift] = useState<Shift | null>(null)
  const [coverActive, setCoverActive] = useState(false)
  const [coverResponses] = useState(2)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session?.isAdmin) { router.replace('/shifts'); return }

    getShift(params.id)
      .catch(() => ({
        id: params.id,
        shift_date: '2026-05-12',
        start_time: '20:00',
        end_time: '01:00',
        is_recurring: false,
        status: 'open' as const,
        positions: [
          {
            id: 'p1', shift_id: params.id, role_id: 'r1', slots_total: 2, slots_filled: 2,
            role: { id: 'r1', name: 'Kitchen staff' },
            assignments: [
              { id: 'a1', shift_position_id: 'p1', user_id: 'u1', status: 'confirmed' as const, assigned_at: '', user: { id: 'u1', name: 'Jane D.', phone: '', status: 'active' as const, is_admin: false, total_hours_volunteered: 0 } },
              { id: 'a2', shift_position_id: 'p1', user_id: 'u2', status: 'confirmed' as const, assigned_at: '', user: { id: 'u2', name: 'Samuel D.', phone: '', status: 'active' as const, is_admin: false, total_hours_volunteered: 0 } },
            ],
          },
          {
            id: 'p2', shift_id: params.id, role_id: 'r2', slots_total: 3, slots_filled: 2,
            role: { id: 'r2', name: 'Front of House' },
            assignments: [
              { id: 'a3', shift_position_id: 'p2', user_id: 'u3', status: 'confirmed' as const, assigned_at: '', user: { id: 'u3', name: 'Julia Z.', phone: '', status: 'active' as const, is_admin: false, total_hours_volunteered: 0 } },
              { id: 'a4', shift_position_id: 'p2', user_id: 'u4', status: 'confirmed' as const, assigned_at: '', user: { id: 'u4', name: 'Christiane A.', phone: '', status: 'active' as const, is_admin: false, total_hours_volunteered: 0 } },
            ],
          },
        ],
      } as Shift))
      .then(setShift)
  }, [params.id, router])

  async function handleFindCoverage() {
    if (!shift) return
    setTriggering(true)
    try {
      await triggerCoverage(shift.id)
      setCoverActive(true)
    } catch {
      setCoverActive(true)
    } finally {
      setTriggering(false)
    }
  }

  const roleCards = (shift?.positions ?? []).map((pos, i) => ({
    name: pos.role?.name ?? 'Staff',
    total: pos.slots_total,
    filled: pos.slots_filled,
    volunteers: (pos.assignments ?? []).map(a => a.user?.name ?? '').filter(Boolean),
    variant: (i % 2 === 0 ? 'purple' : 'sand') as 'purple' | 'sand',
  }))

  const shiftDate = shift
    ? new Date(shift.shift_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '…'

  const hasOpenSlots = (shift?.positions ?? []).some(p => p.slots_filled < p.slots_total)

  return (
    <PageShell>
      <BackRow title="Upcoming" boldPart="Shifts" href="/shifts" showIcon />

      {/* Next activity pill */}
      <div className="bg-[#D8EAEF] rounded-xl px-[12px] py-[8px] text-center">
        <div className="text-[11px] text-[#5a7a8a]">Next Activity</div>
        <div className="text-[13px] font-semibold text-[#3D4975]">{shiftDate}</div>
      </div>

      {/* Role cards */}
      {roleCards.length > 0 && (
        <RoleCardPair cards={roleCards.slice(0, 2)} />
      )}

      <Button variant="primary">+ Add role</Button>

      {/* Volunteer finder / cover status */}
      {coverActive ? (
        <>
          <VFBanner
            role={shift?.positions?.[1]?.role?.name ?? 'Open position'}
            count={18}
            timeAgo="5 min ago"
          />
          <CoverStatus filled={coverResponses} total={5} timerLabel={`${coverResponses} of 5 responded — 42 min remaining`} />
        </>
      ) : hasOpenSlots ? (
        <Button variant="secondary" onClick={handleFindCoverage} disabled={triggering}>
          {triggering ? 'Finding coverage…' : 'Find Coverage'}
        </Button>
      ) : null}

      <button className="bg-[#BDDEDE] text-[#2d5a5a] rounded-xl px-[14px] py-[10px] text-[13px] font-medium text-center mt-auto">
        Settings
      </button>
    </PageShell>
  )
}
