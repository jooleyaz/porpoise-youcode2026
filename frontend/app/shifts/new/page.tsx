'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import ShiftRoleRow from '@/components/admin/ShiftRoleRow'
import { getSession } from '@/lib/session'
import { createShift } from '@/lib/api'

const SEED_ROLES = [
  { id: 'r1', name: 'Kitchen' },
  { id: 'r2', name: 'Front of House' },
  { id: 'r3', name: 'First Aid' },
]

interface RoleSlot { roleId: string; name: string; count: number }

export default function NewShiftPage() {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [roleSlots, setRoleSlots] = useState<RoleSlot[]>([
    { roleId: 'r1', name: 'Kitchen', count: 2 },
    { roleId: 'r2', name: 'Front of House', count: 5 },
  ])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session?.isAdmin) router.replace('/shifts')
  }, [router])

  function updateCount(roleId: string, count: number) {
    setRoleSlots(prev => prev.map(r => r.roleId === roleId ? { ...r, count } : r))
  }

  function removeRole(roleId: string) {
    setRoleSlots(prev => prev.filter(r => r.roleId !== roleId))
  }

  function addRole() {
    const usedIds = new Set(roleSlots.map(r => r.roleId))
    const next = SEED_ROLES.find(r => !usedIds.has(r.id))
    if (next) setRoleSlots(prev => [...prev, { roleId: next.id, name: next.name, count: 1 }])
  }

  async function handleManualAssign() {
    if (!date || !startTime || !endTime) return
    setSubmitting(true)
    try {
      const shift = await createShift({
        shift_date: date,
        start_time: startTime,
        end_time: endTime,
        is_recurring: recurring,
        positions: roleSlots.map(r => ({ role_id: r.roleId, slots_total: r.count })),
      })
      router.push(`/shifts/${shift.id}`)
    } catch {
      router.push('/shifts')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <BackRow title="Adding" boldPart="new shift" href="/shifts" />

      <div className="text-[12px] text-[#5a6490] mb-0.5">When is it?</div>

      {/* Date/time form card */}
      <div className="bg-[#C2CAE7] rounded-xl p-[12px] flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-[12px] text-[#4a5280] bg-transparent outline-none"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Start time</span>
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="text-[12px] text-[#4a5280] bg-transparent outline-none"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">End time</span>
          <input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="text-[12px] text-[#4a5280] bg-transparent outline-none"
          />
        </div>
        <div className="h-px bg-[#a0aad0]" />
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-semibold text-[#3D4975]">Recurring?</span>
          <button
            onClick={() => setRecurring(r => !r)}
            className={`w-[14px] h-[14px] rounded-[3px] flex items-center justify-center border ${
              recurring ? 'bg-[#3D4975] border-[#3D4975]' : 'bg-white border-[#a0aad0]'
            }`}
          >
            {recurring && <span className="text-white text-[9px] leading-none">✓</span>}
          </button>
        </div>
      </div>

      <div className="text-[12px] text-[#5a6490] mt-1 mb-0.5">Who do you need?</div>

      {roleSlots.map(r => (
        <ShiftRoleRow
          key={r.roleId}
          name={r.name}
          count={r.count}
          editable
          onCountChange={count => updateCount(r.roleId, count)}
        />
      ))}

      {roleSlots.length < SEED_ROLES.length && (
        <button
          onClick={addRole}
          className="text-[11px] text-[#3D4975] font-semibold text-left"
        >
          + Add role
        </button>
      )}

      <div className="h-2" />
      <Button variant="primary" onClick={handleManualAssign} disabled={submitting || !date}>
        {submitting ? 'Saving…' : 'Manually assign shift'}
      </Button>
      <Button variant="secondary" onClick={handleManualAssign} disabled={submitting || !date}>
        Send invite links
      </Button>
      <Button variant="disabled">
        Publish shift
      </Button>
    </PageShell>
  )
}
