'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/layout/PageShell'
import Button from '@/components/ui/Button'
import Image from 'next/image'

const BUSINESS_NAME = 'Sprouts Cafe'
const TOTAL_SCREENS = 7

// ── Illustrations ─────────────────────────────────────────────────────────────

function IllustrationWelcome() {
  return (
    <div className="flex flex-col items-start gap-3">
      <Image src="/logos/banner.png" alt="Porpoise" width={160} height={56} className="object-contain" />
      <div className="text-[32px] self-start">Hi, Lily! 🌊</div>
    </div>
  )
}

function IllustrationShiftCard() {
  return (
    <div className="bg-[#C2CAE7] rounded-xl px-4 py-3 w-full max-w-[280px]">
      <div className="text-[11px] font-semibold text-[#3D4975]">Kitchen shift · May 14 · 6–8pm</div>
      <div className="flex gap-2 mt-2 flex-wrap">
        <span className="bg-[#3D4975] text-white rounded-full px-2 py-0.5 text-[9px]">Kitchen ×2</span>
        <span className="bg-[#3D4975] text-white rounded-full px-2 py-0.5 text-[9px]">Greeter ×3</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-[5px] bg-[#e8eaf0] rounded-full overflow-hidden">
          <div className="h-full bg-[#3D4975] rounded-full" style={{ width: '67%' }} />
        </div>
        <span className="text-[9px] text-[#5a6490]">4 of 6 filled</span>
      </div>
    </div>
  )
}

function IllustrationAutoCover({ active }: { active: boolean }) {
  const [flowStep, setFlowStep] = useState(0)

  useEffect(() => {
    if (!active) { setFlowStep(0); return }
    const timers = [
      setTimeout(() => setFlowStep(1), 400),
      setTimeout(() => setFlowStep(2), 900),
      setTimeout(() => setFlowStep(3), 1400),
      setTimeout(() => setFlowStep(4), 1900),
    ]
    return () => timers.forEach(clearTimeout)
  }, [active])

  const nodes = [
    { icon: '✗', label: 'Drop', bg: 'bg-[#fde8e8]', text: 'text-[#8a2020]' },
    { icon: '🐬', label: 'Search', bg: 'bg-[#C2CAE7]', text: 'text-[#3D4975]' },
    { icon: '📱', label: 'Text sent', bg: 'bg-[#D8EAEF]', text: 'text-[#2d5a5a]' },
    { icon: '✓', label: 'Filled', bg: 'bg-[#bde8c8]', text: 'text-[#1a5a2a]' },
  ]

  return (
    <div className="flex items-center gap-1 w-full max-w-[300px] justify-center">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${flowStep > i ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
          >
            <div className={`w-10 h-10 rounded-full ${node.bg} flex items-center justify-center text-[16px] ${node.text} font-bold`}>
              {node.icon}
            </div>
            <span className={`text-[8px] ${node.text} text-center leading-tight`}>{node.label}</span>
          </div>
          {i < nodes.length - 1 && (
            <div
              className={`w-5 h-[2px] mx-0.5 mb-3 border-t border-dashed border-[#9aa0bc] transition-opacity duration-300 ${flowStep > i ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function IllustrationSMS() {
  return (
    <div className="bg-[#f0f2f8] rounded-2xl p-3 w-full max-w-[280px]">
      <div className="flex items-center gap-2 mb-2 border-b border-[#e0e4f0] pb-2">
        <div className="w-6 h-6 rounded-full bg-[#3D4975] flex items-center justify-center text-white text-[10px] font-bold">SC</div>
        <div className="text-[9px] font-semibold text-[#3D4975]">{BUSINESS_NAME}</div>
      </div>
      <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 max-w-[88%] text-[10px] text-[#2a2a3d] leading-relaxed shadow-sm">
        Hi Jamie! We need help with Kitchen on May 14, 6–8pm. Can you cover?
      </div>
      <div className="flex gap-2 mt-2 justify-end">
        <span className="bg-[#3D4975] text-white rounded-full px-3 py-1 text-[9px] font-medium">Yes, I&rsquo;ll help</span>
        <span className="bg-[#e8eaf0] text-[#5a6490] rounded-full px-3 py-1 text-[9px]">Can&rsquo;t this time</span>
      </div>
    </div>
  )
}

function IllustrationDashboard() {
  return (
    <div className="flex gap-2 w-full max-w-[280px]">
      <div className="flex-1 bg-[#C2CAE7] rounded-xl px-3 py-2 text-center">
        <div className="text-[20px] font-bold text-[#3D4975] leading-tight">7</div>
        <div className="text-[9px] text-[#5a6490]">filled</div>
      </div>
      <div className="flex-1 bg-[#fdf0cc] rounded-xl px-3 py-2 text-center">
        <div className="text-[20px] font-bold text-[#7a5a10] leading-tight">2</div>
        <div className="text-[9px] text-[#7a5a10]">need cover</div>
      </div>
      <div className="flex-1 bg-[#f0f2f8] rounded-xl px-3 py-2 text-center">
        <div className="text-[20px] font-bold text-[#9aa0bc] leading-tight">1</div>
        <div className="text-[9px] text-[#9aa0bc]">open</div>
      </div>
    </div>
  )
}

function IllustrationBadges() {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
      <span className="bg-[#3D4975] text-white rounded-full px-3 py-1.5 text-[10px] font-medium">⚡ Last Minute Hero</span>
      <span className="bg-[#C2CAE7] text-[#3D4975] rounded-full px-3 py-1.5 text-[10px] font-medium">🔥 On a Roll</span>
      <span className="bg-[#C2CAE7] text-[#3D4975] rounded-full px-3 py-1.5 text-[10px] font-medium">🤝 Team Player</span>
      <span className="opacity-40 bg-[#f0f2f8] text-[#9aa0bc] rounded-full px-3 py-1.5 text-[10px]">🌟 25 shifts — 18 to go</span>
    </div>
  )
}

function IllustrationReady() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 bg-[#bde8c8] rounded-full flex items-center justify-center text-[32px] text-[#1a5a2a]">
        ✓
      </div>
      <div className="text-[11px] text-[#5a6490]">All set</div>
    </div>
  )
}

// ── Screen data ───────────────────────────────────────────────────────────────

interface Screen {
  title: string
  body: React.ReactNode
  cta: string
  illustration: (active: boolean) => React.ReactNode
}

function makeScreens(): Screen[] {
  return [
    {
      title: `Welcome! Here's a guide to managing your shifts at ${BUSINESS_NAME}.`,
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>You already have the people you need.</p>
          <p>Porpoise helps you get the right person in the right place, at the right time.</p>
          <p>No complex systems, no constant follow-ups: just a simpler way to keep your shifts covered.</p>
        </div>
      ),
      cta: 'Get started',
      illustration: () => <IllustrationWelcome />,
    },
    {
      title: 'Set up your shifts in seconds',
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>Create a shift, add roles like Kitchen or Greeter, and choose how many people you need.</p>
          <p>Porpoise automatically finds volunteers who are available and qualified. You can:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Let volunteers sign up themselves</li>
            <li>Or send a quick request to specific people</li>
          </ul>
          <p>No spreadsheets. No back and forth.</p>
        </div>
      ),
      cta: 'Next',
      illustration: () => <IllustrationShiftCard />,
    },
    {
      title: 'When plans change, Porpoise steps in',
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>If someone cancels, you do not need to chase replacements. Porpoise will:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Find the best available volunteers</li>
            <li>Reach out by text</li>
            <li>Assign the first person who confirms</li>
          </ul>
          <p>If no one responds, it keeps going until the shift is filled. What used to take hours now takes minutes.</p>
        </div>
      ),
      cta: 'Next',
      illustration: (active) => <IllustrationAutoCover active={active} />,
    },
    {
      title: 'Simple texts that get responses',
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>Volunteers receive a short message asking if they can help. They can tap a link to confirm in seconds.</p>
          <p>No apps. No logins required.</p>
          <p>This makes it easy for everyone to respond quickly, even during busy days.</p>
        </div>
      ),
      cta: 'Next',
      illustration: () => <IllustrationSMS />,
    },
    {
      title: 'You always have visibility',
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>Your dashboard shows:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>What is filled</li>
            <li>What still needs coverage</li>
            <li>Where you might need help</li>
          </ul>
          <p>If needed, you can trigger a search for coverage with one click. You stay in control without doing all the work.</p>
        </div>
      ),
      cta: 'Next',
      illustration: () => <IllustrationDashboard />,
    },
    {
      title: 'Support the people who show up',
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>Volunteers who step in and help build streaks and earn badges. This helps you:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Recognize reliable people</li>
            <li>Encourage others to step up</li>
            <li>Build a stronger, more consistent team</li>
          </ul>
          <p>Small moments of recognition make a big difference.</p>
        </div>
      ),
      cta: 'Next',
      illustration: () => <IllustrationBadges />,
    },
    {
      title: 'You are ready to go',
      body: (
        <div className="text-[12px] text-[#5a6490] leading-relaxed space-y-2">
          <p>Start by inviting your volunteers and creating your first shift.</p>
          <p>Porpoise will handle the rest.</p>
        </div>
      ),
      cta: 'Go to dashboard',
      illustration: () => <IllustrationReady />,
    },
  ]
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-4 h-2 bg-[#3D4975]'
              : i < current
              ? 'w-2 h-2 bg-[#9aa0bc]'
              : 'w-2 h-2 bg-[#d0d4e8]'
          }`}
        />
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminOnboardPage() {
  const router = useRouter()
  const [screenIndex, setScreenIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const screens = makeScreens()
  const screen = screens[screenIndex]
  const isLast = screenIndex === TOTAL_SCREENS - 1
  const isFirst = screenIndex === 0
  // Track which screen is "active" for illustrations (delayed to match animation)
  const [activeIndex, setActiveIndex] = useState(0)
  const transitioning = useRef(false)

  function goTo(index: number) {
    if (transitioning.current) return
    transitioning.current = true
    setVisible(false)
    setTimeout(() => {
      setScreenIndex(index)
      setActiveIndex(index)
      setVisible(true)
      transitioning.current = false
    }, 200)
  }

  function handleNext() {
    if (isLast) {
      router.push('/shifts')
    } else {
      goTo(screenIndex + 1)
    }
  }

  function handleBack() {
    if (!isFirst) goTo(screenIndex - 1)
  }

  return (
    <PageShell className="items-center justify-center">
      <div className="w-full max-w-[360px] mx-auto flex flex-col gap-0">
        {/* Progress + skip row */}
        <div className="flex items-center justify-between mb-4">
          <ProgressDots current={screenIndex} total={TOTAL_SCREENS} />
          {!isLast && (
            <button
              onClick={() => router.push('/shifts')}
              className="text-[10px] text-[#9aa0bc] hover:text-[#5a6490] transition-colors"
            >
              Skip →
            </button>
          )}
        </div>

        {/* Animated content area */}
        <div
          className={`flex flex-col gap-4 transition-all duration-200 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {/* Illustration */}
          <div className="flex justify-center items-center min-h-[120px]">
            {screen.illustration(activeIndex === screenIndex)}
          </div>

          {/* Title */}
          <div className="text-[17px] font-semibold text-[#2a2a3d] leading-snug">
            {screen.title}
          </div>

          {/* Body */}
          <div>{screen.body}</div>

          {/* CTA */}
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="primary" onClick={handleNext}>
              {screen.cta}
            </Button>
            {!isFirst && (
              <button
                onClick={handleBack}
                className="text-[11px] text-[#9aa0bc] text-center hover:text-[#5a6490] transition-colors py-1"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
