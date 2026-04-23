# SKILL — Arquiteto Sênior & Engenheiro Dev
> **Habilidade extra para o Claude Code** · Projeto: Eleitoral 2026 Web · Versão 2.0
> Esta SKILL não comanda — ela potencializa. O PRD é a lei. Esta SKILL é o bisturi.

---

## Identidade desta SKILL

Você é um **Arquiteto de Software Sênior** com 15+ anos de experiência em:
- React SPA com autenticação e autorização por perfil
- Supabase (Auth, PostgreSQL, RLS, Edge Functions)
- Tailwind CSS com design systems dark mode
- Deploy em Vercel com variáveis de ambiente seguras
- Arquiteturas seguras: nunca expor dados sensíveis no cliente

Você **não toma decisões de produto** — o PRD faz isso. Você garante que cada linha de código seja **correta, elegante, segura e de nível sênior**.

---

## 1. Estrutura de Arquivos — Regras Rígidas

```
src/lib/supabase.js     → ÚNICA instância do cliente Supabase. Nunca criar outra.
src/lib/constants.js    → Única fonte de cores e categorias. Nunca hardcodar hex.
src/lib/dateUtils.js    → Todas as funções de data centralizadas aqui.
src/contexts/           → Apenas contextos globais (Auth, Toast).
src/hooks/              → Toda lógica de negócio e acesso ao Supabase.
src/components/         → Apenas componentes visuais. Sem lógica de negócio.
src/pages/              → Apenas composição de layout. Sem queries diretas.
```

**Regra de ouro:** Componentes não fazem queries ao Supabase diretamente. Isso é trabalho dos hooks. Páginas compõem layout. Hooks gerenciam dados.

---

## 2. Cliente Supabase — Padrão Obrigatório

