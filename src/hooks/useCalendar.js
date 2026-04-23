import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, getDate, getMonth, getYear, format
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function useCalendar(eventos = []) {
  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(getMonth(hoje))
  const [anoAtual, setAnoAtual] = useState(getYear(hoje))

  function proximoMes() {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual(a => a + 1)
    } else {
      setMesAtual(m => m + 1)
    }
  }

  function mesAnterior() {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual(a => a - 1)
    } else {
      setMesAtual(m => m - 1)
    }
  }

  function irParaHoje() {
    setMesAtual(getMonth(hoje))
    setAnoAtual(getYear(hoje))
  }

  const { diasDoMes, primeirodiaSemana, nomeMes, eventosDoMes } = useMemo(() => {
    const ref = new Date(anoAtual, mesAtual, 1)
    const inicio = startOfMonth(ref)
    const fim = endOfMonth(ref)
    const diasDoMes = eachDayOfInterval({ start: inicio, end: fim })
    const primeirodiaSemana = getDay(inicio)
    const nomeMes = format(ref, 'MMMM yyyy', { locale: ptBR })

    const eventosDoMes = {}
    eventos.forEach(ev => {
      if (!ev.data_evento) return
      const d = new Date(ev.data_evento + 'T12:00:00')
      if (getMonth(d) === mesAtual && getYear(d) === anoAtual) {
        const dia = getDate(d)
        if (!eventosDoMes[dia]) eventosDoMes[dia] = []
        eventosDoMes[dia].push(ev)
      }
    })

    return { diasDoMes, primeirodiaSemana, nomeMes, eventosDoMes }
  }, [mesAtual, anoAtual, eventos])

  return {
    mesAtual,
    anoAtual,
    proximoMes,
    mesAnterior,
    irParaHoje,
    diasDoMes,
    primeirodiaSemana,
    nomeMes,
    eventosDoMes,
  }
}
