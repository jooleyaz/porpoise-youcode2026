'use client'

import { useRouter } from 'next/navigation'
import PorpoiseIcon from '@/components/ui/PorpoiseIcon'

interface BackRowProps {
  title?: string
  boldPart?: string
  showIcon?: boolean
  href?: string
}

export default function BackRow({ title, boldPart, showIcon = false, href }: BackRowProps) {
  const router = useRouter()

  function handleBack() {
    if (href) router.push(href)
    else router.back()
  }

  return (
    <div className="flex items-center gap-2 mb-1">
      <button
        onClick={handleBack}
        className="text-[18px] text-[#3D4975] leading-none"
        aria-label="Go back"
      >
        ←
      </button>
      {title && (
        <div className="text-[16px] text-[#2a2a3d]">
          {title}{boldPart && <> <strong>{boldPart}</strong></>}
        </div>
      )}
      {showIcon && (
        <div className="ml-auto">
          <PorpoiseIcon size={28} className="opacity-50" />
        </div>
      )}
    </div>
  )
}
