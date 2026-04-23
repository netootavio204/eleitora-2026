# PRD — Calendário Eleitoral 2026
> **Product Requirements Document** · Versão 2.0 · Abril 2026
> ⚠️ Migração: Electron Desktop → React Web Online
> Classificação: **PRIORIDADE MÁXIMA** — documento raiz do projeto

---

## 1. Visão Geral do Produto

**Nome:** Eleitoral 2026
**Tipo:** Aplicação Web (React SPA)
**Stack:** React + Vite + Tailwind CSS + Supabase (Auth + Database + Edge Functions)
**Deploy:** Vercel (deploy automático via GitHub)
**Público-alvo:** Jornalistas e assessores de imprensa / comunicação política
**Usuários:** 2 a 5 pessoas com dois perfis: ADM e User
**Supabase:** Conta e projeto já criados

**Objetivo:** Painel web profissional para jornalistas e assessores acompanharem o calendário eleitoral 2026, com autenticação segura, dois níveis de acesso (ADM e User), etiquetas coloridas com notas e links privados por evento, e dados atualizados do Senado Federal.

**O que mudou da v1.0 (Electron):**
- ❌ Electron Desktop → ✅ React Web (navegador)
- ❌ SQLite local → ✅ Supabase Postgres (nuvem)
- ❌ Scraping no processo main → ✅ Supabase Edge Function
- ❌ Sem autenticação → ✅ Supabase Auth (email + senha)
- ❌ Sem perfis → ✅ ADM e User com permissões distintas
- ❌ Sem notas → ✅ Etiquetas coloridas com notas e links por evento
- ❌ Build Windows → ✅ Deploy Vercel (qualquer navegador/OS)

---

## 2. Fonte de Dados

**URL fonte:**
`https://www12.senado.leg.br/noticias/infomaterias/2026/03/confira-datas-e-prazos-do-calendario-eleitoral-de-2026`

**Estratégia de extração:**
- Supabase Edge Function (`scraper`) — serverless em Deno/TypeScript
- Disparada manualmente pelo ADM via botão na interface
- Faz fetch da URL, parseia HTML, grava no banco via upsert
- Sem CORS pois roda server-side

**Categorias dos eventos:**
- `Justiça Eleitoral` · `Candidatos e Partidos` · `Eleitores e Mesários`
- `Poder Público` · `Comunicação` · `Outros`

---

## 3. Arquitetura do Sistema

```
Eleitoral2026-Web/
├── src/
│   ├── main.jsx
│   ├── App.jsx                     # Roteamento + AuthProvider
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Settings.jsx            # Somente ADM
│   │   └── NotFound.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   └── ProtectedRoute.jsx  # Guard por perfil
│   │   ├── calendar/
│   │   │   ├── CalendarGrid.jsx
│   │   │   ├── CalendarDay.jsx
│   │   │   └── CalendarNav.jsx
│   │   ├── agenda/
│   │   │   ├── AgendaPanel.jsx
│   │   │   ├── AgendaItem.jsx
│   │   │   └── AgendaSection.jsx
│   │   ├── events/
│   │   │   ├── EventModal.jsx      # Popup principal
│   │   │   ├── EventBadge.jsx
│   │   │   └── EventDots.jsx
│   │   ├── notes/
│   │   │   ├── NoteTag.jsx         # Etiqueta colorida
│   │   │   ├── NoteForm.jsx        # Criar/editar nota
│   │   │   ├── NoteList.jsx
│   │   │   └── NoteModal.jsx
│   │   └── ui/
│   │       ├── Button.jsx · Badge.jsx · Modal.jsx
│   │       ├── Input.jsx · Toggle.jsx · Spinner.jsx
│   │       ├── Toast.jsx · StatusIndicator.jsx
│   ├── hooks/
│   │   ├── useAuth.js · useEvents.js
│   │   ├── useNotes.js · useSync.js · useCalendar.js
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── ToastContext.jsx
│   ├── lib/
│   │   ├── supabase.js             # Cliente Supabase
│   │   ├── dateUtils.js            # date-fns pt-BR
│   │   └── constants.js            # Cores, categorias
│   └── styles/globals.css
├── supabase/functions/scraper/
│   └── index.ts                    # Edge Function
├── .env.local                      # Não commitado
├── .env.example                    # Template commitado
├── vercel.json
├── package.json · vite.config.js · tailwind.config.js
```

