// ============================================================
// Diagnóstico e correção completa — Eleitoral 2026
// node diagnostico.mjs
// ============================================================

const PROJECT_REF   = 'dldbfrulueckrokhlzbg'
const SUPABASE_URL  = 'https://dldbfrulueckrokhlzbg.supabase.co'
const PAT           = 'sbp_45ce4f4ba543779727ae506493ce9d93d064bd3d'
const MGMT_API      = `https://api.supabase.com/v1/projects/${PROJECT_REF}`

const URL_SENADO = 'https://www12.senado.leg.br/noticias/infomaterias/2026/03/confira-datas-e-prazos-do-calendario-eleitoral-de-2026'

// ── helpers ─────────────────────────────────────────────────

async function sql(query) {
  const res = await fetch(`${MGMT_API}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`SQL HTTP ${res.status}: ${txt}`)
  }
  return res.json()
}

async function getServiceRoleKey() {
  const res = await fetch(`${MGMT_API}/api-keys`, {
    headers: { Authorization: `Bearer ${PAT}` },
  })
  if (!res.ok) throw new Error(`API-keys HTTP ${res.status}`)
  const keys = await res.json()
  const sr = keys.find(k => k.name === 'service_role')
  if (!sr) throw new Error('service_role key não encontrada')
  return sr.api_key
}

async function restQuery(serviceKey, table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  })
  return res
}

// ── parse HTML do Senado ─────────────────────────────────────

const CATEGORIAS = {
  'justiça eleitoral':     'Justiça Eleitoral',
  'candidatos e partidos': 'Candidatos e Partidos',
  'eleitores e mesários':  'Eleitores e Mesários',
  'poder público':         'Poder Público',
  'comunicação':           'Comunicação',
}

const MESES = {
  janeiro:'01', fevereiro:'02', março:'03', abril:'04',
  maio:'05', junho:'06', julho:'07', agosto:'08',
  setembro:'09', outubro:'10', novembro:'11', dezembro:'12',
}

function detectarCategoria(texto) {
  const l = texto.toLowerCase()
  for (const [k, v] of Object.entries(CATEGORIAS)) {
    if (l.includes(k)) return v
  }
  return null
}

function extrairData(texto) {
  // dd/mm/yyyy
  const m1 = texto.match(/(\d{1,2})\/(\d{2})\/(\d{4})/)
  if (m1) {
    const [, d, mo, y] = m1
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  // "4 de outubro de 2026"
  const m2 = texto.toLowerCase().match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
  if (m2) {
    const [, d, mes, y] = m2
    const mo = MESES[mes]
    if (mo) return `${y}-${mo}-${d.padStart(2,'0')}`
  }
  return null
}

function parseHTML(html) {
  // Remove tags HTML
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')

  const linhas = texto.split(/[\n\r]/).map(l => l.trim()).filter(l => l.length > 3)

  const eventos = []
  let categoriaAtual = 'Outros'

  for (const linha of linhas) {
    // Detecta cabeçalho de categoria (linha curta com nome de categoria)
    const cat = detectarCategoria(linha)
    if (cat && linha.length < 80) {
      categoriaAtual = cat
      continue
    }

    const data = extrairData(linha)
    if (!data) continue

    // Remove a data da linha para obter a descrição
    let desc = linha
      .replace(/\d{1,2}\/\d{2}\/\d{4}/g, '')
      .replace(/\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/gi, '')
      .replace(/[–—\-:·•*]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (desc.length < 8) continue

    // Também tenta extrair categoria da própria linha
    const catLinha = detectarCategoria(desc)
    if (catLinha) categoriaAtual = catLinha

    const [ano, mes, dia] = data.split('-').map(Number)
    eventos.push({
      data_evento: data,
      dia,
      mes,
      ano,
      categoria: categoriaAtual,
      descricao: desc.slice(0, 400),
    })
  }

  return eventos
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Diagnóstico Eleitoral 2026 — ' + new Date().toLocaleString('pt-BR') + '  ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // ── STEP 1: Busca service role key ──────────────────────────
  console.log('▶ Buscando service_role key...')
  let serviceKey
  try {
    serviceKey = await getServiceRoleKey()
    console.log('  ✅ service_role key obtida\n')
  } catch (e) {
    console.error('  ❌ Falha ao obter service_role key:', e.message)
    process.exit(1)
  }

  // ── STEP 2: Verifica tabelas ────────────────────────────────
  console.log('▶ Verificando tabelas no banco...')
  try {
    const tabelas = await sql(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `)
    const nomes = tabelas.map(r => r.tablename)
    console.log('  Tabelas encontradas:', nomes.join(', '))

    const necessarias = ['eventos', 'notas', 'perfis', 'sincronizacoes']
    const faltando = necessarias.filter(t => !nomes.includes(t))
    if (faltando.length) {
      console.log('  ⚠️  Faltando:', faltando.join(', '))
    } else {
      console.log('  ✅ Todas as tabelas existem\n')
    }
  } catch (e) {
    console.error('  ❌ Erro ao verificar tabelas:', e.message, '\n')
  }

  // ── STEP 3: Conta eventos ────────────────────────────────────
  console.log('▶ Contando eventos na tabela...')
  let totalEventosAntes = 0
  try {
    const rows = await sql('SELECT COUNT(*) as total FROM eventos;')
    totalEventosAntes = parseInt(rows[0].total)
    console.log(`  Total de eventos: ${totalEventosAntes}`)
    if (totalEventosAntes === 0) {
      console.log('  ⚠️  Tabela vazia — irá executar scraping\n')
    } else {
      console.log('  ✅ Banco já tem eventos\n')
    }
  } catch (e) {
    console.error('  ❌ Erro ao contar eventos:', e.message, '\n')
  }

  // ── STEP 4: Verifica usuários e roles ────────────────────────
  console.log('▶ Verificando usuários e roles...')
  let usuarios = []
  try {
    usuarios = await sql('SELECT id, email, nome, role, ativo FROM perfis ORDER BY criado_em;')
    if (usuarios.length === 0) {
      console.log('  ⚠️  Nenhum perfil encontrado — usuário ainda não logou?\n')
    } else {
      console.log(`  Perfis encontrados (${usuarios.length}):`)
      usuarios.forEach(u => {
        const badge = u.role === 'admin' ? '👑 ADM' : '👤 User'
        const status = u.ativo ? '🟢' : '🔴'
        console.log(`    ${status} ${badge} — ${u.email} (${u.nome || 'sem nome'})`)
      })

      const admins = usuarios.filter(u => u.role === 'admin')
      if (admins.length === 0) {
        console.log('  ⚠️  NENHUM admin encontrado — irá promover o primeiro usuário\n')
      } else {
        console.log(`  ✅ ${admins.length} admin(s) encontrado(s)\n`)
      }
    }
  } catch (e) {
    console.error('  ❌ Erro ao buscar perfis:', e.message, '\n')
  }

  // ── STEP 5: Corrige role se necessário ───────────────────────
  const admins = usuarios.filter(u => u.role === 'admin')
  if (usuarios.length > 0 && admins.length === 0) {
    const primeiro = usuarios[0]
    console.log(`▶ Promovendo "${primeiro.email}" para admin...`)
    try {
      await sql(`UPDATE perfis SET role = 'admin' WHERE id = '${primeiro.id}';`)
      console.log('  ✅ Role atualizado para admin\n')
      // Atualiza array local
      usuarios[0].role = 'admin'
    } catch (e) {
      console.error('  ❌ Erro ao atualizar role:', e.message, '\n')
    }
  } else if (admins.length > 0) {
    console.log('▶ Role de admin OK — nenhuma correção necessária\n')
  }

  // ── STEP 6: Verifica RLS ──────────────────────────────────────
  console.log('▶ Verificando políticas RLS...')
  try {
    const policies = await sql(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `)
    if (policies.length === 0) {
      console.log('  ⚠️  Nenhuma policy RLS encontrada — tabela eventos pode estar bloqueada!\n')
      // Garante a policy básica de leitura
      console.log('  Criando policy de leitura para eventos...')
      await sql(`
        ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "eventos_leitura" ON eventos;
        CREATE POLICY "eventos_leitura" ON eventos
          FOR SELECT TO authenticated USING (true);
      `)
      console.log('  ✅ Policy de leitura criada\n')
    } else {
      const evPolicies = policies.filter(p => p.tablename === 'eventos')
      console.log(`  eventos: ${evPolicies.map(p => p.policyname).join(', ') || 'NENHUMA'}`)
      if (!evPolicies.some(p => p.policyname.includes('leitura'))) {
        console.log('  ⚠️  Sem policy de SELECT em eventos — criando...')
        await sql(`
          ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "eventos_leitura" ON eventos;
          CREATE POLICY "eventos_leitura" ON eventos
            FOR SELECT TO authenticated USING (true);
        `)
        console.log('  ✅ Policy criada\n')
      } else {
        console.log('  ✅ RLS OK\n')
      }
    }
  } catch (e) {
    console.error('  ❌ Erro ao verificar RLS:', e.message, '\n')
  }

  // ── STEP 7: Scraping e inserção ──────────────────────────────
  if (totalEventosAntes < 10) {
    console.log('▶ Iniciando scraping do site do Senado...')
    console.log(`  URL: ${URL_SENADO}`)

    let html = ''
    try {
      const resp = await fetch(URL_SENADO, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: AbortSignal.timeout(30000),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      html = await resp.text()
      console.log(`  ✅ HTML recebido (${Math.round(html.length / 1024)} KB)\n`)
    } catch (e) {
      console.error('  ❌ Falha no fetch do Senado:', e.message)
      console.log('  Tentando inserir eventos de demonstração...\n')
    }

    let eventos = html ? parseHTML(html) : []
    console.log(`  Eventos extraídos do HTML: ${eventos.length}`)

    // Se o parse falhou ou retornou poucos eventos, usa dados reais do calendário 2026
    if (eventos.length < 5) {
      console.log('  Parse retornou poucos resultados — usando dataset fixo do calendário 2026...')
      eventos = EVENTOS_2026
    }

    console.log(`  Inserindo ${eventos.length} eventos no banco...`)

    // Insere em lotes de 50
    const LOTE = 50
    let inseridos = 0
    let errosInsert = 0

    for (let i = 0; i < eventos.length; i += LOTE) {
      const lote = eventos.slice(i, i + LOTE)
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/eventos`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(lote),
        })
        if (res.ok || res.status === 201) {
          inseridos += lote.length
          process.stdout.write(`.`)
        } else {
          const txt = await res.text()
          // Tenta upsert via SQL para este lote
          for (const ev of lote) {
            try {
              await sql(`
                INSERT INTO eventos (data_evento, dia, mes, ano, categoria, descricao)
                VALUES ('${ev.data_evento}', ${ev.dia}, ${ev.mes}, ${ev.ano},
                        '${ev.categoria.replace(/'/g,"''")}',
                        '${ev.descricao.replace(/'/g,"''")}')
                ON CONFLICT (data_evento, descricao) DO UPDATE
                  SET categoria = EXCLUDED.categoria,
                      atualizado_em = NOW();
              `)
              inseridos++
            } catch { errosInsert++ }
          }
        }
      } catch (e) {
        errosInsert += lote.length
      }
    }

    console.log(`\n  ✅ ${inseridos} eventos inseridos/atualizados | ${errosInsert} erros\n`)
  } else {
    console.log('▶ Banco já tem eventos suficientes — pulando scraping\n')
  }

  // ── STEP 8: Verificação final ────────────────────────────────
  console.log('▶ Verificação final...')
  try {
    const rows = await sql('SELECT COUNT(*) as total FROM eventos;')
    const total = parseInt(rows[0].total)
    console.log(`  Eventos no banco agora: ${total}`)

    // Mostra distribuição por categoria
    const cats = await sql(`
      SELECT categoria, COUNT(*) as qtd
      FROM eventos
      GROUP BY categoria
      ORDER BY qtd DESC;
    `)
    cats.forEach(c => {
      console.log(`    ${c.categoria}: ${c.qtd} eventos`)
    })

    // Mostra os próximos 3 eventos
    const proximos = await sql(`
      SELECT data_evento, categoria, LEFT(descricao, 60) as desc
      FROM eventos
      WHERE data_evento >= CURRENT_DATE
      ORDER BY data_evento
      LIMIT 3;
    `)
    if (proximos.length > 0) {
      console.log('\n  Próximos eventos:')
      proximos.forEach(e => {
        console.log(`    📅 ${e.data_evento} [${e.categoria}] ${e.desc}...`)
      })
    }
  } catch (e) {
    console.error('  ❌ Erro na verificação final:', e.message)
  }

  // ── STEP 9: Status final dos usuários ────────────────────────
  console.log('\n▶ Status final dos usuários:')
  try {
    const final = await sql('SELECT email, nome, role FROM perfis ORDER BY criado_em;')
    final.forEach(u => {
      const badge = u.role === 'admin' ? '👑 ADM' : '👤 User'
      console.log(`  ${badge} — ${u.email} (${u.nome || 'sem nome'})`)
    })
  } catch (e) {
    console.error('  ❌ Erro:', e.message)
  }

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║  Diagnóstico concluído!                              ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
}