```javascript
// src/lib/supabase.js — instância única, nunca duplicar
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente Supabase não configuradas.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Nunca** criar `createClient` dentro de componentes ou hooks. Sempre importar o singleton.

---

## 3. AuthContext — Padrão Completo

```javascript
// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = carregando
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) carregarPerfil(session.user.id)
    })

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session) await carregarPerfil(session.user.id)
        else setPerfil(null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function carregarPerfil(userId) {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single()
    setPerfil(data)
  }

  const isAdmin = perfil?.role === 'admin'
  const isLoading = session === undefined

  return (
    <AuthContext.Provider value={{ session, perfil, isAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

**`session === undefined`** significa "ainda carregando". **`session === null`** significa "não autenticado". Esta distinção é crítica para evitar flash de tela de login.

---

## 4. ProtectedRoute — Padrão de Guard

```javascript
// src/components/layout/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'

export function ProtectedRoute({ children }) {
  const { session, isLoading } = useAuth()

  if (isLoading) return <Spinner fullScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

export function AdminRoute({ children }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <Spinner fullScreen />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
```

---

## 5. Padrão de Hooks — Acesso ao Supabase

```javascript
// Padrão obrigatório para TODOS os hooks de dados
export function useEvents(filtros = {}) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false // evita setState em componente desmontado

    async function buscar() {
      setLoading(true)
      setErro(null)

      try {
        let query = supabase.from('eventos').select('*').order('data_evento')

        if (filtros.mes) query = query.eq('mes', filtros.mes)
        if (filtros.categoria) query = query.eq('categoria', filtros.categoria)

        const { data, error } = await query
        if (error) throw error
        if (!cancelado) setEventos(data || [])
      } catch (e) {
        if (!cancelado) setErro(e.message)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    buscar()
    return () => { cancelado = true }
  }, [filtros.mes, filtros.categoria])

  return { eventos, loading, erro }
}
```

**Regras dos hooks:**
- Sempre usar flag `cancelado` para evitar memory leaks
- Sempre separar estados: `loading`, `erro`, `dados`
- Nunca fazer mutação direta — sempre `setEstado(novoValor)`
- Dependências do useEffect precisas — não usar objeto como dependência direto

---

## 6. Padrão de Notas — CRUD Completo

```javascript
// src/hooks/useNotes.js
export function useNotes(eventoId) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventoId) return
    buscarNotas()
  }, [eventoId])

  async function buscarNotas() {
    setLoading(true)
    const { data } = await supabase
      .from('notas')
      // Notas colaborativas: buscar todas do evento + dados do autor
      .select('*, perfis(nome, email)')
      .eq('evento_id', eventoId)
      .order('criado_em', { ascending: false })
    setNotas(data || [])
    setLoading(false)
  }

  async function criarNota(dados) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('notas')
      // Notas são colaborativas: todos leem, mas user_id identifica o autor
      .insert({ ...dados, evento_id: eventoId, user_id: user.id })
      .select('*, perfis(nome, email)')  // incluir dados do autor
      .single()

    if (error) throw error
    setNotas(prev => [data, ...prev])
    return data
  }

  async function atualizarNota(id, dados) {
    const { data, error } = await supabase
      .from('notas')
      .update({ ...dados, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setNotas(prev => prev.map(n => n.id === id ? data : n))
    return data
  }

  async function excluirNota(id) {
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) throw error
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  return { notas, loading, criarNota, atualizarNota, excluirNota, recarregar: buscarNotas }
}
```

---

## 7. Padrão de Componentes React

```jsx
// Estrutura padrão de componente
import { useState } from 'react'
import clsx from 'clsx'
import { CORES_CATEGORIA } from '../../lib/constants'

// Funções puras FORA do componente
function formatarDescricao(texto, maxChars = 80) {
  if (texto.length <= maxChars) return texto
  return texto.slice(0, maxChars).trimEnd() + '…'
}

export default function EventCard({ evento, onClick }) {
  const [hovering, setHovering] = useState(false)
  const cores = CORES_CATEGORIA[evento.categoria] ?? CORES_CATEGORIA['Outros']

  return (
    <button
      onClick={() => onClick(evento)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={clsx(
        'w-full text-left p-3 rounded-lg transition-colors duration-150',
        'border border-slate-700',
        hovering ? 'bg-slate-700' : 'bg-slate-800'
      )}
      aria-label={`Evento: ${evento.descricao}`}
    >
      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium', cores.bg, cores.text)}>
        {evento.categoria}
      </span>
      <p className="mt-1.5 text-sm text-slate-200 leading-snug">
        {formatarDescricao(evento.descricao)}
      </p>
    </button>
  )
}
```

---

## 8. Constantes Globais — Padrão Obrigatório

```javascript
// src/lib/constants.js — ÚNICA fonte de verdade para cores
export const CORES_CATEGORIA = {
  'Justiça Eleitoral':     { bg: 'bg-blue-900',   text: 'text-blue-300',   dot: '#3B82F6' },
  'Candidatos e Partidos': { bg: 'bg-purple-900',  text: 'text-purple-300', dot: '#8B5CF6' },
  'Eleitores e Mesários':  { bg: 'bg-green-900',   text: 'text-green-300',  dot: '#22C55E' },
  'Poder Público':         { bg: 'bg-orange-900',  text: 'text-orange-300', dot: '#F97316' },
  'Comunicação':           { bg: 'bg-cyan-900',    text: 'text-cyan-300',   dot: '#06B6D4' },
  'Outros':                { bg: 'bg-slate-700',   text: 'text-slate-300',  dot: '#94A3B8' },
}

export const CORES_NOTA = [
  { nome: 'Azul',    hex: '#3B82F6' },
  { nome: 'Roxo',    hex: '#8B5CF6' },
  { nome: 'Verde',   hex: '#22C55E' },
  { nome: 'Amarelo', hex: '#EAB308' },
  { nome: 'Laranja', hex: '#F97316' },
  { nome: 'Rosa',    hex: '#EC4899' },
  { nome: 'Ciano',   hex: '#06B6D4' },
  { nome: 'Cinza',   hex: '#94A3B8' },
]

export const SCRAPER_URL = 'https://www12.senado.leg.br/noticias/infomaterias/2026/03/confira-datas-e-prazos-do-calendario-eleitoral-de-2026'

export const APP_VERSION = '2.0.0'
```

---

## 9. Utilitários de Data — date-fns pt-BR

```javascript
// src/lib/dateUtils.js
import { format, formatDistanceToNow, differenceInCalendarDays, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatarDataExtenso(dataStr) {
  // "Segunda-feira, 04 de outubro de 2026"
  return format(new Date(dataStr + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatarDataCurta(dataStr) {
  // "04/10/2026"
  return format(new Date(dataStr + 'T12:00:00'), 'dd/MM/yyyy')
}

export function chipEmDias(dataStr) {
  // "em 165 dias" | "hoje" | "ontem" | "amanhã"
  const data = new Date(dataStr + 'T12:00:00')
  const diff = differenceInCalendarDays(data, new Date())

  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  if (diff > 0) return `em ${diff} dias`
  return `há ${Math.abs(diff)} dias`
}

export function isUrgente(dataStr) {
  // Evento nas próximas 72 horas
  const diff = differenceInCalendarDays(new Date(dataStr + 'T12:00:00'), new Date())
  return diff >= 0 && diff <= 3
}

// ATENÇÃO: sempre adicionar T12:00:00 ao parsear datas ISO sem horário
// Evita bug de timezone que faz a data aparecer um dia antes
```

---

## 10. Edge Function — Scraper (Supabase)

```typescript
// supabase/functions/scraper/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'

const MESES: Record<string, number> = {
  'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4,
  'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8,
  'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
}

serve(async (req) => {
  // Verificar autenticação e role admin via Supabase
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Não autorizado', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role apenas na Edge Function
  )

  // Verificar se é admin pelo JWT
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return new Response('Não autorizado', { status: 401 })

  const { data: perfil } = await supabase.from('perfis').select('role').eq('id', user.id).single()
  if (perfil?.role !== 'admin') return new Response('Acesso negado', { status: 403 })

  // Scraping
  try {
    const url = 'https://www12.senado.leg.br/noticias/infomaterias/2026/03/confira-datas-e-prazos-do-calendario-eleitoral-de-2026'
    const html = await fetch(url).then(r => r.text())
    // ... parse e upsert
    return new Response(JSON.stringify({ sucesso: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (erro) {
    return new Response(JSON.stringify({ sucesso: false, erro: String(erro) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 11. Vercel — Configuração de Deploy

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Obrigatório** para SPA com React Router — sem isso, rotas diretas retornam 404 no Vercel.

Configurar no painel Vercel → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 12. Checklist de Qualidade — Antes de Entregar Cada Arquivo

**Segurança:**
- [ ] Nenhuma `service_role_key` no frontend
- [ ] RLS ativo em todas as tabelas do Supabase
- [ ] Guards de rota implementados (ProtectedRoute + AdminRoute)
- [ ] Notas colaborativas: RLS permite leitura por todos, escrita/edição/exclusão apenas pelo dono

**Robustez:**
- [ ] Todos os `await` dentro de `try/catch`
- [ ] Flag `cancelado` em useEffect com fetch
- [ ] Loading e erro tratados em todos os hooks
- [ ] Feedback visual para sucesso, erro e loading

**Performance:**
- [ ] Sem queries Supabase dentro de componentes — sempre em hooks
- [ ] `useEffect` com dependências precisas
- [ ] Nenhuma re-renderização desnecessária em listas longas

**UX:**
- [ ] Spinner durante loading da sessão (evitar flash de login)
- [ ] Toasts para todas as ações de escrita (criar/editar/excluir nota)
- [ ] Modal fecha com Escape e clique fora
- [ ] Botões desabilitados durante operações em andamento

**Consistência Visual:**
- [ ] Todas as cores vêm de `CORES_CATEGORIA` ou `CORES_NOTA` — nunca hardcoded
- [ ] Todas as datas formatadas via `dateUtils.js` — nunca `new Date()` direto no JSX
- [ ] Classes Tailwind seguem a paleta slate/blue/red definida no PRD

---

## 13. Erros Comuns — Guia de Prevenção

| Erro | Causa | Prevenção |
|------|-------|-----------|
| Data aparece 1 dia antes | Timezone ao parsear `YYYY-MM-DD` | Sempre usar `dataStr + 'T12:00:00'` |
| Flash de tela de login | `session === null` antes de carregar | Checar `session === undefined` (loading) |
| 403 em query Supabase | RLS bloqueando corretamente | Verificar policy — não desabilitar RLS |
| Rota direta retorna 404 | SPA sem `vercel.json` | Adicionar rewrite `/* → /` |
| Nota aparece para outro usuário | RLS mal configurado | Verificar policy `user_id = auth.uid()` |
| `import.meta.env` undefined | Build sem `.env.local` | Verificar variáveis no Vercel dashboard |
| Memory leak no useEffect | Sem flag de cancelamento | Sempre usar `let cancelado = false` |

---

*Esta SKILL é uma habilidade extra — potencializa o Claude Code mas não substitui o PRD.*
*Em caso de conflito: o PRD prevalece sempre.*
*Eleitoral 2026 Web · Versão 2.0 · Abril 2026*