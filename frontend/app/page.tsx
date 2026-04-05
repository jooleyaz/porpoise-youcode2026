'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getSession } from '@/lib/session'
import PageShell from '@/components/layout/PageShell'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    if (session?.isAdmin) {
      router.replace('/shifts')
    } else if (session) {
      router.replace('/dashboard')
    }
    // No session → show landing
  }, [router])

  return (
    <PageShell className="items-center justify-center text-center gap-[14px]">
      <Image src="/logos/banner.png" alt="Porpoise" width={180} height={60} className="object-contain" />
      <div className="text-[13px] text-[#5a6490] leading-relaxed">
        The nonprofit scheduling system that meets your volunteers where they are.
        <br />
        <em>Find your porpoise.</em>
      </div>
      <div className="bg-[#C2CAE7] rounded-xl px-4 py-[10px] w-full text-left">
        <div className="text-[11px] text-[#5a6490]">Volunteer?</div>
        <div className="text-[12px] text-[#3D4975]">Check your SMS for an invite link to get started.</div>
      </div>
      <div className="bg-[#D8EAEF] rounded-xl px-4 py-[10px] w-full text-left">
        <div className="text-[11px] text-[#5a7a8a]">Shift lead?</div>
        <div className="text-[12px] text-[#3D4975]">Contact your org admin to get access.</div>
      </div>
    </PageShell>
  )
}