---

## 4. Banco de Dados — Schema Supabase

### Tabela `eventos`
```sql
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
CREATE INDEX idx_eventos_data ON eventos(data_evento);
CREATE INDEX idx_eventos_mes_ano ON eventos(mes, ano);
```

### Tabela `notas`
```sql
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
CREATE INDEX idx_notas_evento ON notas(evento_id);
CREATE INDEX idx_notas_user ON notas(user_id);
```

### Tabela `perfis`
```sql
CREATE TABLE perfis (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  nome      TEXT,
  role      TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ativo     BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: cria perfil automaticamente ao registrar usuário
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
```

### Tabela `sincronizacoes`
```sql
CREATE TABLE sincronizacoes (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),
  status        TEXT NOT NULL CHECK (status IN ('sucesso', 'erro', 'em_andamento')),
  mensagem      TEXT,
  total_eventos INTEGER,
  executado_em  TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
```sql
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sincronizacoes ENABLE ROW LEVEL SECURITY;

-- Eventos: leitura para todos autenticados
CREATE POLICY "eventos_leitura" ON eventos
  FOR SELECT TO authenticated USING (true);

-- Eventos: escrita somente ADM
CREATE POLICY "eventos_escrita_admin" ON eventos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin'
  ));

-- Notas: COLABORATIVAS — todos autenticados leem todas as notas
CREATE POLICY "notas_leitura_todos" ON notas
  FOR SELECT TO authenticated USING (true);

-- Notas: cada usuário só cria notas com seu próprio user_id
CREATE POLICY "notas_criacao" ON notas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Notas: cada usuário só edita e exclui as suas próprias
CREATE POLICY "notas_edicao_proprio" ON notas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notas_exclusao_proprio" ON notas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Perfis: usuário vê o próprio; ADM vê todos
CREATE POLICY "perfis_leitura" ON perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Perfis: somente ADM altera roles
CREATE POLICY "perfis_admin_update" ON perfis
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin'
  ));

-- Sincronizações: somente ADM
CREATE POLICY "sync_admin" ON sincronizacoes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

## 5. Autenticação e Perfis

**Método:** Supabase Auth — email + senha

**Fluxo de login:**
1. Acessa URL → redireciona para `/login` se não autenticado
2. Email + senha → Supabase Auth valida
3. Busca `perfil` na tabela `perfis` para obter o `role`
4. Redireciona para `/dashboard`
5. Token JWT gerenciado automaticamente pelo Supabase client

**Criação de usuários:** Somente ADM via tela de Configurações. Sem cadastro público.

### Tabela de Permissões

| Funcionalidade | ADM | User |
|---------------|:---:|:----:|
| Ver calendário e eventos | ✅ | ✅ |
| Abrir popup de evento | ✅ | ✅ |
| Criar notas próprias | ✅ | ✅ |
| Ver notas próprias | ✅ | ✅ |
| Ver notas de outros usuários | ✅ | ✅ |
| Atualizar dados (scraping) | ✅ | ❌ |
| Acessar Configurações | ✅ | ❌ |
| Criar/desativar usuários | ✅ | ❌ |
| Ver histórico de sync | ✅ | ❌ |

---

## 6. Telas e Funcionalidades

### 6.1 Login (`/login`)
- Logo + nome centralizado
- Campo email + campo senha
- Botão "Entrar" com spinner durante autenticação
- Erro inline se credenciais inválidas
- Sem link de cadastro (app fechado)

### 6.2 Dashboard (`/dashboard`)

**Layout:** Sidebar fixa + Topbar + Área principal (Agenda 30% | Calendário 70%)

