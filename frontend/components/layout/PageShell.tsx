interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-[420px] md:ml-[152px] md:max-w-none md:w-auto md:max-w-[860px] bg-white min-h-screen flex flex-col gap-[10px] px-4 py-5 md:px-8 md:py-6 ${className}`}>
      {children}
    </div>
  )
}
