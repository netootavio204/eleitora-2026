import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

function iniciais(nome) {
  if (!nome) return '?'
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export default function Sidebar() {
  const { perfil, isAdmin } = useAuth()

  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebar-collapsed') === 'true'
  )

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  async function sair() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const linkClass = (isActive, collapsed) =>
    `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-blue-600/20 text-white border-l-2 border-blue-500 pl-[10px]'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`

  return (
    <aside
      className={`${collapsed ? 'w-[60px]' : 'w-[220px]'} min-h-screen bg-slate-900 border-r border-slate-700 flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden`}
    >
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-5 border-b border-slate-700`}>
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">E26</span>
        </div>
        {!collapsed && (
          <span className="text-slate-100 text-sm font-medium leading-tight whitespace-nowrap">
            Eleitoral 2026
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        <NavLink
          to="/dashboard"
          title="Dashboard"
          className={({ isActive }) => linkClass(isActive, collapsed)}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {!collapsed && <span className="whitespace-nowrap">Dashboard</span>}
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/settings"
            title="Configurações"
            className={({ isActive }) => linkClass(isActive, collapsed)}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!collapsed && <span className="whitespace-nowrap">Configurações</span>}
          </NavLink>
        )}
      </nav>

      {/* User + toggle */}
      <div className="px-2 py-3 border-t border-slate-700 flex flex-col gap-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{iniciais(perfil?.nome)}</span>
            </div>
            <button
              onClick={sair}
              title="Sair"
              className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{iniciais(perfil?.nome)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate">{perfil?.nome || 'Usuário'}</p>
              <p className="text-slate-500 text-[11px] truncate capitalize">{perfil?.role || 'user'}</p>
            </div>
            <button
              onClick={sair}
              title="Sair"
              className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}

        {/* Botão retrair */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menu' : 'Retrair menu'}
          className="w-full flex items-center justify-center p-1.5 rounded text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
