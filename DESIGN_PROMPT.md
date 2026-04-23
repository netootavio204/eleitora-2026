# DESIGN_PROMPT — Eleitoral 2026 Web
> **Prompt para Claude Designer** · Versão 2.0 · React Web Online
> Execute ANTES do desenvolvimento · Aguarde aprovação visual antes de codar

---

## Contexto para o Designer

Você é um **Designer UI/UX sênior** especializado em aplicações web profissionais.
Crie mockups visuais de alta fidelidade para o **Eleitoral 2026** — um painel web para **jornalistas e assessores** acompanharem o calendário eleitoral brasileiro 2026.

**Stack visual:** React + Tailwind CSS rodando no navegador (qualquer OS).
**Autenticação:** Dois perfis — ADM e User — com permissões distintas na UI.
**Diferenciais da v2.0:** Login com perfis, etiquetas coloridas de notas por evento, popup de detalhes rico.

---

## Identidade Visual Obrigatória

### Tema
- **Dark mode exclusivo** — fundo escuro, texto claro
- Estilo: **moderno e minimalista** — ferramenta profissional de newsroom
- Sem decoração, sem gradientes, sem sombras pesadas

### Paleta de Cores Base
| Elemento | Hex |
|----------|-----|
| Background principal | `#0F172A` |
| Background cards/painéis | `#1E293B` |
| Background hover | `#334155` |
| Texto primário | `#F8FAFC` |
| Texto secundário | `#94A3B8` |
| Texto muted | `#64748B` |
| Bordas sutis | `#334155` |
| Accent / destaque | `#3B82F6` |
| Urgente / alerta | `#EF4444` |

### Cores por Categoria de Evento
| Categoria | Hex dot | bg badge | text badge |
|-----------|---------|----------|------------|
| Justiça Eleitoral | `#3B82F6` | `#1e3a5f` | `#93c5fd` |
| Candidatos e Partidos | `#8B5CF6` | `#2e1065` | `#c4b5fd` |
| Eleitores e Mesários | `#22C55E` | `#14532d` | `#86efac` |
| Poder Público | `#F97316` | `#431407` | `#fdba74` |
| Comunicação | `#06B6D4` | `#164e63` | `#67e8f9` |
| Outros | `#94A3B8` | `#1e293b` | `#cbd5e1` |

### Cores das Etiquetas de Notas
```
Azul #3B82F6 · Roxo #8B5CF6 · Verde #22C55E · Amarelo #EAB308
Laranja #F97316 · Rosa #EC4899 · Ciano #06B6D4 · Cinza #94A3B8
```

### Tipografia
- Fonte: Inter (Google Fonts)
- 18px/500 título · 14px/500 subtítulo · 13px/400 corpo · 12px/400 muted · 11px/500 badge

---

## Telas a Criar (uma por vez, na ordem)

---

### TELA 1 — Login

**Layout:** Centralizado na tela, fundo `#0F172A`

**Elementos:**
- Topo: ícone simples (quadrado com símbolo de calendário ou urna) + "Eleitoral 2026" em texto branco 22px
- Subtítulo muted: "Calendário Eleitoral Brasileiro 2026"
- Card `#1E293B` centralizado, largura ~380px, padding generoso, rounded-xl, borda sutil
- Dentro do card:
  - Label "Email" + input email
  - Label "Senha" + input password (com ícone de olho)
  - Botão "Entrar" — azul sólido, largura total
  - Texto de erro (vermelho, embaixo do botão — mostrar exemplo: "Credenciais inválidas")
- Rodapé muted abaixo do card: "Acesso restrito · Eleitoral 2026"

---

### TELA 2 — Dashboard (visão ADM)

**Layout:** Janela de navegador · Sidebar (220px) + Área principal

**Sidebar esquerda `#0F172A`:**
- Topo: logo "E26" em quadrado azul + "Eleitoral 2026" em texto
- Navegação:
  - "Dashboard" (ativo — borda esquerda azul, texto branco)
  - "Configurações" (ícone + texto slate-400)
- Base: avatar com iniciais "JO" + "João Oliveira" + badge "ADM" (azul pequeno) + ícone sair

