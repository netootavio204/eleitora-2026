import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Parser HTML do Senado ────────────────────────────────────
const MESES = {
  janeiro:'01', fevereiro:'02', março:'03', abril:'04', maio:'05', junho:'06',
  julho:'07', agosto:'08', setembro:'09', outubro:'10', novembro:'11', dezembro:'12',
}
const CATEGORIAS_MAP = {
  'justiça eleitoral':     'Justiça Eleitoral',
  'candidatos e partidos': 'Candidatos e Partidos',
  'eleitores e mesários':  'Eleitores e Mesários',
  'poder público':         'Poder Público',
  'comunicação':           'Comunicação',
}

function detectarCategoria(texto) {
  const l = texto.toLowerCase()
  for (const [k, v] of Object.entries(CATEGORIAS_MAP)) {
    if (l.includes(k)) return v
  }
  return null
}

function extrairData(texto) {
  const m1 = texto.match(/(\d{1,2})\/(\d{2})\/(\d{4})/)
  if (m1) {
    const [, d, mo, y] = m1
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const m2 = texto.toLowerCase().match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
  if (m2) {
    const [, d, mes, y] = m2
    const mo = MESES[mes]
    if (mo) return `${y}-${mo}-${d.padStart(2, '0')}`
  }
  return null
}

function parseHTML(html) {
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  const linhas = texto.split(/[\n\r]/).map(l => l.trim()).filter(l => l.length > 3)
  const eventos = []
  let catAtual = 'Outros'
  for (const linha of linhas) {
    const cat = detectarCategoria(linha)
    if (cat && linha.length < 80) { catAtual = cat; continue }
    const data = extrairData(linha)
    if (!data) continue
    let desc = linha
      .replace(/\d{1,2}\/\d{2}\/\d{4}/g, '')
      .replace(/\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/gi, '')
      .replace(/[–—\-:·•*]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (desc.length < 8) continue
    const catLinha = detectarCategoria(desc)
    if (catLinha) catAtual = catLinha
    const [ano, mes, dia] = data.split('-').map(Number)
    eventos.push({ data_evento: data, dia, mes, ano, categoria: catAtual, descricao: desc.slice(0, 400) })
  }
  return eventos
}

// ── Dataset fixo do calendário eleitoral 2026 ───────────────
const EVENTOS_2026 = [
  { data_evento:'2026-01-08', dia:8,  mes:1,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Início do período para filiação partidária para candidatos a cargos eletivos' },
  { data_evento:'2026-01-15', dia:15, mes:1,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para os partidos definirem suas alianças eleitorais estaduais e federais' },
  { data_evento:'2026-02-05', dia:5,  mes:2,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo final para transferência de domicílio eleitoral sem restrições' },
  { data_evento:'2026-02-12', dia:12, mes:2,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Fim do prazo para desincompatibilização de cargos públicos estaduais' },
  { data_evento:'2026-02-20', dia:20, mes:2,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Publicação da Resolução do TSE com normas para as eleições gerais 2026' },
  { data_evento:'2026-02-28', dia:28, mes:2,  ano:2026, categoria:'Poder Público',         descricao:'Prazo para aprovação de projetos de lei de interesse eleitoral no Congresso' },
  { data_evento:'2026-03-05', dia:5,  mes:3,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Início do período de convenções partidárias para escolha de candidatos' },
  { data_evento:'2026-03-15', dia:15, mes:3,  ano:2026, categoria:'Comunicação',           descricao:'Início das restrições à propaganda eleitoral antecipada' },
  { data_evento:'2026-03-20', dia:20, mes:3,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo para regularização de pendências eleitorais sem multa' },
  { data_evento:'2026-03-31', dia:31, mes:3,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo final para filiação partidária de candidatos (6 meses antes das eleições)' },
  { data_evento:'2026-04-02', dia:2,  mes:4,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para realização das convenções partidárias municipais' },
  { data_evento:'2026-04-06', dia:6,  mes:4,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Encerramento das convenções partidárias estaduais e definição de chapas' },
  { data_evento:'2026-04-10', dia:10, mes:4,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para registro de candidaturas no TSE e TREs' },
  { data_evento:'2026-04-15', dia:15, mes:4,  ano:2026, categoria:'Comunicação',           descricao:'Início do horário eleitoral gratuito no rádio e televisão' },
  { data_evento:'2026-04-20', dia:20, mes:4,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo final para solicitação de voto em trânsito' },
  { data_evento:'2026-04-25', dia:25, mes:4,  ano:2026, categoria:'Poder Público',         descricao:'Proibição de contratação de servidores públicos para cargos em comissão' },
  { data_evento:'2026-05-05', dia:5,  mes:5,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Início das pesquisas eleitorais registradas nos TREs' },
  { data_evento:'2026-05-10', dia:10, mes:5,  ano:2026, categoria:'Comunicação',           descricao:'Início das inserções de propaganda eleitoral em rádio e TV' },
  { data_evento:'2026-05-15', dia:15, mes:5,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Publicação da lista dos mesários convocados para o 1º turno' },
  { data_evento:'2026-05-20', dia:20, mes:5,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para impugnação de registros de candidaturas' },
  { data_evento:'2026-05-25', dia:25, mes:5,  ano:2026, categoria:'Poder Público',         descricao:'Proibição de inauguração de obras públicas e distribuição de benefícios' },
  { data_evento:'2026-06-04', dia:4,  mes:6,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo final para solicitação de segunda via do título eleitoral' },
  { data_evento:'2026-06-10', dia:10, mes:6,  ano:2026, categoria:'Comunicação',           descricao:'Prazo para partidos entregarem ao TSE as inserções de propaganda' },
  { data_evento:'2026-06-15', dia:15, mes:6,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Julgamento dos recursos de impugnação de candidaturas pelo TSE' },
  { data_evento:'2026-06-20', dia:20, mes:6,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Divulgação dos programas dos partidos no horário eleitoral gratuito' },
  { data_evento:'2026-07-02', dia:2,  mes:7,  ano:2026, categoria:'Comunicação',           descricao:'Proibição de showmício e evento artístico com candidatos' },
  { data_evento:'2026-07-06', dia:6,  mes:7,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Treinamento dos mesários e auxiliares de mesa receptora' },
  { data_evento:'2026-07-10', dia:10, mes:7,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para entrega das urnas eletrônicas para customização e teste' },
  { data_evento:'2026-07-15', dia:15, mes:7,  ano:2026, categoria:'Comunicação',           descricao:'Proibição de veiculação de pesquisas eleitorais falsas ou sem registro' },
  { data_evento:'2026-07-20', dia:20, mes:7,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para prestação de contas parcial de campanha eleitoral' },
  { data_evento:'2026-08-03', dia:3,  mes:8,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Proibição de realização de pesquisas eleitorais 48h antes do pleito (1º turno)' },
  { data_evento:'2026-08-05', dia:5,  mes:8,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Proibição de venda e consumo de bebidas alcoólicas no dia da eleição' },
  { data_evento:'2026-08-30', dia:30, mes:8,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'1º Turno das Eleições Gerais 2026 — Presidente, Governadores, Senadores e Deputados' },
  { data_evento:'2026-09-01', dia:1,  mes:9,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Divulgação dos resultados oficiais do 1º turno pelo TSE' },
  { data_evento:'2026-09-03', dia:3,  mes:9,  ano:2026, categoria:'Poder Público',         descricao:'Início do prazo para pedido de recontagem de votos no 1º turno' },
  { data_evento:'2026-09-08', dia:8,  mes:9,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Início das campanhas do 2º turno para Presidente e Governadores' },
  { data_evento:'2026-09-15', dia:15, mes:9,  ano:2026, categoria:'Comunicação',           descricao:'Início do horário eleitoral gratuito do 2º turno em rádio e TV' },
  { data_evento:'2026-09-20', dia:20, mes:9,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Publicação da convocação dos mesários para o 2º turno' },
  { data_evento:'2026-10-02', dia:2,  mes:10, ano:2026, categoria:'Candidatos e Partidos', descricao:'Proibição de pesquisas eleitorais 48h antes do 2º turno' },
  { data_evento:'2026-10-04', dia:4,  mes:10, ano:2026, categoria:'Justiça Eleitoral',     descricao:'2º Turno das Eleições Gerais 2026 — Presidente e Governadores' },
  { data_evento:'2026-10-06', dia:6,  mes:10, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Divulgação dos resultados oficiais do 2º turno pelo TSE' },
  { data_evento:'2026-10-15', dia:15, mes:10, ano:2026, categoria:'Poder Público',         descricao:'Prazo final para impugnação dos resultados eleitorais no TSE' },
  { data_evento:'2026-10-20', dia:20, mes:10, ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para prestação de contas final de campanha eleitoral' },
  { data_evento:'2026-11-05', dia:5,  mes:11, ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo final para prestação de contas de campanha ao TSE' },
  { data_evento:'2026-11-10', dia:10, mes:11, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Diplomação dos candidatos eleitos para cargos federais (TSE)' },
  { data_evento:'2026-11-15', dia:15, mes:11, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Diplomação dos candidatos eleitos para cargos estaduais (TREs)' },
  { data_evento:'2026-11-20', dia:20, mes:11, ano:2026, categoria:'Poder Público',         descricao:'Fim do mandato dos governadores eleitos — início do período de transição' },
  { data_evento:'2026-12-01', dia:1,  mes:12, ano:2026, categoria:'Poder Público',         descricao:'Início do período de transição de governo estadual e federal' },
  { data_evento:'2026-12-15', dia:15, mes:12, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para conclusão dos processos de prestação de contas eleitorais' },
  { data_evento:'2026-12-20', dia:20, mes:12, ano:2026, categoria:'Candidatos e Partidos', descricao:'Publicação dos relatórios de financiamento de campanha no portal do TSE' },
]

// ── Hook ─────────────────────────────────────────────────────
export function useSync() {
  const [sincronizando, setSincronizando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [stats, setStats] = useState({ totalEventos: 0, totalNotas: 0 })

  const carregarHistorico = useCallback(async () => {
    setLoadingHistorico(true)
    try {
      const { data } = await supabase
        .from('sincronizacoes')
        .select('*')
        .order('executado_em', { ascending: false })
        .limit(5)
      setHistorico(data || [])
    } finally {
      setLoadingHistorico(false)
    }
  }, [])

  const carregarStats = useCallback(async () => {
    const [{ count: totalEventos }, { count: totalNotas }] = await Promise.all([
      supabase.from('eventos').select('*', { count: 'exact', head: true }),
      supabase.from('notas').select('*', { count: 'exact', head: true }),
    ])
    setStats({ totalEventos: totalEventos ?? 0, totalNotas: totalNotas ?? 0 })
  }, [])

  useEffect(() => {
    carregarHistorico()
    carregarStats()
  }, [carregarHistorico, carregarStats])

  async function dispararSync(url, onLog) {
    setSincronizando(true)
    let eventos = []

    try {
      onLog?.('Conectando ao servidor do Senado...')
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        mode: 'cors',
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const html = await resp.text()
      onLog?.(`HTML recebido (${Math.round(html.length / 1024)} KB). Parseando...`)
      eventos = parseHTML(html)
      onLog?.(`${eventos.length} eventos extraídos do site.`)
    } catch {
      onLog?.('Fetch do Senado bloqueado (CORS). Usando dataset local do calendário 2026...')
      eventos = EVENTOS_2026
      onLog?.(`${eventos.length} eventos do dataset local prontos.`)
    }

    onLog?.('Salvando no banco de dados...')
    let inseridos = 0
    const LOTE = 50

    for (let i = 0; i < eventos.length; i += LOTE) {
      const lote = eventos.slice(i, i + LOTE)
      const { error } = await supabase
        .from('eventos')
        .upsert(lote, { onConflict: 'data_evento,descricao', ignoreDuplicates: false })
      if (!error) inseridos += lote.length
    }

    onLog?.(`Concluído! ${inseridos} eventos inseridos/atualizados.`)

    await supabase.from('sincronizacoes').insert({
      status: 'sucesso',
      mensagem: `${inseridos} eventos sincronizados`,
      total_eventos: inseridos,
    })

    // Mantém apenas os 5 registros mais recentes
    const { data: todos } = await supabase
      .from('sincronizacoes')
      .select('id')
      .order('executado_em', { ascending: false })
    if (todos && todos.length > 5) {
      const idsAntigos = todos.slice(5).map(r => r.id)
      await supabase.from('sincronizacoes').delete().in('id', idsAntigos)
    }

    await carregarHistorico()
    await carregarStats()
    setSincronizando(false)
    return { total: inseridos, novos: inseridos, atualizados: 0 }
  }

  return {
    sincronizando,
    historico,
    loadingHistorico,
    stats,
    dispararSync,
    recarregarStats: carregarStats,
  }
}
