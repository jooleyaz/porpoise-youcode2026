'use client'

import { useState, useEffect, use } from 'react'
import PageShell from '@/components/layout/PageShell'
import { getShiftOfferDetails, acceptCover, declineCover } from '@/lib/api'
import type { ShiftOfferDetails } from '@/lib/api'

type OfferState = 'loading' | 'pending' | 'accepted' | 'declined' | 'expired' | 'error'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`
}
function minutesUntil(isoStr: string) {
  return Math.max(0, Math.round((new Date(isoStr).getTime() - Date.now()) / 60000))
}

export default function ShiftConfirmPage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = use(props.searchParams)
  const token = searchParams.token ?? ''

  const [state, setState] = useState<OfferState>('loading')
  const [offer, setOffer] = useState<ShiftOfferDetails | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid or missing shift offer link.')
      setState('error')
      return
    }
    getShiftOfferDetails(token)
      .then(details => {
        setOffer(details)
        setState('pending')
      })
      .catch(err => {
        const msg = (err as Error).message ?? ''
        if (msg.includes('expired') || msg.includes('404')) {
          setState('expired')
        } else {
          // Dev fallback — backend not running
          setOffer({
            outreach_id:    'dev',
            volunteer_name: 'Volunteer',
            shift_title:    'Volunteer Shift',
            shift_date:     '2026-05-10',
            start_time:     '11:00',
            end_time:       '14:00',
            role:           'Front of House',
            expires_at:     new Date(Date.now() + 58 * 60000).toISOString(),
          })
          setState('pending')
        }
      })
  }, [token])

  async function handleYes() {
    setState('loading')
    try {
      await acceptCover(token)
      setState('accepted')
    } catch {
      setState('accepted') // optimistic in dev
    }
  }

  async function handleNo() {
    setState('loading')
    try {
      await declineCover(token)
      setState('declined')
    } catch {
      setState('declined') // optimistic in dev
    }
  }

  if (state === 'loading') {
    return (
      <PageShell className="items-center justify-center">
        <div className="text-[13px] text-[#9aa0bc] text-center">Loading…</div>
      </PageShell>
    )
  }

  if (state === 'expired') {
    return (
      <PageShell className="items-center justify-center gap-4 text-center">
        <div className="bg-[#f0f2f8] rounded-xl px-4 py-[12px] w-full text-left">
          <div className="text-[12px] font-semibold text-[#9aa0bc]">This offer has expired</div>
          <div className="text-[11px] text-[#9aa0bc] mt-1 leading-relaxed">
            The shift was filled or the offer window closed. Check your SMS for any new offers.
          </div>
        </div>
      </PageShell>
    )
  }

  if (state === 'error') {
    return (
      <PageShell className="items-center justify-center gap-4 text-center">
        <div className="text-[12px] text-[#533A3A]">{errorMsg}</div>
      </PageShell>
    )
  }

  if (state === 'accepted') {
    return (
      <PageShell className="items-center justify-center gap-4 text-center">
        <div className="bg-[#e8f5ee] rounded-xl px-4 py-[12px] w-full text-left">
          <div className="text-[12px] font-semibold text-[#2d6a40] mb-[2px]">You&rsquo;re confirmed. Thank you!</div>
          <div className="text-[11px] text-[#3d7a50] leading-relaxed">
            {offer?.role}, {offer ? formatDate(offer.shift_date) : ''}. You&rsquo;re helping keep things running!
          </div>
        </div>
      </PageShell>
    )
  }

  if (state === 'declined') {
    return (
      <PageShell className="items-center justify-center gap-4 text-center">
        <div className="bg-[#f0f2f8] rounded-xl px-4 py-[12px] w-full text-left">
          <div className="text-[12px] font-semibold text-[#5a6490]">No problem</div>
          <div className="text-[11px] text-[#9aa0bc] mt-1">
            We&rsquo;ll find a replacement. Thanks for letting us know.
          </div>
        </div>
      </PageShell>
    )
  }

  // ── Pending offer ──────────────────────────────────────────────────────────
  const expiresMin = offer ? minutesUntil(offer.expires_at) : 0

  return (
    <PageShell>
      <div className="text-[11px] text-[#9aa0bc] text-center mb-1">Messages — Porpoise</div>

      <div className="flex flex-col gap-2 bg-[#f8f9fc] rounded-xl p-[10px]">
        <div className="bg-[#e8eaf5] rounded-[10px_10px_10px_3px] px-[10px] py-2 text-[11px] text-[#3D4975] self-start max-w-[90%] leading-relaxed">
          Hi <strong>{offer?.volunteer_name}</strong>, a shift needs covering and you&rsquo;d be a great fit.
          <br /><br />
          <strong>{offer?.role}</strong>
          <br />
          {offer ? formatDate(offer.shift_date) : ''}, {offer ? `${formatTime(offer.start_time)}–${formatTime(offer.end_time)}` : ''}
          <br /><br />
          Can you help out?
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
        Or reply YES / NO · Offer expires in {expiresMin} min
      </div>
    </PageShell>
  )
}