**Topbar `#1E293B` com borda inferior:**
- Título: "Dashboard"
- Chips de filtro: "Hoje" | "Esta semana" (ativo, azul outline) | "Este mês" | "Todos"
- Direita: botão "Atualizar dados ↻" (outline azul) + "Atualizado às 09:42 · 157 eventos" (muted)
- Avatar "JO" com dropdown

**Área principal — duas colunas:**

*Coluna esquerda — AgendaPanel (30%):*

Seção **HOJE** — 22 de abril:
- Cabeçalho: "HOJE" label pequeno + data "22 de abril"
- Fundo levemente diferente (`#1E293B`), borda esquerda azul 2px
- Item 1: badge verde "Eleitores" + "Prazo final para alistamento biométrico"
  + etiqueta colorida (pill azul "Pauta prioritária") + pill roxo "Ver nota"
- Item 2: badge roxo "Candidatos" + "Confirmação de domicílio eleitoral"

Seção **PRÓXIMAS 72H**:
- Badge vermelho pulsante "URGENTE" + "24 abr"
- Item: badge azul "Justiça" + "Prazo para registro de estatutos" + chip "em 2 dias" (vermelho)

Seção **PRÓXIMOS EVENTOS**:
- Lista de 4 eventos mais simples, com "em X dias" em slate-500
- 06/mai · Verde · "Alistamento biométrico" · em 14 dias
- 01/jun · Laranja · "Liberação do Fundo Eleitoral" · em 40 dias
- 20/jul · Roxo · "Convenções partidárias" · em 89 dias
- 16/ago · Azul · "Início da propaganda eleitoral" · em 116 dias

*Coluna direita — CalendarGrid (70%):*
- Cabeçalho: ← Outubro 2026 →
- Grid 7 colunas (Dom Seg Ter Qua Qui Sex Sáb)
- Dia 4: fundo azul-600 sólido "04" — marcação "1º TURNO" abaixo (texto minúsculo azul)
- Dia 25: fundo roxo-escuro "25" — marcação "2º TURNO"
- Dias com eventos: pontos coloridos embaixo do número (1-3 pontinhos por categoria)
- Dia com nota: ícone 📌 minúsculo em cima do número (slate-500)
- Hoje (22): borda azul (não estamos em outubro, mas mostrar o conceito)

---

### TELA 3 — EventModal (Popup de Detalhes)

**Exibição:** Sobre o Dashboard com overlay `rgba(0,0,0,0.6)`

**Card do modal:** `#1E293B` · rounded-xl · borda `#334155` · largura ~560px · sem sombra

**Conteúdo:**
- Header (linha):
  - Data: "Domingo, 04 de outubro de 2026"
  - Chip "em 165 dias" (fundo blue-900, texto blue-300, rounded-full, 11px)
  - Botão X (canto direito, slate-400, hover branco)
- Badge grande: "Justiça Eleitoral" (bg blue-900, text blue-300, rounded-full, 12px/500)
- Título/Descrição: "DIA DAS ELEIÇÕES – 1º TURNO" em branco 18px/500
- Linha separadora `#334155`
- Seção **"Minhas Notas"**:
  - Label "MINHAS NOTAS" em 11px/500 slate-500 uppercase
  - Nota 1: bolinha azul + "Pauta prioritária" + "por João (ADM)" em slate-500 11px + link clicável "Ver guia do TSE →" + ícones editar/lixo (visíveis pois é o próprio autor)
  - Nota 2: bolinha amarela + "Verificar resultado" + "por Maria Santos" em slate-500 + SEM botões editar/lixo (nota de outro usuário — apenas leitura)
  - Botão "+ Adicionar nota" (outline slate, 12px, rounded-lg, largura total)
- Linha separadora
- Rodapé: dois botões lado a lado:
  - "📋 Copiar para pauta" (outline azul)
  - "📅 Copiar data" (outline slate)
- Texto muted 11px: "Fonte: Senado Federal · Calendário Eleitoral 2026"

---

### TELA 4 — NoteForm (Formulário de Nova Nota)

**Exibição:** Inline dentro do EventModal (substitui o botão "+ Adicionar nota")
OU como card separado dentro do modal

**Elementos:**
- Label "Nova nota" em 13px/500
- Input título: placeholder "Ex: Acompanhar resultado ao vivo" (máx 60 chars)
  + contador de chars "0/60" em slate-500 (canto direito)
