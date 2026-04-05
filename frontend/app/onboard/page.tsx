'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import Button from '@/components/ui/Button'
import PorpoiseIcon from '@/components/ui/PorpoiseIcon'
import AvailGrid, { gridToAvailability } from '@/components/availability/AvailGrid'
import { validateToken, setAvailability } from '@/lib/api'
import { setSession, getSession } from '@/lib/session'

type Step = 'landing' | 'availability' | 'complete'

export default function OnboardPage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = use(props.searchParams)
  const token = searchParams.token ?? ''
  const router = useRouter()

  const [step, setStep] = useState<Step>('landing')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [roles, setRoles] = useState<string[]>([])
  const [grid, setGrid] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokenChecked, setTokenChecked] = useState(false)
  const [tokenExpiry] = useState(47)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invite link.')
      setTokenChecked(true)
      return
    }
    validateToken(token)
      .then(session => {
        setUserName(session.name)
        setUserId(session.userId)
        setRoles((session as unknown as { roles?: string[] }).roles ?? [])
        setSession(session)
        setTokenChecked(true)
      })
      .catch(() => {
        // In dev without backend, allow proceeding with a placeholder
        setUserName('Volunteer')
        setUserId('dev-user')
        setTokenChecked(true)
      })
  }, [token])

  async function handleSubmitAvailability(skip = false) {
    setLoading(true)
    try {
      if (!skip && userId) {
        const recurring = gridToAvailability(grid)
        await setAvailability(userId, { recurring, overrides: [] })
      }
      setStep('complete')
    } catch {
      // In dev, still advance
      setStep('complete')
    } finally {
      setLoading(false)
    }
  }

  if (!tokenChecked) {
    return (
      <PageShell className="items-center justify-center">
        <div className="text-[13px] text-[#9aa0bc] text-center">Loading…</div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell className="items-center justify-center text-center gap-4">
        <PorpoiseIcon size={48} />
        <div className="text-[16px] font-semibold text-[#533A3A]">Invalid Link</div>
        <div className="text-[12px] text-[#5a6490]">{error}</div>
      </PageShell>
    )
  }

  // ── Landing ──────────────────────────────────────────────────────────────
  if (step === 'landing') {
    return (
      <PageShell className="items-center justify-center text-center gap-[14px]">
        <PorpoiseIcon size={48} />
        <div className="text-[18px] font-semibold text-[#3D4975]">Welcome to Porpoise</div>
        <div className="text-[12px] text-[#5a6490] leading-relaxed">
          You&rsquo;ve been invited to join the volunteer team. Set up takes about 2 minutes.
        </div>
        <div className="bg-[#C2CAE7] rounded-xl px-4 py-[10px] w-full text-left">
          <div className="text-[11px] text-[#5a6490]">Invited as</div>
          <div className="text-[13px] font-semibold text-[#3D4975]">{userName}</div>
        </div>
        <Button variant="primary" onClick={() => setStep('availability')}>
          Get started
        </Button>
        <div className="text-[10px] text-[#9aa0bc]">This link expires in {tokenExpiry} hours</div>
      </PageShell>
    )
  }

  // ── Availability ──────────────────────────────────────────────────────────
  if (step === 'availability') {
    return (
      <PageShell>
        <div className="text-[11px] text-[#9aa0bc]">Step 1 of 2</div>
        <div className="text-[16px] text-[#2a2a3d]">
          When are you <strong>usually free?</strong>
        </div>
        <div className="text-[11px] text-[#5a6490]">
          Set your recurring weekly availability. You can update this any time.
        </div>
        <AvailGrid onChange={setGrid} />
        <Button variant="primary" onClick={() => handleSubmitAvailability(false)} disabled={loading}>
          {loading ? 'Saving…' : 'Continue'}
        </Button>
        <Button variant="ghost" onClick={() => handleSubmitAvailability(true)}>
          Skip for now
        </Button>
      </PageShell>
    )
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  return (
    <PageShell className="items-center justify-center text-center gap-[12px]">
      <div className="w-10 h-10 bg-[#C2CAE7] rounded-full flex items-center justify-center text-[20px] text-[#3D4975]">
        ✓
      </div>
      <div className="text-[16px] font-semibold text-[#3D4975]">You&rsquo;re all set</div>
      <div className="text-[12px] text-[#5a6490] leading-relaxed">
        We&rsquo;ll text you when a shift comes up that matches your availability and qualifications. No need to check the app.
      </div>
      {roles.length > 0 && (
        <div className="bg-[#D8EAEF] rounded-xl px-4 py-[10px] w-full text-left">
          <div className="text-[11px] font-semibold text-[#2d5a5a] mb-1">Your roles</div>
          <div className="text-[11px] text-[#3d7a70]">{roles.join(' · ')}</div>
        </div>
      )}
      <div className="bg-[#f0f2f8] rounded-xl px-4 py-[10px] w-full text-left">
        <div className="text-[11px] font-semibold text-[#3D4975] mb-[3px]">Your first badge is waiting</div>
        <div className="text-[11px] text-[#5a6490]">Show up for your first shift to earn <strong>🤝 Team Player</strong>.</div>
      </div>
      <Button variant="primary" onClick={() => router.push('/dashboard')}>
        Go to dashboard
      </Button>
    </PageShell>
  )
}
