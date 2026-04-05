'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { getSession } from '@/lib/session'
import { cancelAssignment } from '@/lib/api'

interface ShiftItem {
  id: string
  assignmentId: string
  label: string
  time: string
}

export default function DropPage() {
  const router = useRouter()
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [dropping, setDropping] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }

    // Dev fallback
    setShifts([
      { id: '1', assignmentId: 'a1', label: 'May 3 — Cook', time: '6:30–8:30pm' },
      { id: '2', assignmentId: 'a2', label: 'May 4 — Server', time: '5:00–9:00pm' },
      { id: '3', assignmentId: 'a3', label: 'May 7 — Setup', time: '9:00am–12pm' },
    ])
  }, [router])

  async function confirmDrop() {
    if (!selected) return
    setDropping(true)
    const item = shifts.find(s => s.id === selected)
    try {
      if (item?.assignmentId) await cancelAssignment(item.assignmentId)
    } catch { /* dev */ }
    setShowConfirm(false)
    router.push('/dashboard')
  }

  return (
    <PageShell>
      <BackRow title="Can't make" boldPart="a shift?" href="/dashboard" />

      <div className="text-[12px] text-[#5a6490] leading-relaxed">
        Select the shift below. We&rsquo;ll find someone to cover — you don&rsquo;t need to do anything else.
      </div>

      <div className="flex flex-col gap-[6px]">
        {shifts.map(s => (
          <button
            key={s.id}
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

      <Button
        variant="secondary"
        disabled={!selected || dropping}
        onClick={() => setShowConfirm(true)}
      >
        {dropping ? 'Cancelling…' : 'Cancel shift'}
      </Button>
      <button
        onClick={() => router.push('/dashboard')}
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
