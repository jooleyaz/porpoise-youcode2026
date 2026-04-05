'use client'

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[12px] font-semibold text-[#3D4975]">{label}</label>
      )}
      <input
        className={`rounded-xl border border-[#a0aad0] bg-white px-3 py-2 text-[13px] text-[#2a2a3d] outline-none focus:border-[#3D4975] ${className}`}
        {...props}
      />
    </div>
  )
}
