export default function AgendaSection({ titulo, subtitulo, variante = 'normal', children }) {
  return (
    <div className={`rounded-lg overflow-hidden ${
      variante === 'hoje'
        ? 'bg-slate-800/50 border-l-2 border-blue-500'
        : variante === 'urgente'
        ? 'bg-slate-800/30 border-l-2 border-red-500'
        : ''
    }`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {titulo}
        </span>
        {subtitulo && (
          <span className="text-[11px] text-slate-400">{subtitulo}</span>
        )}
        {variante === 'urgente' && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold uppercase animate-pulse">
            URGENTE
          </span>
        )}
      </div>
      <div className="px-2 pb-2 flex flex-col gap-1.5">
        {children}
      </div>
    </div>
  )
}
