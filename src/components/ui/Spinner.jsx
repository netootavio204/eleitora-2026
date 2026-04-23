import clsx from 'clsx'

export default function Spinner({ fullScreen = false, size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
  }

  const spinner = (
    <div
      className={clsx(
        'rounded-full border-slate-600 border-t-blue-500 animate-spin',
        sizes[size] ?? sizes.md
      )}
      role="status"
      aria-label="Carregando"
    />
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-slate-600 border-t-blue-500 animate-spin" />
      </div>
    )
  }

  return spinner
}
