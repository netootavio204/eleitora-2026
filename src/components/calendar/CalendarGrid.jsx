import { useState, useEffect, useMemo } from 'react'
import { getDate, subDays, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { useCalendar } from '../../hooks/useCalendar'
import CalendarNav from './CalendarNav'
import CalendarDay from './CalendarDay'
import EventModal from '../events/EventModal'
import Modal from '../ui/Modal'
import { CORES_CATEGORIA } from '../../lib/constants'
import { formatarDataCurta } from '../../lib/dateUtils'
import { supabase } from '../../lib/supabase'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const LEGENDA = [
  { label: 'Justiça',    key: 'Justiça Eleitoral' },
  { label: 'Candidatos', key: 'Candidatos e Partidos' },
  { label: 'Eleitores',  key: 'Eleitores e Mesários' },
  { label: 'Poder Público', key: 'Poder Público' },
  { label: 'Comunicação',   key: 'Comunicação' },
]

function DayPickerModal({ eventos, onSelect, onClose }) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="px-5 pt-5 pb-2 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-slate-200 text-sm font-medium">
            {formatarDataCurta(eventos[0]?.data_evento)}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">{eventos.length} eventos neste dia</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4 flex flex-col gap-2">
        {eventos.map(ev => {
          const cores = CORES_CATEGORIA[ev.categoria] ?? CORES_CATEGORIA['Outros']
          return (
            <button
              key={ev.id}
              onClick={() => onSelect(ev)}
              className="w-full text-left p-3 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors flex flex-col gap-1.5"
            >
              <span className={`self-start px-2 py-0.5 rounded-full text-[11px] font-medium ${cores.bg} ${cores.text}`}>
                {ev.categoria}
              </span>
              <p className="text-slate-200 text-sm leading-snug">{ev.descricao}</p>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

export default function CalendarGrid({ eventos = [], periodo = 'hoje' }) {
  const {
    proximoMes, mesAnterior, irParaHoje,
    diasDoMes, primeirodiaSemana, nomeMes, eventosDoMes,
    mesAtual, anoAtual,
  } = useCalendar(eventos)

  const [eventosDia, setEventosDia] = useState(null)
  const [eventoAberto, setEventoAberto] = useState(null)
  const [diasComNota, setDiasComNota] = useState(new Set())

  useEffect(() => {
    if (periodo === 'todos') irParaHoje()
  }, [periodo])

  // Busca notas do usuário logado para os eventos do mês visível
  useEffect(() => {
    let cancelado = false
    async function buscarNotasDoMes() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const idsDoMes = Object.values(eventosDoMes).flat().map(e => e.id)
      if (idsDoMes.length === 0) {
        if (!cancelado) setDiasComNota(new Set())
        return
      }

      const { data } = await supabase
        .from('notas')
        .select('evento_id')
        .eq('user_id', user.id)
        .in('evento_id', idsDoMes)

      if (cancelado || !data) return

      // Mapeia evento_id → data do evento para saber quais dias têm nota
      const eventoIdParaDia = {}
      Object.entries(eventosDoMes).forEach(([dia, evts]) => {
        evts.forEach(e => { eventoIdParaDia[e.id] = Number(dia) })
      })

      const diasSet = new Set(
        data.map(n => eventoIdParaDia[n.evento_id]).filter(Boolean)
      )
      setDiasComNota(diasSet)
    }

    buscarNotasDoMes()
    return () => { cancelado = true }
  }, [eventosDoMes, mesAtual, anoAtual])

  function handleDiaClick(_, evts) {
    if (!evts.length) return
    if (evts.length === 1) {
      setEventoAberto(evts[0])
    } else {
      setEventosDia(evts)
    }
  }

  function handlePickerSelect(ev) {
    setEventosDia(null)
    setEventoAberto(ev)
  }

  // Dias do mês anterior para preencher os slots iniciais
  const inicioMes = startOfMonth(new Date(anoAtual, mesAtual, 1))
  const prevDays = Array.from({ length: primeirodiaSemana }, (_, i) =>
    subDays(inicioMes, primeirodiaSemana - i)
  )

  // Dias do próximo mês para completar a última linha
  const fimMes = endOfMonth(new Date(anoAtual, mesAtual, 1))
  const totalCells = primeirodiaSemana + diasDoMes.length
  const trailingCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
  const nextDays = Array.from({ length: trailingCount }, (_, i) =>
    addDays(fimMes, i + 1)
  )

  return (
    <div className="flex flex-col h-full bg-[#1E293B] rounded-xl border border-slate-700">
      {/* Nav + Legenda */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-700/60 flex-wrap gap-2">
        <CalendarNav
          nomeMes={nomeMes}
          onAnterior={mesAnterior}
          onProximo={proximoMes}
          onHoje={irParaHoje}
        />
        <div className="flex items-center gap-3 flex-wrap">
          {LEGENDA.map(({ label, key }) => {
            const cor = CORES_CATEGORIA[key]
            return (
              <span key={key} className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cor.dot }} />
                {label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Cabeçalho dias semana */}
      <div className="grid grid-cols-7 px-0 pt-2 pb-1 border-b border-slate-700/40">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-500 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias — com bordas entre células */}
      <div
        className="grid grid-cols-7 flex-1 border-l border-slate-700/40"
        style={{ gridAutoRows: 'minmax(100px, 1fr)' }}
      >
        {/* Dias do mês anterior */}
        {prevDays.map(dia => (
          <CalendarDay
            key={`prev-${dia.toISOString()}`}
            dia={dia}
            eventos={[]}
            temNota={false}
            onClick={() => {}}
            isCurrentMonth={false}
          />
        ))}

        {/* Dias do mês atual */}
        {diasDoMes.map(dia => {
          const numero = getDate(dia)
          const evtsDia = eventosDoMes[numero] || []
          const temNota = diasComNota.has(numero)
          return (
            <CalendarDay
              key={dia.toISOString()}
              dia={dia}
              eventos={evtsDia}
              temNota={temNota}
              onClick={handleDiaClick}
              isCurrentMonth
            />
          )
        })}

        {/* Dias do próximo mês */}
        {nextDays.map(dia => (
          <CalendarDay
            key={`next-${dia.toISOString()}`}
            dia={dia}
            eventos={[]}
            temNota={false}
            onClick={() => {}}
            isCurrentMonth={false}
          />
        ))}
      </div>

      {eventosDia && (
        <DayPickerModal
          eventos={eventosDia}
          onSelect={handlePickerSelect}
          onClose={() => setEventosDia(null)}
        />
      )}

      {eventoAberto && (
        <EventModal
          evento={eventoAberto}
          onClose={() => setEventoAberto(null)}
        />
      )}
    </div>
  )
}
