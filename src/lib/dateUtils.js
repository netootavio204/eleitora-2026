import { format, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatarDataExtenso(dataStr) {
  // "Segunda-feira, 04 de outubro de 2026"
  return format(new Date(dataStr + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatarDataCurta(dataStr) {
  // "04/10/2026"
  return format(new Date(dataStr + 'T12:00:00'), 'dd/MM/yyyy')
}

export function chipEmDias(dataStr) {
  // "em 165 dias" | "hoje" | "amanhã" | "ontem" | "há X dias"
  const diff = differenceInCalendarDays(new Date(dataStr + 'T12:00:00'), new Date())

  if (diff === 0)  return 'hoje'
  if (diff === 1)  return 'amanhã'
  if (diff === -1) return 'ontem'
  if (diff > 0)    return `em ${diff} dias`
  return `há ${Math.abs(diff)} dias`
}

export function isUrgente(dataStr) {
  // true se o evento ocorre nas próximas 72 horas (0 a 3 dias)
  const diff = differenceInCalendarDays(new Date(dataStr + 'T12:00:00'), new Date())
  return diff >= 0 && diff <= 3
}