- Seletor de cor: 8 bolinhas coloridas em linha
  (a bolinha selecionada tem borda branca 2px + scale 1.2)
  Cores: Azul · Roxo · Verde · Amarelo · Laranja · Rosa · Ciano · Cinza
- Textarea: "Observações (opcional)" — 3 linhas, resize none
- Input URL: "Link (opcional)" — placeholder "https://..."
- Input título do link: aparece somente se URL preenchida — "Texto do link"
- Botões: "Salvar" (azul sólido) e "Cancelar" (outline slate) — lado a lado

---

### TELA 5 — Settings (visão ADM)

**Layout:** Sidebar + Topbar (mesmo do Dashboard) + Área central max-width 720px

**Topbar:** Título "Configurações"

**Cards de seção (separados por espaço, não por borda):**

Card **"Sincronização de Dados"**:
- Label + input da URL do Senado (editável)
- Botão "↻ Sincronizar agora" (azul, largura parcial)
- Tabela das últimas 5 sincronizações:
  | Data | Status | Eventos |
  |------|--------|---------|
  | 22/04 09:42 | ✅ Sucesso | 157 |
  | 20/04 14:30 | ✅ Sucesso | 157 |
  | 18/04 08:15 | ❌ Erro | — |

Card **"Usuários"**:
- Tabela:
  | Nome | Email | Perfil | Status | Ações |
  |------|-------|--------|--------|-------|
  | João Oliveira | joao@... | ADM (badge azul) | Ativo | — |
  | Maria Santos | maria@... | User (badge cinza) | Ativo | [Desativar] [→ ADM] |
- Botão "+ Criar usuário" (outline azul, canto direito do card)

Card **"Sistema"** (visual mais leve, sem borda):
- "157 eventos · 12 notas · Versão 2.0.0"
- Link azul "Abrir Supabase Dashboard ↗"

---

## Dados Reais para Usar nos Mockups

**Outubro 2026 (para o calendário):**
- 01/out · Comunicação · Prazo propaganda eleitoral rádio e TV
- 01/out · Candidatos · Prazo para comícios
- **04/out · GERAL · DIA DAS ELEIÇÕES – 1º TURNO**
- 05/out · Candidatos · Início da prestação de contas do 1º turno
- 09/out · Comunicação · Início propaganda eleitoral gratuita para 2º turno
- 20/out · Eleitores · Nova proibição de prisão de eleitores
- **25/out · GERAL · DIA DAS ELEIÇÕES – 2º TURNO**

---

## Instruções de Execução

1. Crie as telas **em HTML interativo** (widget inline no chat)
2. Use apenas HTML + CSS inline — sem bibliotecas externas
3. Cores e fontes **exatas** conforme definido acima — sem improvisos
4. Popule com dados fictícios **realistas** (datas reais do calendário)
5. Crie **uma tela por vez**, aguardando confirmação antes da próxima
6. Após cada tela: pergunte "Deseja ajustes antes de avançar para a próxima tela?"

**Ordem:** Login → Dashboard (ADM) → EventModal → NoteForm → Settings

---

## Critérios de Aprovação

- [ ] Dark mode correto em todas as telas
- [ ] Paleta fiel — apenas cores definidas acima
- [ ] Login simples, limpo e profissional
- [ ] Calendário com pontos coloridos e destaques de turno
- [ ] AgendaPanel com seções Hoje / 72h / Próximos claramente separadas
- [ ] EventModal com seção de notas coloridas visível
- [ ] NoteForm com seletor de cor de 8 bolinhas
- [ ] Settings com tabela de usuários e histórico de sync
- [ ] Badges de categoria coloridos e legíveis em todas as telas
- [ ] Interface parece app profissional, não protótipo grosseiro

---

## Como Usar Este Arquivo

1. Abra uma **conversa nova** no Claude.ai
2. Cole o conteúdo deste arquivo inteiro como primeira mensagem
3. O Claude cria a Tela 1 (Login) primeiro
4. Avalie, peça ajustes, aprove
5. Prossiga tela por tela até a Tela 5
6. Design aprovado → leve para o Claude Code com o PROMPT 01

---

*Eleitoral 2026 Web · Design Phase v2.0 · Antes do desenvolvimento · Abril 2026*