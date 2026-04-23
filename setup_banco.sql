-- ============================================================
-- Eleitoral 2026 — Setup do Banco de Dados Supabase
-- Versão 2.0 · Abril 2026
-- Execute este arquivo completo no SQL Editor do Supabase
-- ============================================================


-- ------------------------------------------------------------
-- 1. TABELAS
-- ------------------------------------------------------------

CREATE TABLE eventos (
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

CREATE TABLE perfis (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  nome      TEXT,
  role      TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ativo     BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notas (
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

CREATE TABLE sincronizacoes (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),
  status        TEXT NOT NULL CHECK (status IN ('sucesso', 'erro', 'em_andamento')),
  mensagem      TEXT,
  total_eventos INTEGER,
  executado_em  TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 2. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------

CREATE INDEX idx_eventos_data    ON eventos(data_evento);
CREATE INDEX idx_eventos_mes_ano ON eventos(mes, ano);
CREATE INDEX idx_notas_evento    ON notas(evento_id);
CREATE INDEX idx_notas_user      ON notas(user_id);


-- ------------------------------------------------------------
-- 3. FUNÇÃO E TRIGGER — criação automática de perfil
-- Cria um registro em perfis com role 'user' sempre que
-- um novo usuário é adicionado no Supabase Auth
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION criar_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION criar_perfil_usuario();


-- ------------------------------------------------------------
-- 4. ATIVAR ROW LEVEL SECURITY EM TODAS AS TABELAS
-- ------------------------------------------------------------

ALTER TABLE eventos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sincronizacoes ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 5. POLICIES RLS
-- ------------------------------------------------------------

-- EVENTOS: qualquer usuário autenticado lê
CREATE POLICY "eventos_leitura" ON eventos
  FOR SELECT TO authenticated
  USING (true);

-- EVENTOS: somente ADM insere, atualiza e exclui
CREATE POLICY "eventos_escrita_admin" ON eventos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- NOTAS: todos os autenticados leem todas as notas (colaborativo)
CREATE POLICY "notas_leitura_todos" ON notas
  FOR SELECT TO authenticated
  USING (true);

-- NOTAS: usuário só insere notas com seu próprio user_id
CREATE POLICY "notas_criacao" ON notas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NOTAS: usuário só atualiza as suas próprias notas
CREATE POLICY "notas_edicao_proprio" ON notas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- NOTAS: usuário só exclui as suas próprias notas
CREATE POLICY "notas_exclusao_proprio" ON notas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- PERFIS: usuário vê o próprio perfil; ADM vê todos
CREATE POLICY "perfis_leitura" ON perfis
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM perfis p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- PERFIS: somente ADM pode alterar roles e dados de outros perfis
CREATE POLICY "perfis_admin_update" ON perfis
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- SINCRONIZAÇÕES: somente ADM lê e escreve
CREATE POLICY "sync_admin" ON sincronizacoes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
