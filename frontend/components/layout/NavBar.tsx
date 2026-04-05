'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { getSession, clearSession } from '@/lib/session'
import type { Session } from '@/types'

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    setSession(getSession())
  }, [pathname])

  if (!session) return null

  const isActive = (path: string) => pathname?.startsWith(path)

  const adminLinks = [
    { label: 'Dashboard', href: '/shifts' },
    { label: 'Shifts', href: '/shifts' },
    { label: 'Volunteers', href: '/volunteers' },
    { label: 'Schedule', href: '/schedule' },
  ]

  const volunteerLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My shifts', href: '/pickup' },
    { label: 'Availability', href: '/availability' },
  ]

  const links = session.isAdmin ? adminLinks : volunteerLinks
  const homeHref = session.isAdmin ? '/shifts' : '/dashboard'

  return (
    <>
      {/* ── MOBILE top bar (hidden on md+) ── */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-[#d0d4e8]">
        <div className="mx-auto max-w-[420px] px-4 py-2 flex items-center justify-between">
          <button onClick={() => router.push(homeHref)}>
            <Image src="/logos/main.png" alt="Porpoise" width={90} height={28} className="object-contain" />
          </button>
          <div className="flex items-center gap-1">
            {links.slice(0, 2).map(({ label, href }) => {
              const active = isActive(href)
              return (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  className={`text-[12px] font-medium px-3 py-1 rounded-lg transition-colors ${
                    active ? 'bg-[#3D4975] text-white' : 'text-[#3D4975] hover:bg-[#C2CAE7]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
            <button
              onClick={() => { clearSession(); router.replace('/') }}
              className="text-[11px] text-[#9aa0bc] px-2 py-1 hover:text-[#533A3A]"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP sidebar (hidden below md) ── */}
      <aside className="hidden md:flex flex-col w-[152px] bg-[#3D4975] min-h-screen fixed left-0 top-0 z-40 py-4 px-3">
        <button onClick={() => router.push(homeHref)} className="mb-5 flex items-center gap-2">
          <Image src="/logos/lightbanner.png" alt="Porpoise" width={110} height={30} className="object-contain" />
        </button>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ label, href }) => {
            const active = isActive(href)
            return (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`text-left px-[10px] py-[7px] rounded-lg text-[11px] transition-colors ${
                  active ? 'bg-white/15 text-white font-medium' : 'text-[#c2cae7] hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={() => router.push('/settings')}
            className="text-left px-[10px] py-[7px] rounded-lg text-[11px] text-[#c2cae7] hover:bg-white/10"
          >
            Settings
          </button>
          <button
            onClick={() => { clearSession(); router.replace('/') }}
            className="text-left px-[10px] py-[7px] text-[10px] text-[#8a96c0] hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}
