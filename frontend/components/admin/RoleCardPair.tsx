'use client'

interface RoleCard {
  name: string
  total: number
  filled: number
  volunteers: string[]
  variant: 'purple' | 'sand'
}

interface RoleCardPairProps {
  cards: RoleCard[]
  onAddStaff?: (roleName: string) => void
}

export default function RoleCardPair({ cards, onAddStaff }: RoleCardPairProps) {
  return (
    <div className="flex gap-2">
      {cards.map(card => {
        const bg = card.variant === 'sand' ? 'bg-[#e8d9b8]' : 'bg-[#C2CAE7]'
        const textPrimary = card.variant === 'sand' ? 'text-[#6b4f1a]' : 'text-[#3D4975]'
        const textSub = card.variant === 'sand' ? 'text-[#8a6a30]' : 'text-[#5a6490]'
        const btnBg = card.variant === 'sand' ? 'bg-[#6b4f1a]' : 'bg-[#3D4975]'

        return (
          <div key={card.name} className={`flex-1 ${bg} rounded-xl p-[10px] flex flex-col`}>
            <div className={`text-[20px] font-bold ${textPrimary} text-center`}>{card.total}</div>
            <div className={`text-[11px] font-semibold ${textPrimary} text-center mb-[6px]`}>{card.name}</div>
            <div className={`text-[10px] font-semibold ${textPrimary} text-center`}>
              {card.filled}/{card.total} Registered
            </div>
            <div className={`text-[10px] ${textSub} text-center`}>
              {card.volunteers.slice(0, 2).join('\n')}
            </div>
            <button
              onClick={() => onAddStaff?.(card.name)}
              className={`${btnBg} text-white rounded-lg px-2 py-[5px] text-[10px] w-full mt-[6px]`}
            >
              + Add staff
            </button>
          </div>
        )
      })}
    </div>
  )
}
