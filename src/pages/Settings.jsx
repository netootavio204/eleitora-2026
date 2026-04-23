import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Sidebar from '../components/layout/Sidebar'
import Modal from '../components/ui/Modal'
import { useSync } from '../hooks/useSync'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { SCRAPER_URL, APP_VERSION, CORES_CATEGORIA } from '../lib/constants'
import { useCategoriasOcultas, TODAS_CATEGORIAS } from '../hooks/useCategoriasOcultas'

// ─── Seção de Sincronização ────────────────────────────────────────────────

function SecaoSync() {
  const { sincronizando, historico, loadingHistorico, stats, dispararSync } = useSync()
  const [url, setUrl] = useState(SCRAPER_URL)
  const [logs, setLogs] = useState([])
  const logsRef = useRef(null)
  const { showToast } = useToast()

  function addLog(msg) {
    const hora = format(new Date(), 'HH:mm:ss')
    setLogs(prev => {
      const next = [...prev, `[${hora}] ${msg}`]
      setTimeout(() => {
        if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
      }, 0)
      return next
    })
  }

  async function handleSync() {
    setLogs([])
    try {
      await dispararSync(url, addLog)
      showToast('Sincronização concluída com sucesso.', 'sucesso')
    } catch (e) {
      showToast(`Erro: ${e.message}`, 'erro')
    }
  }

  function fmtData(str) {
    if (!str) return '—'
    return format(new Date(str), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const badgeStatus = {
    sucesso:      'bg-green-900 text-green-300',
    erro:         'bg-red-900 text-red-300',
    em_andamento: 'bg-yellow-900 text-yellow-300',
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-slate-100 text-base font-semibold mb-1">Sincronização de Dados</h2>
        <p className="text-slate-500 text-xs">Busca os eventos do Senado Federal e salva no banco.</p>
      </div>

      {/* URL da fonte (somente leitura) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-slate-400 text-xs font-medium">URL da fonte</label>
        <div className="flex gap-2">
          <span className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 font-mono text-[12px] truncate select-all cursor-default">
            {url}
          </span>
          <button
            onClick={handleSync}
            disabled={sincronizando}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {sincronizando ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sincronizando...
              </>
            ) : (
              '↻ Sincronizar agora'
            )}
          </button>
        </div>
      </div>

      {/* Log em tempo real */}
      {logs.length > 0 && (
        <div
          ref={logsRef}
          className="bg-slate-900 rounded-lg border border-slate-700 p-3 h-32 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed"
        >
          {logs.map((l, i) => (
            <div key={i} className={l.includes('Erro') ? 'text-red-400' : l.includes('Concluído') ? 'text-green-400' : ''}>
              {l}
            </div>
          ))}
          {sincronizando && (
            <div className="text-slate-500 animate-pulse">█</div>
          )}
        </div>
      )}

      {/* Estatísticas rápidas */}
      <div className="flex gap-3">
        <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-3 text-center">
          <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">Total eventos</p>
          <p className="text-slate-100 text-xl font-bold">{stats.totalEventos}</p>
        </div>
        <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-3 text-center">
          <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">Total notas</p>
          <p className="text-slate-100 text-xl font-bold">{stats.totalNotas}</p>
        </div>
      </div>

      {/* Histórico */}
      <div>
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          Últimas sincronizações
        </h3>
        {loadingHistorico ? (
          <div className="flex justify-center py-4">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historico.length === 0 ? (
          <p className="text-slate-600 text-xs py-2">Nenhuma sincronização registrada.</p>
        ) : (
          <div className="rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Data</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Status</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-medium">Eventos</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((s, i) => (
                  <tr key={s.id} className={`border-b border-slate-700/50 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                    <td className="px-3 py-2 text-slate-400">{fmtData(s.executado_em)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${badgeStatus[s.status] ?? 'bg-slate-700 text-slate-300'}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">{s.total_eventos ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Seção de Visibilidade de Categorias ──────────────────────────────────

function SecaoCategorias() {
  const { ocultas, toggleCategoria } = useCategoriasOcultas()

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="text-slate-100 text-base font-semibold mb-1">Visibilidade de Categorias</h2>
        <p className="text-slate-500 text-xs">
          Categorias desmarcadas ficam ocultas no painel e no calendário para todos os usuários neste dispositivo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {TODAS_CATEGORIAS.map(cat => {
          const cores = CORES_CATEGORIA[cat]
          const visivel = !ocultas.includes(cat)
          return (
            <button
              key={cat}
              onClick={() => toggleCategoria(cat)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors duration-150 text-left ${
                visivel
                  ? 'border-slate-600 bg-slate-800 hover:border-slate-500'
                  : 'border-slate-700/40 bg-slate-800/40 opacity-50 hover:opacity-70'
              }`}
            >
              {/* Bolinha de cor */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cores.dot }}
              />

              {/* Nome */}
              <span className={`flex-1 text-sm font-medium ${visivel ? 'text-slate-200' : 'text-slate-500'}`}>
                {cat}
              </span>

              {/* Toggle visual */}
              <span className={`w-9 h-5 rounded-full flex items-center transition-colors duration-200 flex-shrink-0 ${visivel ? 'bg-blue-600' : 'bg-slate-700'}`}>
                <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${visivel ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
            </button>
          )
        })}
      </div>

      {ocultas.length > 0 && (
        <p className="text-[11px] text-amber-500/80 flex items-center gap-1.5">
          <span>⚠</span>
          {ocultas.length === 1
            ? `1 categoria oculta no dashboard`
            : `${ocultas.length} categorias ocultas no dashboard`}
        </p>
      )}
    </section>
  )
}

// ─── Modal de criar usuário ────────────────────────────────────────────────

function ModalCriarUsuario({ onClose, onCriado }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState('user')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const { showToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || senha.length < 6) {
      setErro('Preencha todos os campos. Senha mínima: 6 caracteres.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      // signUp sem redirecionar — cria o usuário e confirma email automaticamente
      // (Supabase permite isso quando "Confirm email" está desligado no projeto,
      //  ou via Edge Function com service role. Aqui usamos signUp padrão.)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: { data: { nome: nome.trim() } },
      })
      if (error) throw error
      if (!data.user) throw new Error('Usuário não foi criado.')

      // Aguarda o trigger criar o perfil e então atualiza nome e role
      await new Promise(r => setTimeout(r, 800))
      await supabase
        .from('perfis')
        .update({ nome: nome.trim(), role })
        .eq('id', data.user.id)

      showToast(`Usuário ${nome} criado. Peça para ele confirmar o email.`, 'sucesso')
      onCriado?.()
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-slate-100 text-base font-semibold">Criar usuário</h3>
          <p className="text-slate-500 text-xs mt-0.5">Novo acesso ao sistema Eleitoral 2026</p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Nome completo', value: nome, onChange: setNome, placeholder: 'Ex: João Silva', type: 'text' },
            { label: 'Email', value: email, onChange: setEmail, placeholder: 'usuario@redacao.com', type: 'email' },
            { label: 'Senha', value: senha, onChange: setSenha, placeholder: 'Mínimo 6 caracteres', type: 'password' },
          ].map(({ label, value, onChange, placeholder, type }) => (
            <div key={label}>
              <label className="text-slate-400 text-[11px] block mb-1">{label}</label>
              <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="text-slate-400 text-[11px] block mb-1">Perfil de acesso</label>
            <div className="flex gap-2">
              {['user', 'admin'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors capitalize ${
                    role === r
                      ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {r === 'admin' ? 'ADM' : 'User'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erro && <p className="text-red-400 text-xs leading-snug">{erro}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Criando...' : 'Criar usuário'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm hover:border-slate-500 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal de confirmação de exclusão ─────────────────────────────────────

function ModalConfirmarExclusao({ usuario, onConfirmar, onCancelar, excluindo }) {
  return (
    <Modal onClose={onCancelar} maxWidth="max-w-sm">
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-slate-100 text-base font-semibold">Excluir usuário</h3>
          <p className="text-slate-500 text-xs mt-0.5">Esta ação não pode ser desfeita.</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-700 px-4 py-3">
          <p className="text-slate-200 text-sm font-medium">{usuario.nome || '—'}</p>
          <p className="text-slate-500 text-xs">{usuario.email}</p>
        </div>

        <p className="text-slate-400 text-sm">
          Tem certeza que deseja excluir este usuário? O acesso será removido permanentemente.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onConfirmar}
            disabled={excluindo}
            className="flex-1 py-2 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {excluindo ? 'Excluindo...' : 'Sim, excluir'}
          </button>
          <button
            onClick={onCancelar}
            disabled={excluindo}
            className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Seção de Usuários ─────────────────────────────────────────────────────

function SecaoUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCriar, setModalCriar] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(null) // usuário a excluir
  const [excluindo, setExcluindo] = useState(false)
  const { showToast } = useToast()
  const { perfil: perfilLogado } = useAuth()

  async function carregarUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: false })
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { carregarUsuarios() }, [])

  async function alterarRole(id, novoRole) {
    const { error, count } = await supabase
      .from('perfis')
      .update({ role: novoRole }, { count: 'exact' })
      .eq('id', id)
    if (error) { showToast(`Erro: ${error.message}`, 'erro'); return }
    if (count === 0) {
      showToast('Não foi possível alterar o perfil. Verifique as permissões no banco.', 'erro')
      return
    }
    showToast(`Perfil atualizado para ${novoRole === 'admin' ? 'ADM' : 'User'}.`, 'sucesso')
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, role: novoRole } : u))
  }

  async function alterarAtivo(id, ativo) {
    const { error, count } = await supabase
      .from('perfis')
      .update({ ativo }, { count: 'exact' })
      .eq('id', id)
    if (error) { showToast(`Erro: ${error.message}`, 'erro'); return }
    if (count === 0) {
      showToast('Não foi possível alterar o status. Verifique as permissões no banco.', 'erro')
      return
    }
    showToast(ativo ? 'Usuário ativado.' : 'Usuário desativado.', 'sucesso')
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo } : u))
  }

  async function excluirUsuario(usuario) {
    setExcluindo(true)
    try {
      const { error } = await supabase
        .from('perfis')
        .delete()
        .eq('id', usuario.id)
      if (error) throw error
      showToast(`Usuário ${usuario.nome || usuario.email} excluído.`, 'sucesso')
      setUsuarios(prev => prev.filter(u => u.id !== usuario.id))
      setConfirmExcluir(null)
    } catch (e) {
      showToast(`Erro ao excluir: ${e.message}`, 'erro')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-100 text-base font-semibold mb-1">Gerenciar Usuários</h2>
          <p className="text-slate-500 text-xs">Apenas ADM pode criar e gerenciar acessos.</p>
        </div>
        <button
          onClick={() => setModalCriar(true)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          + Criar usuário
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Usuário</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Perfil</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-500 text-xs font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => {
                const ehProprioUsuario = u.id === perfilLogado?.id
                return (
                  <tr key={u.id} className={`border-b border-slate-700/50 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 text-sm font-medium">
                        {u.nome || '—'}
                        {ehProprioUsuario && (
                          <span className="ml-1.5 text-[10px] text-slate-500">(você)</span>
                        )}
                      </p>
                      <p className="text-slate-500 text-[11px]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        u.role === 'admin' ? 'bg-blue-900 text-blue-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {u.role === 'admin' ? 'ADM' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        u.ativo ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-500'
                      }`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {!ehProprioUsuario && (
                          <button
                            onClick={() => alterarRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            className="px-2 py-1 rounded text-[11px] border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
                          >
                            {u.role === 'admin' ? 'Tornar User' : 'Tornar ADM'}
                          </button>
                        )}
                        {!ehProprioUsuario && (
                          <button
                            onClick={() => alterarAtivo(u.id, !u.ativo)}
                            className={`px-2 py-1 rounded text-[11px] border transition-colors whitespace-nowrap ${
                              u.ativo
                                ? 'border-red-800 text-red-400 hover:border-red-600'
                                : 'border-green-800 text-green-400 hover:border-green-600'
                            }`}
                          >
                            {u.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                        {!ehProprioUsuario && (
                          <button
                            onClick={() => setConfirmExcluir(u)}
                            className="px-2 py-1 rounded text-[11px] border border-slate-700 text-slate-600 hover:border-red-800 hover:text-red-400 transition-colors"
                            title="Excluir usuário"
                          >
                            ✕
                          </button>
                        )}
                        {ehProprioUsuario && (
                          <span className="text-slate-600 text-[11px] pr-1">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalCriar && (
        <ModalCriarUsuario
          onClose={() => setModalCriar(false)}
          onCriado={carregarUsuarios}
        />
      )}

      {confirmExcluir && (
        <ModalConfirmarExclusao
          usuario={confirmExcluir}
          onConfirmar={() => excluirUsuario(confirmExcluir)}
          onCancelar={() => setConfirmExcluir(null)}
          excluindo={excluindo}
        />
      )}
    </section>
  )
}

// ─── Seção Sistema ─────────────────────────────────────────────────────────

function SecaoSistema({ stats }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-slate-100 text-base font-semibold mb-1">Sistema</h2>
        <p className="text-slate-500 text-xs">Informações gerais do ambiente.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Eventos no banco', valor: stats.totalEventos },
          { label: 'Notas criadas', valor: stats.totalNotas },
          { label: 'Versão do app', valor: `v${APP_VERSION}` },
        ].map(({ label, valor }) => (
          <div key={label} className="bg-slate-800 rounded-lg border border-slate-700 p-3 text-center">
            <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-slate-100 text-lg font-bold">{valor}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Divisor ───────────────────────────────────────────────────────────────

function Divisor() {
  return <hr className="border-slate-700/60" />
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function Settings() {
  const { stats } = useSync()
  const { isAdmin } = useAuth()

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
          <div>
            <h1 className="text-slate-100 text-xl font-bold">Configurações</h1>
            <p className="text-slate-500 text-sm mt-1">Painel de administração — Eleitoral 2026</p>
          </div>

          <SecaoSync />
          <Divisor />
          {isAdmin && (
            <>
              <SecaoCategorias />
              <Divisor />
            </>
          )}
          <SecaoUsuarios />
          <Divisor />
          <SecaoSistema stats={stats} />
        </div>
      </div>
    </div>
  )
}
