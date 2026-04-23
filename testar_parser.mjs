// Script para testar o parser localmente antes de atualizar o Deno scraper
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dldbfrulueckrokhlzbg.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZGJmcnVsdWVja3Jva2hsemJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg4NTI2NCwiZXhwIjoyMDkyNDYxMjY0fQ.qRF_E4rhjH01-gPXCF5-hBlOSDt80Li9gqGTd6PE6cE'

const URL_FONTE = 'https://www12.senado.leg.br/noticias/infomaterias/2026/03/confira-datas-e-prazos-do-calendario-eleitoral-de-2026'

// Mapa de categorias da fonte → categorias do sistema
const MAPA_CATEGORIAS = {
  // Justiça Eleitoral
  'justiça': 'Justiça Eleitoral',
  'justiça eleitoral': 'Justiça Eleitoral',

  // Candidatos e Partidos
  'candidatos': 'Candidatos e Partidos',
  'partidos': 'Candidatos e Partidos',
  'candidatos e partidos': 'Candidatos e Partidos',
  'partidos e candidatos': 'Candidatos e Partidos',
  'candidatos, partidos e federações': 'Candidatos e Partidos',
  'federações': 'Candidatos e Partidos',

  // Eleitores e Mesários
  'eleitores': 'Eleitores e Mesários',
  'mesários': 'Eleitores e Mesários',
  'eleitores e mesários': 'Eleitores e Mesários',
  'mesários e eleitores': 'Eleitores e Mesários',

  // Poder Público
  'poder público': 'Poder Público',
  'agentes públicos': 'Poder Público',
  'administração pública': 'Poder Público',
  'servidores públicos': 'Poder Público',
  'gestores públicos': 'Poder Público',

  // Comunicação
  'comunicação': 'Comunicação',
  'veículos de comunicação': 'Comunicação',
  'mídia': 'Comunicação',
  'emissoras de rádio e tv': 'Comunicação',
  'provedores de internet': 'Comunicação',

  // Poder Público — órgãos e entidades do Estado
  'forças armadas': 'Poder Público',
  'ministério das relações exteriores': 'Poder Público',
  'receita federal': 'Poder Público',
  'tribunais de contas': 'Poder Público',
  'órgãos públicos': 'Poder Público',
  'entidades fiscalizadoras': 'Poder Público',
}

const MESES = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

function mapearCategoria(textoCategoria) {
  const lower = textoCategoria.toLowerCase().trim()
  // Busca exata
  if (MAPA_CATEGORIAS[lower]) return MAPA_CATEGORIAS[lower]
  // Busca parcial
  for (const [chave, valor] of Object.entries(MAPA_CATEGORIAS)) {
    if (lower.includes(chave) || chave.includes(lower)) return valor
  }
  return 'Outros'
}

function parsearHTML(html) {
  const eventos = []

  // Rastrear o ano atual via cabeçalhos de mês (ex: "Março 2026", "Janeiro 2027")
  let anoAtual = 2026

  // Regex para capturar eventos: bloco de data+categoria seguido de descrição
  // Estrutura: <div style="font-size: 12px; color: #666;...">DD de Mês • Categoria</div>
  //            <div style="font-size: 14px; font-weight: bold;...">Descrição</div>
  const reEvento = /<div[^>]*font-size:\s*12px[^>]*color:\s*#666[^>]*>\s*([^<]+)\s*<\/div>\s*<div[^>]*font-size:\s*14px[^>]*font-weight:\s*bold[^>]*>\s*([\s\S]*?)\s*<\/div>/gi

  // Regex para cabeçalhos de mês com ano
  const reMesAno = /(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(20\d{2})/gi

  // Primeiro, coletar todos os cabeçalhos com suas posições
  const cabecalhos = []
  let m
  while ((m = reMesAno.exec(html)) !== null) {
    cabecalhos.push({ pos: m.index, ano: parseInt(m[1]) })
  }

  // Processar cada evento
  while ((m = reEvento.exec(html)) !== null) {
    const metaTexto = m[1].trim()
    const descricaoRaw = m[2]
    const posEvento = m.index

    // Determinar o ano: achar o cabeçalho mais recente antes desta posição
    let anoEvento = 2026
    for (const cab of cabecalhos) {
      if (cab.pos < posEvento) anoEvento = cab.ano
      else break
    }

    // Parsear "DD de Mês • Categoria"
    const partesMeta = metaTexto.split('•')
    if (partesMeta.length < 2) continue

    const parteData = partesMeta[0].trim()
    const parteCategoria = partesMeta.slice(1).join('•').trim()

    // Extrair dia e mês da parte de data: "05 de Março" ou "5 de março"
    const reData = /(\d{1,2})\s+de\s+([^\s•\n]+)/i
    const mData = parteData.match(reData)
    if (!mData) continue

    const dia = parseInt(mData[1])
    const nomeMes = mData[2].toLowerCase()
    const mesNum = MESES[nomeMes]
    if (!mesNum) continue

    const dataEvento = `${anoEvento}-${mesNum}-${String(dia).padStart(2, '0')}`
    const categoria = mapearCategoria(parteCategoria)

    // Limpar descrição: remover tags HTML
    const descricao = descricaoRaw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()

    if (!descricao || descricao.length < 5) continue

    eventos.push({
      data_evento: dataEvento,
      dia,
      mes: parseInt(mesNum),
      ano: anoEvento,
      categoria,
      descricao,
    })
  }

  return eventos
}

async function main() {
  console.log('Buscando página do Senado...')
  const resp = await fetch(URL_FONTE, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eleitoral2026/2.0)' }
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const html = await resp.text()
  console.log(`HTML obtido: ${html.length} bytes\n`)

  const eventos = parsearHTML(html)
  console.log(`=== EVENTOS EXTRAÍDOS: ${eventos.length} ===\n`)

  // Mostrar distribuição por categoria
  const porCategoria = {}
  eventos.forEach(e => {
    porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + 1
  })
  console.log('Por categoria:')
  Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(`  ${cat}: ${n}`)
  })

  // Mostrar primeiros 10 eventos como amostra
  console.log('\nAmostra (primeiros 10):')
  eventos.slice(0, 10).forEach(e => {
    console.log(`  [${e.data_evento}] ${e.categoria} — ${e.descricao.slice(0, 60)}`)
  })

  // Confirmar se quer salvar no banco
  console.log('\n=== SALVANDO NO BANCO ===')
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Limpar banco atual
  const { error: errDelete } = await supabase
    .from('eventos')
    .delete()
    .neq('id', 0)
  if (errDelete) throw new Error('Erro ao limpar banco: ' + errDelete.message)
  console.log('Banco limpo.')

  // Inserir todos os eventos
  const { data: inseridos, error: errInsert } = await supabase
    .from('eventos')
    .upsert(eventos, { onConflict: 'data_evento,descricao', ignoreDuplicates: false })
    .select('id')

  if (errInsert) throw new Error('Erro ao inserir: ' + errInsert.message)
  console.log(`✓ ${inseridos?.length ?? eventos.length} eventos inseridos no banco.`)

  // Confirmar distribuição final
  console.log('\n=== DISTRIBUIÇÃO FINAL NO BANCO ===')
  const { data: final } = await supabase.from('eventos').select('categoria')
  const grupoFinal = {}
  final.forEach(e => { grupoFinal[e.categoria] = (grupoFinal[e.categoria] || 0) + 1 })
  let total = 0
  Object.entries(grupoFinal).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(`  "${cat}": ${n} eventos`)
    total += n
  })
  console.log(`\nTotal: ${total} eventos`)
}

main().catch(e => { console.error(e); process.exit(1) })
