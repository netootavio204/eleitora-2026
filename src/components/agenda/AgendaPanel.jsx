import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AgendaSection from './AgendaSection'
import AgendaItem from './AgendaItem'
import { chipEmDias } from '../../lib/dateUtils'
import { CORES_CATEGORIA } from '../../lib/constants'

function truncar(texto, max = 80) {
  if (!texto || texto.length <= max) return texto
  return texto.slice(0, max).trimEnd() + '…'
}

const PALAVRAS_IMPORTANTES = ['eleição', 'eleições', 'votação', 'apuração', 'posse', 'turno']

function ehImportante(descricao) {
  if (!descricao) return false
  const lower = descricao.toLowerCase()
  return PALAVRAS_IMPORTANTES.some(p => lower.includes(p))
}

function AgendaItemProximo({ evento, onClick }) {
  const cores = CORES_CATEGORIA[evento.categoria] ?? CORES_CATEGORIA['Outros']
  const chip = chipEmDias(evento.data_evento)
  const importante = ehImportante(evento.descricao)

  return (
    <button
      onClick={() => onClick?.(evento)}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors duration-150 flex items-start gap-2.5
        ${importante
          ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
          : 'border-slate-700/50 hover:bg-slate-700/50'}`}
    >
      {importante && (
        <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">⭐</span>
      )}
      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 mt-0.5 ${cores.bg} ${cores.text}`}>
        {evento.categoria?.split(' ')[0]}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug truncate ${importante ? 'text-amber-100 font-medium' : 'text-slate-300'}`}>
          {truncar(evento.descricao, 70)}
        </p>
      </div>
      <span className="text-[11px] text-slate-500 flex-shrink-0 whitespace-nowrap">{chip}</span>
    </button>
  )
}

export default function AgendaPanel({ eventos = [], onEventoClick, periodo = 'todos' }) {
  const hoje = new Date()
  const hojeStr = hoje.toISOString().slice(0, 10)

  const [incluirPassados, setIncluirPassados] = useState(false)

  const { evHoje, evUrgentes, evProximos, evTodos, evFiltrados, tituloFiltro } = useMemo(() => {
    const todosSorted = [...eventos].sort((a, b) =>
      a.data_evento.localeCompare(b.data_evento)
    )

    const evHoje = todosSorted.filter(e => e.data_evento === hojeStr)

    const evUrgentes = todosSorted.filter(e => {
      const diff = differenceInCalendarDays(new Date(e.data_evento + 'T12:00:00'), hoje)
      return diff > 0 && diff <= 3
    })

    const evProximos = todosSorted.filter(e => {
      const diff = differenceInCalendarDays(new Date(e.data_evento + 'T12:00:00'), hoje)
      return diff > 3
    })

    const evTodos = incluirPassados
      ? todosSorted
      : todosSorted.filter(e => e.data_evento >= hojeStr)

    // Filtros específicos de período
    let evFiltrados = []
    let tituloFiltro = ''

    if (periodo === 'hoje') {
      evFiltrados = evHoje
      tituloFiltro = 'Hoje'
    } else if (periodo === 'semana') {
      const semanaFim = new Date(hoje)
      semanaFim.setDate(semanaFim.getDate() + 7)
      const semanaFimStr = semanaFim.toISOString().slice(0, 10)
      evFiltrados = todosSorted.filter(e => e.data_evento >= hojeStr && e.data_evento <= semanaFimStr)
      tituloFiltro = 'Esta semana'
    } else if (periodo === 'mes') {
      const mesAtual = hoje.getMonth()
      const anoAtual = hoje.getFullYear()
      evFiltrados = todosSorted.filter(e => {
        const d = new Date(e.data_evento + 'T12:00:00')
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
      })
      tituloFiltro = 'Este mês'
    }

    return { evHoje, evUrgentes, evProximos, evTodos, evFiltrados, tituloFiltro }
  }, [eventos, hojeStr, periodo, incluirPassados])

  const dataHoje = format(hoje, "dd 'de' MMMM", { locale: ptBR })

  // Modo "Todos": lista completa com scroll e opção de incluir passados
  if (periodo === 'todos') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Todos os eventos
            </span>
            <span className="text-[11px] text-slate-600">{evTodos.length} eventos</span>
          </div>
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={incluirPassados}
              onChange={e => setIncluirPassados(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-blue-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
              Incluir eventos passados
            </span>
          </label>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
          {evTodos.length === 0 ? (
            <p className="text-xs text-slate-600 px-3 py-2">Nenhum evento encontrado.</p>
          ) : (
            evTodos.map(ev => (
              <AgendaItem key={ev.id} evento={ev} onClick={onEventoClick} />
            ))
          )}
        </div>
      </div>
    )
  }

  // Modo filtrado (hoje / semana / mês): lista plana com título
  if (periodo === 'hoje' || periodo === 'semana' || periodo === 'mes') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {tituloFiltro}
            </span>
            <span className="text-[11px] text-slate-600">{evFiltrados.length} eventos</span>
          </div>
          {periodo === 'hoje' && (
            <p className="text-[11px] text-slate-500 mt-0.5">{dataHoje}</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
          {evFiltrados.length === 0 ? (
            <p className="text-xs text-slate-600 px-3 py-2">Nenhum evento neste período.</p>
          ) : (
            evFiltrados.map(ev => (
              <AgendaItem key={ev.id} evento={ev} onClick={onEventoClick} />
            ))
          )}
        </div>
      </div>
    )
  }

  // Fallback: visão padrão com seções temporais
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
        <AgendaSection titulo="Hoje" subtitulo={dataHoje} variante="hoje">
          {evHoje.length === 0 ? (
            <p className="text-xs text-slate-600 px-3 py-1">Nenhum evento hoje.</p>
          ) : (
            evHoje.map(ev => (
              <AgendaItem key={ev.id} evento={ev} onClick={onEventoClick} />
            ))
          )}
        </AgendaSection>

        {evUrgentes.length > 0 && (
          <AgendaSection titulo="Próximas 72h" variante="urgente">
            {evUrgentes.map(ev => (
              <AgendaItem key={ev.id} evento={ev} onClick={onEventoClick} />
            ))}
          </AgendaSection>
        )}

        {evProximos.length > 0 && (
          <AgendaSection titulo="Próximos eventos" variante="normal">
            {evProximos.map(ev => (
              <AgendaItemProximo key={ev.id} evento={ev} onClick={onEventoClick} />
            ))}
          </AgendaSection>
        )}
      </div>
    </div>
  )
}
