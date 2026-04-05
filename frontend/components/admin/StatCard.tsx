interface StatCardProps {
  value: string
  sub: string
  variant?: 'lavender' | 'sky' | 'plain'
}

export default function StatCard({ value, sub, variant = 'lavender' }: StatCardProps) {
  const bg = variant === 'sky' ? 'bg-[#D8EAEF]' : variant === 'plain' ? 'bg-[#f0f2f8]' : 'bg-[#C2CAE7]'
  return (
    <div className={`${bg} rounded-xl px-[12px] py-[10px]`}>
      <div className="text-[14px] font-semibold text-[#3D4975]">{value}</div>
      <div className="text-[11px] text-[#5a6490] mt-0.5">{sub}</div>
    </div>
  )
}
