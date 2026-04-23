import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const PERIODOS = [
  { label: 'Hoje',        value: 'hoje' },
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mês',   value: 'mes' },
  { label: 'Todos',      value: 'todos' },
]

function iniciais(nome) {
  if (!nome) return '?'
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function Topbar({ titulo, periodo, onPeriodo, onAtualizar, syncing, ultimaSync }) {
  const { perfil, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [dropdown, setDropdown] = useState(false)

  async function sair() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="h-14 bg-[#1E293B] border-b border-slate-700 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Título */}
      <h1 className="text-slate-100 text-base font-medium mr-2">{titulo}</h1>

      {/* Chips de filtro */}
      <div className="flex items-center gap-1">
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => onPeriodo?.(p.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
              periodo === p.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Admin: sync status + botão */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          {ultimaSync && (
            <span className="text-slate-500 text-xs hidden md:block">{ultimaSync}</span>
          )}
          <button
            onClick={onAtualizar}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-600 text-blue-400 text-xs font-medium hover:bg-blue-600/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Atualizando…' : 'Atualizar dados'}
          </button>
        </div>
      )}

      {/* Avatar + dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdown(d => !d)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="hidden sm:block text-slate-300 text-xs font-medium max-w-[120px] truncate">
            {perfil?.nome}
          </span>
          <span className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {iniciais(perfil?.nome)}
          </span>
        </button>

        {dropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdown(false)} />
            <div className="absolute right-0 top-10 z-20 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
              <div className="px-3 py-2 border-b border-slate-700">
                <p className="text-slate-200 text-sm font-medium truncate">{perfil?.nome}</p>
                <p className="text-slate-500 text-xs capitalize">{perfil?.role}</p>
              </div>
              <button
                onClick={sair}
                className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
