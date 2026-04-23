import clsx from 'clsx'

const ESTILOS = {
  sucesso: 'bg-green-900 border-green-700 text-green-200',
  erro:    'bg-red-900   border-red-700   text-red-200',
  info:    'bg-blue-900  border-blue-700  text-blue-200',
}

const ICONES = {
  sucesso: '✓',
  erro:    '✕',
  info:    'ℹ',
}

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-start gap-3 px-4 py-3 rounded-lg border text-sm',
            'pointer-events-auto min-w-64 max-w-sm',
            'animate-in slide-in-from-right-4 fade-in duration-200',
            ESTILOS[toast.tipo] ?? ESTILOS.info
          )}
        >
          <span className="font-bold mt-0.5 shrink-0">
            {ICONES[toast.tipo] ?? ICONES.info}
          </span>
          <span className="flex-1 leading-snug">{toast.mensagem}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
