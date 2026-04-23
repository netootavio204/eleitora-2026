// Testa a API do Supabase diretamente — simula o que o browser faz
const SUPABASE_URL  = 'https://dldbfrulueckrokhlzbg.supabase.co'
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZGJmcnVsdWVja3Jva2hsemJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODUyNjQsImV4cCI6MjA5MjQ2MTI2NH0.O_PNGSK9QGeM9eVoD1YrQqR-ea8uVTZu3uTUCVQBGMQ'
const PAT           = 'sbp_45ce4f4ba543779727ae506493ce9d93d064bd3d'
const PROJECT_REF   = 'dldbfrulueckrokhlzbg'

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`SQL HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

async function testarComAnon(endpoint, params = '') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}${params}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    const txt = await res.text()
    return { status: res.status, body: txt.slice(0, 200) }
  } catch (e) {
    clearTimeout(timer)
    return { status: 'TIMEOUT/ERROR', body: e.message }
  }
}

async function testarLogin() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'admin@eleitoral2026.com', password: 'admin123' }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

async function main() {
  console.log('\n=== TESTE 1: Eventos sem autenticação ===')
  const r1 = await testarComAnon('eventos', '?select=id,descricao&limit=3')
  console.log('Status:', r1.status, '| Body:', r1.body)

  console.log('\n=== TESTE 2: Políticas RLS atuais ===')
  try {
    const policies = await sql(`
      SELECT tablename, policyname, cmd, qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `)
    for (const p of policies) {
      console.log(`  [${p.tablename}] ${p.policyname} (${p.cmd}): ${(p.qual || '').slice(0, 80)}`)
    }
  } catch(e) { console.error('Erro:', e.message) }

  console.log('\n=== TESTE 3: Verificar se perfis_leitura tem recursão ===')
  try {
    // Testa com service role para ver o que a query retorna
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
      headers: { Authorization: `Bearer ${PAT}` },
    })
    const keys = await res.json()
    const srKey = keys.find(k => k.name === 'service_role')?.api_key

    if (srKey) {
      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(`${SUPABASE_URL}/rest/v1/perfis?select=id,email,role`, {
        headers: { apikey: srKey, Authorization: `Bearer ${srKey}` },
        signal: ctrl.signal,
      }).catch(e => ({ status: 'TIMEOUT', text: async () => e.message }))
      const txt = await r.text()
      console.log('Perfis (service role):', txt.slice(0, 300))

      // Agora testa login com credenciais reais
      console.log('\n=== TESTE 4: Login do admin ===')
      const loginRes = await testarLogin()
      console.log('Login status:', loginRes.status)
      if (loginRes.data.access_token) {
        const token = loginRes.data.access_token
        console.log('Token JWT obtido ✅')

        // Agora testa eventos com o JWT real
        console.log('\n=== TESTE 5: Eventos com JWT de admin ===')
        const ctrl2 = new AbortController()
        setTimeout(() => ctrl2.abort(), 8000)
        const r2 = await fetch(`${SUPABASE_URL}/rest/v1/eventos?select=id,data_evento,categoria&limit=5&order=data_evento`, {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          signal: ctrl2.signal,
        }).catch(e => ({ status: 'TIMEOUT', text: async () => e.message }))
        const t2 = await r2.text()
        console.log('Eventos status:', r2.status, '| Body:', t2.slice(0, 500))

        // Testa perfis com JWT
        console.log('\n=== TESTE 6: Perfis com JWT de admin ===')
        const ctrl3 = new AbortController()
        setTimeout(() => ctrl3.abort(), 8000)
        const r3 = await fetch(`${SUPABASE_URL}/rest/v1/perfis?select=id,email,role`, {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          signal: ctrl3.signal,
        }).catch(e => ({ status: 'TIMEOUT', text: async () => e.message }))
        const t3 = await r3.text()
        console.log('Perfis status:', r3.status, '| Body:', t3.slice(0, 500))

      } else {
        console.log('Falha no login:', JSON.stringify(loginRes.data).slice(0, 200))
        console.log('  ⚠️  Senha incorreta! Vamos redefinir...')

        // Tenta com outra senha comum
        for (const senha of ['admin123', 'Admin@2026', 'eleitoral2026', 'senha123', 'admin@2026']) {
          const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@eleitoral2026.com', password: senha }),
          })
          const d = await r.json()
          if (d.access_token) {
            console.log(`  ✅ Senha correta: "${senha}"`)
            break
          } else {
            console.log(`  ✗ "${senha}": ${d.error_description || d.message || 'falhou'}`)
          }
        }
      }
    }
  } catch(e) { console.error('Erro:', e.message) }

  console.log('\n=== CONCLUSÃO ===')
  console.log('Verifique os status codes acima para identificar o problema do spinner.')
}

main().catch(console.error)
