import { getDate, isToday } from 'date-fns'
import { CORES_CATEGORIA } from '../../lib/constants'

export default function CalendarDay({ dia, eventos = [], temNota = false, onClick, isCurrentMonth = true }) {
  const numero = getDate(dia)
  const ehHoje = isToday(dia)
  const mostrar = eventos.slice(0, 3)
  const extras = eventos.length - mostrar.length

  return (
    <button
      onClick={() => onClick(dia, eventos)}
      className={`relative flex flex-col items-start p-1.5 transition-colors duration-150 group text-left overflow-hidden
        border-r border-b border-slate-700/40
        ${!isCurrentMonth ? 'bg-slate-900/60 cursor-default' : ''}
        ${ehHoje ? 'ring-inset ring-1 ring-blue-500 bg-blue-600/10' : isCurrentMonth ? 'hover:bg-slate-700/40' : ''}`}
    >
      {temNota && (
        <span className="absolute top-0.5 right-0.5 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
        </span>
      )}

      {/* Número do dia */}
      <span
        className={`text-xs font-semibold leading-none mb-1.5 w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0
          ${ehHoje ? 'bg-blue-500 text-white' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}
      >
        {numero}
      </span>

      {/* Pills de eventos */}
      {isCurrentMonth && (
        <div className="flex flex-col gap-0.5 w-full">
          {mostrar.map(ev => {
            const cores = CORES_CATEGORIA[ev.categoria] ?? CORES_CATEGORIA['Outros']
            return (
              <span
                key={ev.id}
                className={`w-full block truncate rounded-sm px-1.5 py-[3px] text-[10px] font-medium leading-tight ${cores.bg} ${cores.text}`}
                title={ev.descricao}
              >
                {ev.descricao}
              </span>
            )
          })}
          {extras > 0 && (
            <span className="text-[10px] text-slate-500 pl-0.5 leading-tight">+{extras} mais</span>
          )}
        </div>
      )}
    </button>
  )
}
