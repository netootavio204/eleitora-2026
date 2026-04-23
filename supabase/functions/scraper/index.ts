import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const URL_PADRAO =
  'https://www12.senado.leg.br/noticias/infomaterias/2026/03/confira-datas-e-prazos-do-calendario-eleitoral-de-2026'

// Mapa completo de categorias da fonte → categorias do sistema
const MAPA_CATEGORIAS: Record<string, string> = {
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

const MESES: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

function mapearCategoria(textoCategoria: string): string {
  const lower = textoCategoria.toLowerCase().trim()
  if (MAPA_CATEGORIAS[lower]) return MAPA_CATEGORIAS[lower]
  for (const [chave, valor] of Object.entries(MAPA_CATEGORIAS)) {
    if (lower.includes(chave) || chave.includes(lower)) return valor
  }
  return 'Outros'
}

type Evento = {
  data_evento: string
  dia: number
  mes: number
  ano: number
  categoria: string
  descricao: string
}

function parsearHTML(html: string): Evento[] {
  const eventos: Evento[] = []

  // Coletar cabeçalhos de mês com ano e suas posições no HTML
  // Estrutura: <h3>Março 2026</h3>, <h3>Janeiro 2027</h3>
  const reMesAno = /(?:Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(20\d{2})/gi
  const cabecalhos: Array<{ pos: number; ano: number }> = []
  let m: RegExpExecArray | null

  while ((m = reMesAno.exec(html)) !== null) {
    cabecalhos.push({ pos: m.index, ano: parseInt(m[1]) })
  }

  // Cada evento tem dois divs consecutivos:
  // 1. <div style="font-size: 12px; color: #666; ...">DD de Mês • Categoria</div>
  // 2. <div style="font-size: 14px; font-weight: bold; ...">Descrição</div>
  const reEvento = /<div[^>]*font-size:\s*12px[^>]*color:\s*#666[^>]*>\s*([^<]+)\s*<\/div>\s*<div[^>]*font-size:\s*14px[^>]*font-weight:\s*bold[^>]*>\s*([\s\S]*?)\s*<\/div>/gi

  while ((m = reEvento.exec(html)) !== null) {
    const metaTexto = m[1].trim()
    const descricaoRaw = m[2]
    const posEvento = m.index

    // Determinar o ano: pegar o cabeçalho de mês mais recente antes desta posição
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

    // Usar [^\s•\n]+ para capturar nomes de meses com caracteres acentuados (ç, ã, etc.)
    const reData = /(\d{1,2})\s+de\s+([^\s•\n]+)/i
    const mData = parteData.match(reData)
    if (!mData) continue

    const dia = parseInt(mData[1])
    const nomeMes = mData[2].toLowerCase()
    const mesNum = MESES[nomeMes]
    if (!mesNum) continue

    const dataEvento = `${anoEvento}-${mesNum}-${String(dia).padStart(2, '0')}`
    const categoria = mapearCategoria(parteCategoria)

    // Limpar descrição: remover tags HTML e normalizar espaços
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

    eventos.push({ data_evento: dataEvento, dia, mes: parseInt(mesNum), ano: anoEvento, categoria, descricao })
  }

  return eventos
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ erro: 'Não autenticado' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ erro: 'Token inválido' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { data: perfil } = await supabase
      .from('perfis')
      .select('role')
      .eq('id', user.id)
      .single()

    if (perfil?.role !== 'admin') {
      return new Response(JSON.stringify({ erro: 'Acesso restrito a administradores' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    let urlFonte = URL_PADRAO
    try {
      const body = await req.json()
      if (body?.url) urlFonte = body.url
    } catch { /* body vazio — ok */ }

    const { data: syncRecord } = await supabase
      .from('sincronizacoes')
      .insert({ user_id: user.id, status: 'em_andamento', mensagem: 'Buscando dados...' })
      .select('id')
      .single()

    const resp = await fetch(urlFonte, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Eleitoral2026/2.0)' },
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ao buscar ${urlFonte}`)

    const html = await resp.text()
    const eventos = parsearHTML(html)

    if (eventos.length === 0) {
      await supabase.from('sincronizacoes').update({
        status: 'erro',
        mensagem: 'Nenhum evento extraído — verificar estrutura da página',
        total_eventos: 0,
      }).eq('id', syncRecord?.id)

      return new Response(JSON.stringify({ sucesso: false, erro: 'Nenhum evento encontrado', total: 0 }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Upsert com conflict em data_evento + descricao
    const { data: upsertData, error: upsertError } = await supabase
      .from('eventos')
      .upsert(eventos, { onConflict: 'data_evento,descricao', ignoreDuplicates: false })
      .select('id')

    if (upsertError) throw upsertError

    const { count: totalBanco } = await supabase
      .from('eventos')
      .select('*', { count: 'exact', head: true })

    const total = eventos.length

    await supabase.from('sincronizacoes').update({
      status: 'sucesso',
      mensagem: `${total} eventos processados`,
      total_eventos: totalBanco ?? total,
    }).eq('id', syncRecord?.id)

    return new Response(
      JSON.stringify({ sucesso: true, total, novos: upsertData?.length ?? total, erro: null }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ sucesso: false, erro: msg, total: 0 }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
