import { CORES_CATEGORIA } from '../../lib/constants'
import { chipEmDias, formatarDataCurta } from '../../lib/dateUtils'
import { useNotes } from '../../hooks/useNotes'
import NoteTag from '../notes/NoteTag'

function truncar(texto, max = 80) {
  if (!texto || texto.length <= max) return texto
  return texto.slice(0, max).trimEnd() + '…'
}

export default function AgendaItem({ evento, onClick }) {
  const cores = CORES_CATEGORIA[evento.categoria] ?? CORES_CATEGORIA['Outros']
  const chip = chipEmDias(evento.data_evento)
  const { notas } = useNotes(evento.id)

  return (
    <button
      onClick={() => onClick?.(evento)}
      className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors duration-150 flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cores.bg} ${cores.text}`}>
          {evento.categoria}
        </span>
      </div>
      <p className="text-sm text-slate-200 leading-snug">
        {truncar(evento.descricao)}
      </p>
      {notas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {notas.map(nota => (
            <NoteTag key={nota.id} cor={nota.cor} titulo={nota.titulo} temLink={!!nota.link_url} />
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">
        {formatarDataCurta(evento.data_evento)}
        {chip !== 'hoje' && chip !== 'ontem' && (
          <span className="ml-2 text-slate-600">{chip}</span>
        )}
      </p>
    </button>
  )
}
