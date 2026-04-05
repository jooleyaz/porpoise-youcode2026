interface StarRowProps {
  count: number
}

export default function StarRow({ count }: StarRowProps) {
  return (
    <div className="flex items-center gap-[6px] text-[11px] text-[#533A3A] font-medium">
      <span className="text-[#3D4975] text-[12px]">★</span>
      <span>You&rsquo;ve volunteered {count} times this month!</span>
      <span className="text-[#3D4975] text-[12px]">★</span>
    </div>
  )
}
