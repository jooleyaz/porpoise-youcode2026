'use client'

import Button from './Button'

interface ModalProps {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function Modal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl flex flex-col gap-3">
        <div className="text-[16px] font-semibold text-[#2a2a3d]">{title}</div>
        {message && <div className="text-[13px] text-[#5a6490] leading-relaxed">{message}</div>}
        <div className="flex flex-col gap-2 mt-1">
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
        </div>
      </div>
    </div>
  )
}
