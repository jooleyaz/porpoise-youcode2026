import type { ShiftStatus, AssignmentStatus } from '@/types'

type BadgeStatus = ShiftStatus | AssignmentStatus | string

const badgeStyles: Record<string, string> = {
  open:      'bg-[#BDDEDE] text-[#3D4975]',
  filled:    'bg-[#3D4975] text-white',
  cancelled: 'bg-[#533A3A] text-white',
  draft:     'bg-[#C2CAE7] text-[#3D4975]',
  pending:   'bg-[#C2CAE7] text-[#3D4975]',
  confirmed: 'bg-[#BDDEDE] text-[#3D4975]',
  invited:   'bg-[#D8EAEF] text-[#3D4975]',
  active:    'bg-[#BDDEDE] text-[#2d5a5a]',
  inactive:  'bg-[#e8eaf0] text-[#9aa0bc]',
}

export default function Badge({ status }: { status: BadgeStatus }) {
  const cls = badgeStyles[status] ?? 'bg-[#C2CAE7] text-[#3D4975]'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}
