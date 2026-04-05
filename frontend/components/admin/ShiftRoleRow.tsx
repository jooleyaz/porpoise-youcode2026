'use client'

interface ShiftRoleRowProps {
  name: string
  count: number
  onCountChange?: (count: number) => void
  editable?: boolean
}

export default function ShiftRoleRow({ name, count, onCountChange, editable = false }: ShiftRoleRowProps) {
  return (
    <div className="bg-[#BDDEDE] rounded-lg px-[10px] py-[7px] flex justify-between items-center mb-1">
      <div className="text-[12px] font-semibold text-[#2d5a5a]">{name}</div>
      {editable && onCountChange ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCountChange(Math.max(1, count - 1))}
            className="w-6 h-6 rounded-full bg-white text-[#3D4975] text-sm font-bold flex items-center justify-center"
          >
            −
          </button>
          <span className="text-[13px] font-bold text-[#2d5a5a] w-4 text-center">{count}</span>
          <button
            onClick={() => onCountChange(count + 1)}
            className="w-6 h-6 rounded-full bg-white text-[#3D4975] text-sm font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
      ) : (
        <div className="text-[13px] font-bold text-[#2d5a5a]">{count}</div>
      )}
    </div>
  )
}
