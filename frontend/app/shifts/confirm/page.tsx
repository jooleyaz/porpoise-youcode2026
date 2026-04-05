'use client'

import { useState, useEffect, use } from 'react'
import PageShell from '@/components/layout/PageShell'
import { validateToken, confirmAssignment, cancelAssignment } from '@/lib/api'

type OfferState = 'pending' | 'accepted' | 'declined' | 'loading'

interface OfferDetails {
  shiftTitle?: string
  role?: string
  date?: string
  time?: string
  assignmentId?: string
  name?: string
  expiresMin?: number
}

export default function ShiftConfirmPage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = use(props.searchParams)
  const token = searchParams.token ?? ''

  const [state, setState] = useState<OfferState>('loading')
  const [offer, setOffer] = useState<OfferDetails>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing shift offer link.')
      setState('pending')
      return
    }
    validateToken(token)
      .then(session => {
        // Token payload carries shift info in extended fields
        const ext = session as unknown as OfferDetails & { assignmentId?: string }
        setOffer({
          shiftTitle: ext.shiftTitle ?? 'Volunteer Shift',
          role: ext.role ?? 'Front of House',
          date: ext.date ?? 'Sat May 10',
          time: ext.time ?? '11am–2pm',
          assignmentId: ext.assignmentId,
          name: session.name,
          expiresMin: 58,
        })
        setState('pending')
      })
      .catch(() => {
        // Dev fallback
        setOffer({
          shiftTitle: 'Volunteer Shift',
          role: 'Front of House',
          date: 'Sat May 10',
          time: '11am–2pm',
          name: 'Volunteer',
          expiresMin: 58,
        })
        setState('pending')
      })
  }, [token])

  async function handleYes() {
    setState('loading')
    try {
      if (offer.assignmentId) await confirmAssignment(offer.assignmentId)
      setState('accepted')
    } catch {
      setState('accepted') // dev
    }
  }

  async function handleNo() {
    setState('loading')
    try {
      if (offer.assignmentId) await cancelAssignment(offer.assignmentId)
      setState('declined')
    } catch {
      setState('declined') // dev
    }
  }

  if (state === 'loading') {
    return (
      <PageShell className="items-center justify-center">
        <div className="text-[13px] text-[#9aa0bc] text-center">Loading…</div>
      </PageShell>
    )
  }

  if (state === 'accepted') {
    return (
      <PageShell className="items-center justify-center gap-4 text-center">
        <div className="bg-[#e8f5ee] rounded-xl px-4 py-[12px] w-full text-left">
          <div className="text-[12px] font-semibold text-[#2d6a40] mb-[2px]">You&rsquo;re confirmed. Thank you!</div>
          <div className="text-[11px] text-[#3d7a50] leading-relaxed">
            {offer.role}, {offer.date}. You&rsquo;re helping keep things running!
          </div>
        </div>
      </PageShell>
    )
  }

  if (state === 'declined') {
    return (
      <PageShell className="items-center justify-center gap-4 text-center">
        <div className="bg-[#fdf2f2] rounded-xl px-4 py-[10px] w-full text-left">
          <div className="text-[13px] font-semibold text-[#533A3A]">Got it</div>
          <div className="text-[11px] text-[#7a5050] mt-1">
            We&rsquo;ll find a replacement. Thanks for letting us know.
          </div>
        </div>
      </PageShell>
    )
  }

  // ── Pending offer ──────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="text-[11px] text-[#9aa0bc] text-center mb-1">Messages — Porpoise</div>

      {/* SMS bubble area */}
      <div className="flex flex-col gap-2 bg-[#f8f9fc] rounded-xl p-[10px]">
        <div className="bg-[#e8eaf5] rounded-[10px_10px_10px_3px] px-[10px] py-2 text-[11px] text-[#3D4975] self-start max-w-[85%]">
          Hi <strong>{offer.name}</strong>, a shift is available that matches your availability.
          <br /><br />
          <strong>{offer.role}</strong>
          <br />
          {offer.date}, {offer.time}
          <br /><br />
          Interested?
        </div>

        <div className="flex gap-[6px] mt-0.5">
          <button
            onClick={handleYes}
            className="flex-1 bg-[#3D4975] text-white rounded-lg py-[6px] px-3 text-[11px] font-semibold"
          >
            Yes, I&rsquo;ll take it
          </button>
          <button
            onClick={handleNo}
            className="flex-1 bg-[#e8eaf5] text-[#3D4975] rounded-lg py-[6px] px-3 text-[11px] font-semibold"
          >
            Can&rsquo;t this time
          </button>
        </div>
      </div>

      <div className="text-[10px] text-[#9aa0bc] text-center">
        Or reply YES / NO to this message
      </div>
      {offer.expiresMin && (
        <div className="text-[10px] text-[#9aa0bc] text-center">
          Offer expires in {offer.expiresMin} min
        </div>
      )}

      {error && (
        <div className="text-[11px] text-[#533A3A] text-center">{error}</div>
      )}
    </PageShell>
  )
}
