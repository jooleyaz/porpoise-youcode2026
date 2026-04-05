'use client'

import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'disabled'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: React.ReactNode
}

const styles: Record<Variant, string> = {
  primary:   'bg-[#3D4975] text-white',
  secondary: 'bg-[#C2CAE7] text-[#3D4975]',
  ghost:     'bg-[#BDDEDE] text-[#2d5a5a]',
  danger:    'bg-[#533A3A] text-[#f5e8e8]',
  disabled:  'bg-[#e8eaf0] text-[#9aa0bc] cursor-not-allowed',
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const v = disabled ? 'disabled' : variant
  return (
    <button
      disabled={disabled || variant === 'disabled'}
      className={`w-full rounded-xl px-[14px] py-[11px] text-[13px] font-medium text-center transition-opacity active:opacity-80 ${styles[v]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
