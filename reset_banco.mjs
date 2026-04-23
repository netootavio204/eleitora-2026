import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dldbfrulueckrokhlzbg.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZGJmcnVsdWVja3Jva2hsemJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg4NTI2NCwiZXhwIjoyMDkyNDYxMjY0fQ.qRF_E4rhjH01-gPXCF5-hBlOSDt80Li9gqGTd6PE6cE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runSQL(query) {
  // Tenta via pg REST endpoint do Supabase
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SQL falhou (${res.status}): ${text}`)
  }
  return res.json().catch(() => null)
}

async function main() {
  console.log('=== RESET DO BANCO ===\n')

  // Step A: Drop + recreate policies via exec_sql RPC
  console.log('[1/4] Recriando policies RLS...')

  const policySQL = `
    -- DROP ALL existing policies
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT policyname, tablename FROM pg_policies
               WHERE tablename IN ('notas','eventos','perfis','sincronizacoes')
               AND schemaname = 'public'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
      END LOOP;
    END $$;

    -- Garantir RLS ativo
    ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
    ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sincronizacoes ENABLE ROW LEVEL SECURITY;

    -- EVENTOS
    CREATE POLICY "eventos_select" ON eventos FOR SELECT TO authenticated USING (true);
    CREATE POLICY "eventos_insert" ON eventos FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
    );
    CREATE POLICY "eventos_update" ON eventos FOR UPDATE TO authenticated USING (
      EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
    );
    CREATE POLICY "eventos_delete" ON eventos FOR DELETE TO authenticated USING (
      EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
    );

    -- NOTAS
    CREATE POLICY "notas_select" ON notas FOR SELECT TO authenticated USING (true);
    CREATE POLICY "notas_insert" ON notas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    CREATE POLICY "notas_update" ON notas FOR UPDATE TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "notas_delete" ON notas FOR DELETE TO authenticated USING (user_id = auth.uid());

    -- PERFIS
    CREATE POLICY "perfis_select" ON perfis FOR SELECT TO authenticated USING (true);

    -- SINCRONIZACOES
    CREATE POLICY "sincronizacoes_select" ON sincronizacoes FOR SELECT TO authenticated USING (true);
    CREATE POLICY "sincronizacoes_insert" ON sincronizacoes FOR INSERT TO authenticated WITH CHECK (true);
  `

  try {
    await runSQL(policySQL)
    console.log('  Policies recriadas com sucesso!')
  } catch (err) {
    console.log('  exec_sql RPC não disponível:', err.message.slice(0, 120))
    console.log('  Tentando via Management API...')

    const mgRes = await fetch(`https://api.supabase.com/v1/projects/dldbfrulueckrokhlzbg/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: policySQL })
    })
    if (!mgRes.ok) {
      console.log('  Management API também não acessível.')
      console.log('  AÇÃO MANUAL: acesse https://supabase.com/dashboard/project/dldbfrulueckrokhlzbg/database/policies')
      console.log('  e recrie as policies conforme descrito.')
    } else {
      console.log('  Policies recriadas via Management API!')
    }
  }

  // Step B: Check evento count
  console.log('\n[2/4] Verificando contagem de eventos...')
  const { count, error: countErr } = await supabase
    .from('eventos')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('  Erro ao contar eventos:', countErr.message)
  } else {
    console.log(`  Total de eventos no banco: ${count}`)
    if (count < 50) {
      console.log('  AVISO: Menos de 50 eventos — banco precisa de scraping!')
      console.log('  Execute via: supabase functions invoke scraper --project-ref dldbfrulueckrokhlzbg')
    } else {
      console.log('  OK: banco tem dados suficientes.')
    }
  }

  // Step C: Promote user to admin
  console.log('\n[3/4] Promovendo usuário para admin...')
  const { data: perfisData, error: perfisErr } = await supabase
    .from('perfis')
    .select('id, email, role')
    .limit(5)

  if (perfisErr) {
    console.error('  Erro ao buscar perfis:', perfisErr.message)
  } else if (!perfisData?.length) {
    console.log('  Nenhum perfil encontrado. Faça login primeiro para criar o perfil.')
  } else {
    console.log('  Perfis encontrados:', perfisData.map(p => `${p.email} (${p.role})`).join(', '))

    const { error: updateErr } = await supabase
      .from('perfis')
      .update({ role: 'admin' })
      .eq('id', perfisData[0].id)

    if (updateErr) {
      console.error('  Erro ao promover para admin:', updateErr.message)
    } else {
      console.log(`  OK: ${perfisData[0].email} promovido para admin!`)
    }
  }

  // Step D: Final verification
  console.log('\n[4/4] Verificação final...')
  const { data: adminCheck } = await supabase
    .from('perfis')
    .select('email, role')
    .eq('role', 'admin')

  if (adminCheck?.length) {
    console.log('  Admins:', adminCheck.map(p => p.email).join(', '))
  } else {
    console.log('  Nenhum admin encontrado ainda.')
  }

  const { count: finalCount } = await supabase
    .from('eventos')
    .select('*', { count: 'exact', head: true })

  console.log(`  Eventos no banco: ${finalCount ?? 'erro'}`)
  console.log('\n=== RESET CONCLUÍDO ===')
}

main().catch(console.error)
