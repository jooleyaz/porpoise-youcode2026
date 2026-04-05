'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import BackRow from '@/components/layout/BackRow'
import { getSession } from '@/lib/session'

interface PastShift { date: string; role: string; hours: number }

const PAST_SHIFTS: PastShift[] = [
  { date: 'Apr 28', role: 'Cook', hours: 2 },
  { date: 'Apr 21', role: 'Server', hours: 4 },
  { date: 'Apr 14', role: 'Setup', hours: 3 },
  { date: 'Apr 7', role: 'Cook', hours: 2 },
  { date: 'Mar 31', role: 'Front of House', hours: 3 },
]

const BADGES = [
  { emoji: '⚡', label: 'Last Minute Hero', earned: true, hero: true },
  { emoji: '🔥', label: 'On a Roll', earned: true, hero: false },
  { emoji: '🤝', label: 'Team Player', earned: true, hero: false },
  { emoji: '🌟', label: '25 shifts', earned: false, hero: false, progress: '18 more to go' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }
    setName(session.name)
    setIsAdmin(session.isAdmin)
  }, [router])

  const totalHours = PAST_SHIFTS.reduce((sum, s) => sum + s.hours, 0)

  return (
    <PageShell>
      <BackRow title="Settings &" boldPart="profile" href={isAdmin ? '/shifts' : '/dashboard'} />

      {/* ── Volunteer history ─────────────────────────────────────────────── */}
      <section>
        <div className="text-[12px] font-semibold text-[#2a2a3d] mb-[6px]">Your history</div>

        {/* Summary stat */}
        <div className="flex gap-[8px] mb-[8px]">
          <div className="flex-1 bg-[#C2CAE7] rounded-xl px-[12px] py-[10px]">
            <div className="text-[18px] font-semibold text-[#3D4975]">{totalHours}h</div>
            <div className="text-[10px] text-[#7a80a0]">Total hours</div>
          </div>
          <div className="flex-1 bg-[#D8EAEF] rounded-xl px-[12px] py-[10px]">
            <div className="text-[18px] font-semibold text-[#3D4975]">{PAST_SHIFTS.length}</div>
            <div className="text-[10px] text-[#7a80a0]">Shifts completed</div>
          </div>
        </div>

        {/* Past shift list */}
        <div className="bg-[#f8f9fc] rounded-xl overflow-hidden border border-[#e8eaf0]">
          {PAST_SHIFTS.map((s, i) => (
            <div key={i} className={`flex justify-between items-center px-[12px] py-[9px] ${i < PAST_SHIFTS.length - 1 ? 'border-b border-[#f0f2f6]' : ''}`}>
              <div>
                <div className="text-[11px] font-semibold text-[#3D4975]">{s.role}</div>
                <div className="text-[10px] text-[#9aa0bc]">{s.date}</div>
              </div>
              <div className="text-[11px] font-semibold text-[#5a6490]">{s.hours}h</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Badges ────────────────────────────────────────────────────────── */}
      <section>
        <div className="text-[12px] font-semibold text-[#2a2a3d] mb-[6px]">Badges</div>
        <div className="flex flex-wrap gap-[6px]">
          {BADGES.map((b, i) => (
            <div
              key={i}
              className={`flex items-center gap-[5px] rounded-full px-[9px] py-[5px] text-[11px] font-medium ${
                !b.earned
                  ? 'bg-[#f0f2f8] text-[#9aa0bc] opacity-60'
                  : b.hero
                  ? 'bg-[#3D4975] text-white'
                  : 'bg-[#C2CAE7] text-[#3D4975]'
              }`}
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
              {b.progress && <span className="text-[9px] opacity-70">— {b.progress}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Lead contact ─────────────────────────────────────────────────── */}
      {!isAdmin && (
        <section>
          <div className="text-[12px] font-semibold text-[#2a2a3d] mb-[6px]">Your shift lead</div>
          <div className="bg-[#C2CAE7] rounded-xl px-[12px] py-[10px]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[12px] font-semibold text-[#3D4975]">Sprouts Shift Lead</div>
                <div className="text-[11px] text-[#5a6490]">Sprouts Café</div>
                <div className="text-[11px] text-[#5a6490] mt-[2px]">(604) 555-0100</div>
              </div>
              <a
                href="sms:+16045550100"
                className="bg-[#3D4975] text-white text-[10px] font-medium rounded-lg px-[10px] py-[5px]"
              >
                Message
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── Admin hub ─────────────────────────────────────────────────────── */}
      {isAdmin && (
        <section>
          <div className="text-[12px] font-semibold text-[#2a2a3d] mb-[6px]">Admin hub</div>
          <div className="flex flex-col gap-[6px]">
            {[
              { label: 'Manage volunteers', href: '/volunteers' },
              { label: 'Create new shift', href: '/shifts/new' },
              { label: 'View schedule', href: '/shifts/schedule' },
            ].map(({ label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="bg-[#f0f2f8] rounded-xl px-[12px] py-[10px] text-left flex justify-between items-center"
              >
                <span className="text-[12px] text-[#3D4975]">{label}</span>
                <span className="text-[12px] text-[#9aa0bc]">→</span>
              </button>
            ))}

            <div className="bg-[#f8f9fc] rounded-xl px-[12px] py-[10px] border border-[#e8eaf0] mt-1">
              <div className="text-[10px] font-semibold text-[#9aa0bc] uppercase tracking-wide mb-[6px]">Org settings</div>
              <div className="flex justify-between items-center">
                <div className="text-[11px] text-[#5a6490]">Organization name</div>
                <div className="text-[11px] font-medium text-[#3D4975]">Sprouts Café</div>
              </div>
              <div className="h-px bg-[#e8eaf0] my-[6px]" />
              <div className="flex justify-between items-center">
                <div className="text-[11px] text-[#5a6490]">SMS number</div>
                <div className="text-[11px] font-medium text-[#3D4975]">(604) 555-0100</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Account ───────────────────────────────────────────────────────── */}
      <section>
        <div className="text-[12px] font-semibold text-[#2a2a3d] mb-[6px]">Account</div>
        <div className="bg-[#f8f9fc] rounded-xl px-[12px] py-[10px] border border-[#e8eaf0]">
          <div className="text-[12px] font-semibold text-[#3D4975]">{name}</div>
          <div className="text-[10px] text-[#9aa0bc] mt-[1px]">Volunteer · active</div>
        </div>
      </section>
    </PageShell>
  )
}