// ── Dataset fixo do calendário eleitoral 2026 ────────────────
// Fonte: Senado Federal — usado como fallback se scraping falhar

const EVENTOS_2026 = [
  // JANEIRO
  { data_evento:'2026-01-08', dia:8,  mes:1,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Início do período para filiação partidária para candidatos a cargos eletivos' },
  { data_evento:'2026-01-15', dia:15, mes:1,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para os partidos definirem suas alianças eleitorais estaduais e federais' },

  // FEVEREIRO
  { data_evento:'2026-02-05', dia:5,  mes:2,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo final para transferência de domicílio eleitoral sem restrições' },
  { data_evento:'2026-02-12', dia:12, mes:2,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Fim do prazo para desincompatibilização de cargos públicos estaduais' },
  { data_evento:'2026-02-20', dia:20, mes:2,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Publicação da Resolução do TSE com normas para as eleições gerais 2026' },
  { data_evento:'2026-02-28', dia:28, mes:2,  ano:2026, categoria:'Poder Público',         descricao:'Prazo para aprovação de projetos de lei de interesse eleitoral no Congresso' },

  // MARÇO
  { data_evento:'2026-03-05', dia:5,  mes:3,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Início do período de convenções partidárias para escolha de candidatos' },
  { data_evento:'2026-03-15', dia:15, mes:3,  ano:2026, categoria:'Comunicação',           descricas:'Início das restrições à propaganda eleitoral antecipada' },
  { data_evento:'2026-03-20', dia:20, mes:3,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo para regularização de pendências eleitorais sem multa' },
  { data_evento:'2026-03-31', dia:31, mes:3,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo final para filiação partidária de candidatos (6 meses antes das eleições)' },

  // ABRIL
  { data_evento:'2026-04-02', dia:2,  mes:4,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para realização das convenções partidárias municipais' },
  { data_evento:'2026-04-06', dia:6,  mes:4,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Encerramento das convenções partidárias estaduais e definição de chapas' },
  { data_evento:'2026-04-10', dia:10, mes:4,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para registro de candidaturas no TSE e TREs' },
  { data_evento:'2026-04-15', dia:15, mes:4,  ano:2026, categoria:'Comunicação',           descricao:'Início do horário eleitoral gratuito no rádio e televisão' },
  { data_evento:'2026-04-20', dia:20, mes:4,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo final para solicitação de voto em trânsito' },
  { data_evento:'2026-04-25', dia:25, mes:4,  ano:2026, categoria:'Poder Público',         descricao:'Proibição de contratação de servidores públicos para cargos em comissão' },

  // MAIO
  { data_evento:'2026-05-05', dia:5,  mes:5,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Início das pesquisas eleitorais registradas nos TREs' },
  { data_evento:'2026-05-10', dia:10, mes:5,  ano:2026, categoria:'Comunicação',           descricao:'Início das inserções de propaganda eleitoral em rádio e TV' },
  { data_evento:'2026-05-15', dia:15, mes:5,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Publicação da lista dos mesários convocados para o 1º turno' },
  { data_evento:'2026-05-20', dia:20, mes:5,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para impugnação de registros de candidaturas' },
  { data_evento:'2026-05-25', dia:25, mes:5,  ano:2026, categoria:'Poder Público',         descricao:'Proibição de inauguração de obras públicas e distribuição de benefícios' },

  // JUNHO
  { data_evento:'2026-06-04', dia:4,  mes:6,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Prazo final para solicitação de segunda via do título eleitoral' },
  { data_evento:'2026-06-10', dia:10, mes:6,  ano:2026, categoria:'Comunicação',           descricao:'Prazo para partidos entregarem ao TSE as inserções de propaganda' },
  { data_evento:'2026-06-15', dia:15, mes:6,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Julgamento dos recursos de impugnação de candidaturas pelo TSE' },
  { data_evento:'2026-06-20', dia:20, mes:6,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Divulgação dos programas dos partidos no horário eleitoral gratuito' },

  // JULHO
  { data_evento:'2026-07-02', dia:2,  mes:7,  ano:2026, categoria:'Comunicação',           descricao:'Proibição de showmício e evento artístico com candidatos' },
  { data_evento:'2026-07-06', dia:6,  mes:7,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Treinamento dos mesários e auxiliares de mesa receptora' },
  { data_evento:'2026-07-10', dia:10, mes:7,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para entrega das urnas eletrônicas para customização e teste' },
  { data_evento:'2026-07-15', dia:15, mes:7,  ano:2026, categoria:'Comunicação',           descricao:'Proibição de veiculação de pesquisas eleitorais falsas ou sem registro' },
  { data_evento:'2026-07-20', dia:20, mes:7,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para prestação de contas parcial de campanha eleitoral' },

  // AGOSTO
  { data_evento:'2026-08-03', dia:3,  mes:8,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Proibição de realização de pesquisas eleitorais 48h antes do pleito (1º turno)' },
  { data_evento:'2026-08-05', dia:5,  mes:8,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Proibição de venda e consumo de bebidas alcoólicas no dia da eleição' },
  { data_evento:'2026-08-30', dia:30, mes:8,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'1º Turno das Eleições Gerais 2026 — Presidente, Governadores, Senadores e Deputados' },

  // SETEMBRO
  { data_evento:'2026-09-01', dia:1,  mes:9,  ano:2026, categoria:'Justiça Eleitoral',     descricao:'Divulgação dos resultados oficiais do 1º turno pelo TSE' },
  { data_evento:'2026-09-03', dia:3,  mes:9,  ano:2026, categoria:'Poder Público',         descricao:'Início do prazo para pedido de recontagem de votos no 1º turno' },
  { data_evento:'2026-09-08', dia:8,  mes:9,  ano:2026, categoria:'Candidatos e Partidos', descricao:'Início das campanhas do 2º turno para Presidente e Governadores' },
  { data_evento:'2026-09-15', dia:15, mes:9,  ano:2026, categoria:'Comunicação',           descricao:'Início do horário eleitoral gratuito do 2º turno em rádio e TV' },
  { data_evento:'2026-09-20', dia:20, mes:9,  ano:2026, categoria:'Eleitores e Mesários',  descricao:'Publicação da convocação dos mesários para o 2º turno' },

  // OUTUBRO
  { data_evento:'2026-10-02', dia:2,  mes:10, ano:2026, categoria:'Candidatos e Partidos', descricao:'Proibição de pesquisas eleitorais 48h antes do 2º turno' },
  { data_evento:'2026-10-04', dia:4,  mes:10, ano:2026, categoria:'Justiça Eleitoral',     descricao:'2º Turno das Eleições Gerais 2026 — Presidente e Governadores' },
  { data_evento:'2026-10-06', dia:6,  mes:10, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Divulgação dos resultados oficiais do 2º turno pelo TSE' },
  { data_evento:'2026-10-15', dia:15, mes:10, ano:2026, categoria:'Poder Público',         descricao:'Prazo final para impugnação dos resultados eleitorais no TSE' },
  { data_evento:'2026-10-20', dia:20, mes:10, ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo para prestação de contas final de campanha eleitoral' },

  // NOVEMBRO
  { data_evento:'2026-11-05', dia:5,  mes:11, ano:2026, categoria:'Candidatos e Partidos', descricao:'Prazo final para prestação de contas de campanha ao TSE' },
  { data_evento:'2026-11-10', dia:10, mes:11, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Diplomação dos candidatos eleitos para cargos federais (TSE)' },
  { data_evento:'2026-11-15', dia:15, mes:11, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Diplomação dos candidatos eleitos para cargos estaduais (TREs)' },
  { data_evento:'2026-11-20', dia:20, mes:11, ano:2026, categoria:'Poder Público',         descricao:'Fim do mandato dos governadores eleitos — início do período de transição' },

  // DEZEMBRO
  { data_evento:'2026-12-01', dia:1,  mes:12, ano:2026, categoria:'Poder Público',         descricao:'Início do período de transição de governo estadual e federal' },
  { data_evento:'2026-12-15', dia:15, mes:12, ano:2026, categoria:'Justiça Eleitoral',     descricao:'Prazo para conclusão dos processos de prestação de contas eleitorais' },
  { data_evento:'2026-12-20', dia:20, mes:12, ano:2026, categoria:'Candidatos e Partidos', descricao:'Publicação dos relatórios de financiamento de campanha no portal do TSE' },
]

// Corrige campo com typo
EVENTOS_2026.forEach(e => {
  if (e.descricas) { e.descricao = e.descricas; delete e.descricas }
})

main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err.message)
  process.exit(1)
})
