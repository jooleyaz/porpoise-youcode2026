interface VFBannerProps {
  role: string
  count: number
  timeAgo: string
}

export default function VFBanner({ role, count, timeAgo }: VFBannerProps) {
  return (
    <div className="bg-[#f0f2f8] rounded-xl px-[10px] py-[8px]">
      <div className="text-[10px] font-semibold text-[#7a80a0] uppercase tracking-[0.06em]">
        Auto-cover running
      </div>
      <div className="text-[11px] text-[#3D4975] mt-0.5">
        Outreach sent to <strong>{count} eligible volunteers</strong> — {timeAgo}.
      </div>
    </div>
  )
}
