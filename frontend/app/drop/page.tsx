'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { getSession } from '@/lib/session'
import { getShifts, cancelAssignment } from '@/lib/api'

interface ShiftItem {
  id: string
  assignmentId: string
  label: string
  time: string
}

const FALLBACK: ShiftItem[] = [
  { id: 's1', assignmentId: 'a1', label: 'May 3 — Cook', time: '6:30–8:30pm' },
  { id: 's2', assignmentId: 'a2', label: 'May 4 — Server', time: '5:00–9:00pm' },
  { id: 's3', assignmentId: 'a3', label: 'May 7 — Setup', time: '9:00am–12pm' },
]

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

export default function DropPage(props: { searchParams: Promise<{ shiftId?: string; assignmentId?: string }> }) {
  const searchParams = use(props.searchParams)
  const router = useRouter()
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [dropping, setDropping] = useState(false)
  const [dropError, setDropError] = useState('')
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }

    getShifts({ user_id: session.userId })
      .then(apiShifts => {
        if (!apiShifts.length) { setShifts(FALLBACK); return }
        const mapped: ShiftItem[] = apiShifts.flatMap(s =>
          (s.positions ?? []).flatMap(pos =>
            (pos.assignments ?? [])
              .filter(a => a.user_id === session.userId && a.status !== 'cancelled')
              .map(a => ({
                id: s.id,
                assignmentId: a.id,
                label: `${new Date(s.shift_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${pos.role?.name ?? 'Staff'}`,
                time: `${formatTime(s.start_time)}–${formatTime(s.end_time)}`,
              }))
          )
        )
        // Only use fallback if we truly got no usable mapped shifts
        setShifts(mapped.length ? mapped : [])
      })
      .catch(() => setShifts(FALLBACK))
      .finally(() => {
        if (searchParams.shiftId) {
          setSelected(searchParams.shiftId)
        }
      })
  }, [router, searchParams.shiftId])

  // If shiftId param arrives before fetch, pre-select from fallback too
  useEffect(() => {
    if (searchParams.shiftId && shifts.length) {
      const match = shifts.find(s => s.id === searchParams.shiftId)
      if (match) setSelected(match.id)
    }
  }, [shifts, searchParams.shiftId])

  async function confirmDrop() {
    if (!selected) return
    setDropping(true)
    setDropError('')
    const item = shifts.find(s => s.id === selected)
    try {
      const aId = item?.assignmentId ?? searchParams.assignmentId
      if (aId) await cancelAssignment(aId)
      setShowConfirm(false)
      router.push('/dashboard')
    } catch (err) {
      setDropError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setShowConfirm(false)
    } finally {
      setDropping(false)
    }
  }

  // ── Celebration screen ────────────────────────────────────────────────────
  if (celebrating) {
    return (
      <PageShell className="items-center justify-center text-center gap-[14px]">
        <div className="text-[48px] leading-none">🎉</div>
        <div className="text-[20px] font-semibold text-[#3D4975]">That&rsquo;s the spirit!</div>
        <div className="text-[13px] text-[#5a6490] leading-relaxed max-w-[260px]">
          The team will be glad you&rsquo;re coming. See you there!
        </div>
        <div className="bg-[#C2CAE7] rounded-xl px-5 py-4 w-full text-left">
          <div className="text-[11px] text-[#5a6490]">Your shift is confirmed</div>
          {selected && (() => {
            const item = shifts.find(s => s.id === selected)
            return item ? (
              <div className="text-[13px] font-semibold text-[#3D4975] mt-0.5">{item.label} · {item.time}</div>
            ) : null
          })()}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard')}>
          Back to dashboard
        </Button>
      </PageShell>
    )
  }

  // ── Main drop screen ──────────────────────────────────────────────────────
  return (
    <PageShell>
      <BackRow title="Can't make" boldPart="a shift?" href="/dashboard" />

      <div className="text-[12px] text-[#5a6490] leading-relaxed">
        Select the shift below. We&rsquo;ll find someone to cover: you don&rsquo;t need to do anything else.
      </div>

      <div className="flex flex-col gap-[6px]">
        {shifts.map(s => (
          <button
            key={s.assignmentId}
            onClick={() => setSelected(s.id)}
            className={`rounded-xl px-[11px] py-[9px] text-left border transition-colors ${
              selected === s.id
                ? 'bg-[#f0f2f8] border-[1.5px] border-[#3D4975]'
                : 'bg-[#f8f9fc] border border-[#d0d4e8]'
            }`}
          >
            <div className="text-[12px] font-semibold text-[#3D4975]">{s.label}</div>
            <div className="text-[11px] text-[#5a6490]">{s.time}</div>
          </button>
        ))}
      </div>

      <div className="bg-[#f0f2f8] rounded-xl px-[10px] py-[10px]">
        <div className="text-[11px] text-[#5a6490] leading-relaxed">
          Life happens. Dropping a shift won&rsquo;t affect your streak if you&rsquo;ve volunteered at least twice this month.
        </div>
      </div>

      {dropError && (
        <div className="text-[11px] text-[#8a2020] bg-[#fde8e8] rounded-xl px-[10px] py-[8px]">
          {dropError}
        </div>
      )}

      <Button
        variant="secondary"
        disabled={!selected || dropping}
        onClick={() => setShowConfirm(true)}
      >
        {dropping ? 'Cancelling…' : 'Cancel shift'}
      </Button>
      <button
        onClick={() => setCelebrating(true)}
        className="text-[11px] text-[#9aa0bc] underline underline-offset-2 text-center py-1 hover:text-[#3D4975]"
      >
        Actually, I&rsquo;ll be there
      </button>

      {showConfirm && (
        <Modal
          title="Cancel this shift?"
          message="Porpoise will automatically find a replacement and notify you. This cannot be undone."
          confirmLabel="Yes, cancel it"
          cancelLabel="Never mind"
          confirmVariant="danger"
          onConfirm={confirmDrop}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </PageShell>
  )
}
