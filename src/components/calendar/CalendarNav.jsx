export default function CalendarNav({ nomeMes, onAnterior, onProximo, onHoje }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
      <div className="flex items-center gap-2">
        <button
          onClick={onAnterior}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="Mês anterior"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-slate-100 text-sm font-medium capitalize min-w-[140px] text-center">
          {nomeMes}
        </h2>
        <button
          onClick={onProximo}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          aria-label="Próximo mês"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <button
        onClick={onHoje}
        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
      >
        Hoje
      </button>
    </div>
  )
}
