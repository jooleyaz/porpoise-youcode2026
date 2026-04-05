'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getVolunteerStats, type VolunteerStats } from '@/lib/api'

// ── Wave SVG ──────────────────────────────────────────────────────────────────
// Fills downward — use the bottomBg color so it blends into the stat band.

function Wave({ fill }: { fill: string }) {
  return (
    <svg
      viewBox="0 0 390 80"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', marginBottom: -2 }}
      preserveAspectRatio="none"
    >
      <path
        d="M0,40 C55,80 110,10 195,44 C280,78 335,8 390,40 L390,80 L0,80 Z"
        fill={fill}
      />
    </svg>
  )
}

// ── Animated stat content ─────────────────────────────────────────────────────

function ZoomStat({ children, trigger }: { children: React.ReactNode; trigger: number }) {
  const [style, setStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scale(0.6)',
    transition: 'none',
  })

  useEffect(() => {
    // reset
    setStyle({ opacity: 0, transform: 'scale(0.6)', transition: 'none' })
    // zoom in after slide-up lands (~350ms)
    const t = setTimeout(() => {
      setStyle({
        opacity: 1,
        transform: 'scale(1)',
        transition: 'opacity 0.4s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      })
    }, 320)
    return () => clearTimeout(t)
  }, [trigger])

  return <div style={style}>{children}</div>
}

// ── Header ────────────────────────────────────────────────────────────────────

function WrappedHeader({ light }: { light: boolean }) {
  return (
    <div className="flex items-center gap-2 px-6 pt-[72px] pb-2">
      <div className={`text-[14px] leading-snug ${light ? 'text-[#2a2a3d]' : 'text-white opacity-80'}`}>
        Last month you really<br /><strong>made waves...</strong>
      </div>
    </div>
  )
}

// ── Single stat card ──────────────────────────────────────────────────────────

interface StatScreen {
  topBg: string
  waveFill: string
  lightHeader: boolean
  stat: React.ReactNode
  // compact summary for the stacked final card
  summaryValue: string
  summaryLabel: string
  summaryLight: boolean // true = white text (on dark bg)
}

function SingleStatCard({
  screen,
  onClick,
  screenIndex,
  total,
}: {
  screen: StatScreen
  onClick: () => void
  screenIndex: number
  total: number
}) {
  const [slideY, setSlideY] = useState('100%')

  useEffect(() => {
    setSlideY('100%')
    const t = setTimeout(() => setSlideY('0%'), 16)
    return () => clearTimeout(t)
  }, [screenIndex])

  return (
    <div
      className="fixed inset-0 flex flex-col cursor-pointer select-none overflow-hidden"
      style={{
        background: screen.topBg,
        transform: `translateY(${slideY})`,
        transition: slideY === '0%' ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
      }}
      onClick={onClick}
    >
      <WrappedHeader light={screen.lightHeader} />

      {/* Top spacer — pushes wave to bottom ~45% of screen */}
      <div className="flex-1" />

      {/* Wave */}
      <Wave fill={screen.waveFill} />

      {/* Stat band */}
      <div
        className="flex flex-col items-center justify-center pb-24 pt-6 px-8 text-center"
        style={{ background: screen.waveFill }}
      >
        <ZoomStat trigger={screenIndex}>
          {screen.stat}
        </ZoomStat>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-7 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === screenIndex ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white opacity-40'
            }`}
          />
        ))}
      </div>

      <div className="absolute bottom-[42px] left-0 right-0 text-center text-[10px] text-white opacity-30 pointer-events-none tracking-wide">
        tap to continue
      </div>
    </div>
  )
}

// ── Final stacked card ────────────────────────────────────────────────────────

function FinalCard({
  screens,
  onDone,
}: {
  screens: StatScreen[]
  onDone: () => void
}) {
  const [slideY, setSlideY] = useState('100%')

  useEffect(() => {
    setSlideY('100%')
    const t = setTimeout(() => setSlideY('0%'), 16)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background: screens[0].topBg,
        transform: `translateY(${slideY})`,
        transition: slideY === '0%' ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
      }}
    >
      <WrappedHeader light={screens[0].lightHeader} />

      {screens.map((s, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: -44, zIndex: i + 1 }}>
          <Wave fill={s.waveFill} />
          <div
            className="flex flex-col items-center pt-3 pb-20 px-8 text-center"
            style={{ background: s.waveFill }}
          >
            <div
              className="text-[32px] font-bold leading-tight"
              style={{ color: s.summaryLight ? '#ffffff' : '#3D4975' }}
            >
              {s.summaryValue}
            </div>
            <div
              className="text-[12px] mt-0.5"
              style={{ color: s.summaryLight ? 'rgba(255,255,255,0.65)' : '#5a6490' }}
            >
              {s.summaryLabel}
            </div>
          </div>
        </div>
      ))}

      {/* CTA floats above last wave overlap */}
      <div
        className="relative flex flex-col items-center gap-4 pt-20 pb-10 px-8"
        style={{ background: screens[screens.length - 1].waveFill, zIndex: 0 }}
      >
        <div className="text-[12px] text-[#3D4975] opacity-60 text-center">
          Keep it up this month. Your team notices.
        </div>
        <button
          onClick={onDone}
          className="bg-[#3D4975] text-white rounded-xl px-8 py-3 text-[13px] font-semibold"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WrappedPage() {
  const router = useRouter()
  const [screenIndex, setScreenIndex] = useState(0)
  const [stats, setStats] = useState<VolunteerStats>({
    shifts_this_month: 20,
    total_shifts: 20,
    total_hours: 40,
    streak_weeks: 3,
    percentile: 95,
    opening_shifts: 7,
  })

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace('/onboard'); return }
    getVolunteerStats(session.userId)
      .then(setStats)
      .catch(() => {})
  }, [router])

  const topPct = Math.max(1, 100 - stats.percentile)

  const screens: StatScreen[] = [
    {
      topBg: '#ffffff',
      waveFill: '#D8EAEF',
      lightHeader: true,
      summaryValue: `${stats.shifts_this_month}`,
      summaryLabel: 'shifts covered',
      summaryLight: false,
      stat: (
        <div>
          <div className="text-[72px] font-bold text-[#3D4975] leading-none tracking-tight">
            {stats.shifts_this_month}
          </div>
          <div className="text-[24px] text-[#3D4975] mt-2 font-medium">shifts covered</div>
        </div>
      ),
    },
    {
      topBg: '#D8EAEF',
      waveFill: '#3D4975',
      lightHeader: true,
      summaryValue: `Top ${topPct}%`,
      summaryLabel: 'shift coverage in your group',
      summaryLight: true,
      stat: (
        <div>
          <div className="text-[24px] text-white leading-snug font-medium">
            <span className="text-[48px] font-bold leading-none block">Top {topPct}%</span>
            in your group for shift coverage
          </div>
        </div>
      ),
    },
    {
      topBg: '#ffffff',
      waveFill: '#C2CAE7',
      lightHeader: true,
      summaryValue: `${stats.opening_shifts} opening shifts`,
      summaryLabel: 'first one in, every time',
      summaryLight: false,
      stat: (
        <div>
          <div className="text-[24px] text-[#3D4975] leading-snug font-medium">
            You took the
            <span className="block text-[32px] font-bold leading-tight mt-1">most opening shifts</span>
          </div>
          {stats.opening_shifts > 0 && (
            <div className="text-[14px] text-[#5a6490] mt-3">{stats.opening_shifts} shifts — first one in</div>
          )}
        </div>
      ),
    },
  ]

  const FINAL = screens.length
  const total = FINAL + 1

  if (screenIndex < FINAL) {
    return (
      <SingleStatCard
        screen={screens[screenIndex]}
        onClick={() => setScreenIndex(i => Math.min(i + 1, total - 1))}
        screenIndex={screenIndex}
        total={total}
      />
    )
  }

  return (
    <FinalCard
      screens={screens}
      onDone={() => router.push('/dashboard')}
    />
  )
}