**AgendaPanel — 3 seções:**
- **HOJE:** eventos do dia atual, badges de categoria, etiquetas de notas clicáveis
- **PRÓXIMAS 72H:** badge vermelho pulsante, chip "em X dias"
- **PRÓXIMOS EVENTOS:** próximos 8 eventos com "em X dias" em muted
- Clique em qualquer evento → abre `EventModal`

**CalendarGrid:**
- Grade mensal 7 colunas (Dom–Sáb)
- Navegação ← Mês Ano →
- Pontos coloridos por categoria nos dias com eventos
- Dia atual: fundo azul
- Dias com notas do usuário: marcador 📌 discreto
- Clique no dia → abre `EventModal` com todos os eventos do dia

### 6.3 EventModal — Popup de Detalhes ⭐

Abre ao clicar em evento (agenda) ou dia (calendário).

**Conteúdo:**
- Data por extenso + chip "em X dias" + botão X (ou Escape)
- Badge de categoria colorido
- Descrição completa do evento
- Separador visual
- **Seção "Minhas Notas":**
  - Lista de etiquetas coloridas do usuário (título + link se houver)
  - Botões editar / excluir em cada nota
  - Botão "+ Adicionar nota" → abre NoteForm inline
- Separador visual
- Botões: "Copiar para pauta" | "Copiar data"
- Rodapé muted: "Fonte: Senado Federal · Calendário Eleitoral 2026"

### 6.4 Sistema de Notas (Etiquetas Coloridas)

Notas são **colaborativas** — todos os usuários autenticados veem todas as notas de todos. Cada usuário só pode editar ou excluir as suas próprias notas. O nome do autor aparece em cada nota.

**Propriedades:**
- `titulo` — texto curto obrigatório (máx 60 chars)
- `conteudo` — texto longo opcional
- `cor` — uma das 8 cores pré-definidas
- `link_url` — URL opcional
- `link_titulo` — texto exibido do link

**Cores disponíveis:**
```
Azul #3B82F6 · Roxo #8B5CF6 · Verde #22C55E · Amarelo #EAB308
Laranja #F97316 · Rosa #EC4899 · Ciano #06B6D4 · Cinza #94A3B8
```

**Onde aparecem:**
- `EventModal` — lista completa com editar/excluir
- `AgendaPanel` — pills coloridos compactos sob o evento
- `CalendarGrid` — ícone 📌 discreto no dia

**NoteForm — campos:**
- Título (obrigatório)
- Seletor de cor (8 bolinhas clicáveis)
- Conteúdo (textarea)
- URL + Título do link
- Botões: Salvar / Cancelar

### 6.5 Topbar
- Título da seção atual
- Filtros rápidos (Dashboard): "Hoje" | "Esta semana" | "Este mês" | "Todos"
- Avatar com iniciais + dropdown (nome, role, "Sair")
- Botão "Atualizar dados" + status (somente ADM)

### 6.6 Sidebar
- Logo/nome no topo
- Navegação: Dashboard · Configurações (só ADM)
- Base: nome + role + botão sair

### 6.7 Configurações (`/settings`) — Somente ADM

**Seção "Sincronização":**
- URL da fonte (editável)
- Botão "Sincronizar agora" com log em tempo real
- Histórico das últimas 10 sincronizações

**Seção "Usuários":**
- Lista: nome, email, role, status ativo/inativo
- Botão "Criar usuário" → modal (nome, email, senha, role)
- Botão "Desativar" por usuário
- Botão "Alterar role"

**Seção "Sistema":**
- Total eventos, total notas, versão do app
- Link para o Supabase Dashboard

---

## 7. Design System

**Tema:** Dark mode exclusivo · Minimalista · Nível editorial

### Paleta Base
| Elemento | Hex |
|----------|-----|
| Background principal | `#0F172A` |
| Background cards | `#1E293B` |
| Background hover | `#334155` |
| Texto primário | `#F8FAFC` |
| Texto secundário | `#94A3B8` |
| Texto muted | `#64748B` |
| Bordas | `#334155` |
| Accent | `#3B82F6` |
| Urgente | `#EF4444` |

