interface CoverStatusProps {
  filled: number
  total: number
  timerLabel: string
}

export default function CoverStatus({ filled, total, timerLabel }: CoverStatusProps) {
  return (
    <div className="bg-[#D8EAEF] rounded-xl px-[10px] py-[8px]">
      <div className="text-[10px] font-semibold text-[#5a7a8a] uppercase tracking-[0.06em]">
        Responses
      </div>
      <div className="flex gap-1 mt-[6px]">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-[10px] h-[10px] rounded-full ${i < filled ? 'bg-[#3D4975]' : 'bg-[#a0c8d8]'}`}
          />
        ))}
      </div>
      <div className="text-[11px] text-[#3D4975] mt-1 font-medium">{timerLabel}</div>
    </div>
  )
}
