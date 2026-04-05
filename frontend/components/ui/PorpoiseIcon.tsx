interface PorpoiseIconProps {
  size?: number
  className?: string
}

export default function PorpoiseIcon({ size = 28, className = '' }: PorpoiseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
    >
      <ellipse cx="20" cy="22" rx="12" ry="9" fill="#BDDEDE" />
      <ellipse cx="20" cy="20" rx="9" ry="7" fill="#C2CAE7" />
      <path
        d="M8 28 Q12 34 20 32 Q28 34 32 28"
        stroke="#3D4975"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="16" cy="19" r="1.5" fill="#3D4975" />
    </svg>
  )
}
