// ============================================================
// Eleitoral 2026 — Setup automático do banco via API Supabase
// Executa: node setup_banco.js
//
// ANTES DE RODAR:
// 1. Acesse: https://supabase.com/dashboard/account/tokens
// 2. Clique em "Generate new token"
// 3. Dê um nome (ex: "setup") e copie o token gerado
// 4. Cole o token abaixo substituindo SEU_TOKEN_AQUI
// ============================================================

import fetch from 'node-fetch';

// ── Credenciais ─────────────────────────────────────────────
const PROJECT_REF = 'dldbfrulueckrokhlzbg';
const ACCESS_TOKEN = 'sbp_45ce4f4ba543779727ae506493ce9d93d064bd3d'; // ← cole aqui o Personal Access Token
// ────────────────────────────────────────────────────────────

const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const SQL_STEPS = [
  {
    nome: '1. Tabela eventos',
    sql: `
      CREATE TABLE IF NOT EXISTS eventos (
        id            BIGSERIAL PRIMARY KEY,
        data_evento   DATE NOT NULL,
        dia           INTEGER NOT NULL,
        mes           INTEGER NOT NULL,
        ano           INTEGER NOT NULL,
        categoria     TEXT NOT NULL,
        descricao     TEXT NOT NULL,
        origem        TEXT DEFAULT 'senado',
        criado_em     TIMESTAMPTZ DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(data_evento, descricao)
      );
    `,
  },
  {
    nome: '2. Tabela perfis',
    sql: `
      CREATE TABLE IF NOT EXISTS perfis (
        id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email     TEXT NOT NULL,
        nome      TEXT,
        role      TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        ativo     BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    nome: '3. Tabela notas',
    sql: `
      CREATE TABLE IF NOT EXISTS notas (
        id            BIGSERIAL PRIMARY KEY,
        evento_id     BIGINT REFERENCES eventos(id) ON DELETE CASCADE,
        user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        titulo        TEXT NOT NULL,
        conteudo      TEXT,
        cor           TEXT NOT NULL DEFAULT '#3B82F6',
        link_url      TEXT,
        link_titulo   TEXT,
        criado_em     TIMESTAMPTZ DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    nome: '4. Tabela sincronizacoes',
    sql: `
      CREATE TABLE IF NOT EXISTS sincronizacoes (
        id            BIGSERIAL PRIMARY KEY,
        user_id       UUID REFERENCES auth.users(id),
        status        TEXT NOT NULL CHECK (status IN ('sucesso', 'erro', 'em_andamento')),
        mensagem      TEXT,
        total_eventos INTEGER,
        executado_em  TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    nome: '5. Índices de performance',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_eventos_data    ON eventos(data_evento);
      CREATE INDEX IF NOT EXISTS idx_eventos_mes_ano ON eventos(mes, ano);
      CREATE INDEX IF NOT EXISTS idx_notas_evento    ON notas(evento_id);
      CREATE INDEX IF NOT EXISTS idx_notas_user      ON notas(user_id);
    `,
  },
  {
    nome: '6. Função e trigger de criação automática de perfil',
    sql: `
      CREATE OR REPLACE FUNCTION criar_perfil_usuario()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO perfis (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION criar_perfil_usuario();
    `,
  },
  {
    nome: '7. Ativar RLS em todas as tabelas',
    sql: `
      ALTER TABLE eventos        ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notas          ENABLE ROW LEVEL SECURITY;
      ALTER TABLE perfis         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE sincronizacoes ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    nome: '8. Policies RLS — eventos',
    sql: `
      DROP POLICY IF EXISTS "eventos_leitura"       ON eventos;
      DROP POLICY IF EXISTS "eventos_escrita_admin" ON eventos;

      CREATE POLICY "eventos_leitura" ON eventos
        FOR SELECT TO authenticated USING (true);

      CREATE POLICY "eventos_escrita_admin" ON eventos
        FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin'
        ));
    `,
  },
  {
    nome: '9. Policies RLS — notas',
    sql: `
      DROP POLICY IF EXISTS "notas_leitura_todos"    ON notas;
      DROP POLICY IF EXISTS "notas_criacao"          ON notas;
      DROP POLICY IF EXISTS "notas_edicao_proprio"   ON notas;
      DROP POLICY IF EXISTS "notas_exclusao_proprio" ON notas;

      CREATE POLICY "notas_leitura_todos" ON notas
        FOR SELECT TO authenticated USING (true);

      CREATE POLICY "notas_criacao" ON notas
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());

      CREATE POLICY "notas_edicao_proprio" ON notas
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid());

      CREATE POLICY "notas_exclusao_proprio" ON notas
        FOR DELETE TO authenticated
        USING (user_id = auth.uid());
    `,
  },
  {
    nome: '10. Policies RLS — perfis',
    sql: `
      DROP POLICY IF EXISTS "perfis_leitura"       ON perfis;
      DROP POLICY IF EXISTS "perfis_admin_update"  ON perfis;

      CREATE POLICY "perfis_leitura" ON perfis
        FOR SELECT TO authenticated
        USING (
          id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        );

      CREATE POLICY "perfis_admin_update" ON perfis
        FOR UPDATE TO authenticated
        USING (EXISTS (
          SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin'
        ));
    `,
  },
  {
    nome: '11. Policies RLS — sincronizacoes',
    sql: `
      DROP POLICY IF EXISTS "sync_admin" ON sincronizacoes;

      CREATE POLICY "sync_admin" ON sincronizacoes
        FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin'
        ));
    `,
  },
];

async function executarSQL(nome, sql) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`HTTP ${res.status}: ${corpo}`);
  }

  return res.json();
}

async function main() {
  if (ACCESS_TOKEN === 'SEU_TOKEN_AQUI') {
    console.error('\n❌ ERRO: Substitua SEU_TOKEN_AQUI pelo seu Personal Access Token.');
    console.error('   Gere em: https://supabase.com/dashboard/account/tokens\n');
    process.exit(1);
  }

  console.log('\n🚀 Iniciando setup do banco de dados Eleitoral 2026...\n');

  let erros = 0;

  for (const step of SQL_STEPS) {
    process.stdout.write(`  ${step.nome}... `);
    try {
      await executarSQL(step.nome, step.sql);
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`     Erro: ${err.message}\n`);
      erros++;
    }
  }

  console.log('\n' + '─'.repeat(50));

  if (erros === 0) {
    console.log('✅ Setup concluído com sucesso! Todas as tabelas, índices, trigger e RLS criados.');
    console.log('\nPróximo passo: crie o usuário ADM no Supabase:');
    console.log('  Authentication → Users → Add user → email + senha');
    console.log('\nDepois execute no SQL Editor do Supabase:');
    console.log("  UPDATE perfis SET role = 'admin' WHERE email = 'SEU_EMAIL_AQUI';");
  } else {
    console.log(`⚠️  Setup concluído com ${erros} erro(s). Revise as mensagens acima.`);
  }

  console.log('');
}

main();