### Componentes
- Bordas: `0.5px solid #334155` · `rounded-lg` padrão · `rounded-full` em pills
- Botão primário: `bg-blue-600 hover:bg-blue-500 text-white`
- Botão outline: `border border-slate-600 hover:bg-slate-700 text-slate-300`
- Botão destrutivo: `border border-red-800 hover:bg-red-900 text-red-400`
- Modal overlay: `bg-black/60`
- Input: `bg-slate-900 border-slate-700 focus:border-blue-500`

---

## 8. Edge Function — Scraper

**Arquivo:** `supabase/functions/scraper/index.ts`

1. Recebe POST autenticado
2. Verifica role `admin` na tabela `perfis`
3. Fetch da URL do Senado
4. Parse HTML → extrai data, categoria, descrição
5. Upsert em lote na tabela `eventos`
6. Registra em `sincronizacoes`
7. Retorna `{ sucesso, total, novos, atualizados, erro }`

---

## 9. Roteamento e Guards

```
/          → redireciona para /dashboard ou /login
/login     → público
/dashboard → ProtectedRoute (qualquer autenticado)
/settings  → ProtectedRoute + AdminRoute (role = 'admin')
/*         → NotFound 404
```

---

## 10. Variáveis de Ambiente

### `.env.local`
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### Vercel (configurar no painel)
```
VITE_SUPABASE_URL → valor real
VITE_SUPABASE_ANON_KEY → valor real
```

---

## 11. Prioridades de Desenvolvimento

### 🔴 PRIORIDADE 1 — Core

1. Setup projeto (Vite + React + Tailwind + React Router + Supabase client)
2. `lib/supabase.js` + `lib/constants.js` + `lib/dateUtils.js`
3. `AuthContext.jsx` + `useAuth.js`
4. `pages/Login.jsx`
5. `ProtectedRoute.jsx` + `AdminRoute` + `App.jsx` com roteamento completo
6. Schema SQL completo no Supabase (tabelas + RLS + trigger)
7. `pages/Dashboard.jsx` — estrutura de layout
8. `CalendarGrid.jsx` — grade mensal com eventos reais
9. `AgendaPanel.jsx` — seções Hoje / 72h / Próximos
10. `EventModal.jsx` — popup de detalhes completo

### 🟡 PRIORIDADE 2 — Importante

11. Sistema de notas completo (NoteForm, NoteTag, NoteList, useNotes)
12. `pages/Settings.jsx` — tela ADM completa
13. Edge Function `scraper` no Supabase
14. Botão de sincronização no Topbar (somente ADM)
15. Gerenciamento de usuários na Settings

### 🟢 PRIORIDADE 3 — Melhorias

16. Cron automático de scraping
17. Exportar para `.ics`
18. Busca por texto nos eventos
19. PWA (instalar como app no celular)
20. Notificações push
21. Modo claro alternável

---

## 12. Dependências

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "@supabase/supabase-js": "^2.43.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 13. Regras Absolutas

1. **Nunca** expor `service_role_key` no frontend — apenas `anon_key`
2. **Sempre** usar RLS — nunca desabilitar em produção
3. **Toda** validação de permissão acontece no banco (RLS), não só no frontend
4. **Nunca** confiar apenas em guards de rota — o banco é a fonte de verdade
5. **Sempre** usar `supabase.auth.getSession()` para verificar autenticação
6. Código em **JavaScript puro** no frontend — TypeScript apenas na Edge Function
7. Tailwind CSS como **única** fonte de estilos
8. **Sempre** tratar erros com feedback visual (Toast)
9. Notas são **colaborativas** — todos leem todas, mas cada usuário só edita/exclui as suas (RLS garante no banco)
10. `/settings` verificado **no banco via RLS**, não apenas pelo guard de rota

---

*Eleitoral 2026 Web · Versão 2.0 · React + Supabase + Vercel · Abril 2026*