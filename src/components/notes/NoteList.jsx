import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import NoteTag from './NoteTag'
import NoteForm from './NoteForm'

function NoteItem({ nota, ehAutor, onSalvarEdicao, onExcluir }) {
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const autor = nota.perfis?.nome ?? 'Usuário'
  const isAdmin = nota.perfis?.role === 'admin'

  async function handleSalvar(dados) {
    setSalvando(true)
    try {
      await onSalvarEdicao(nota.id, dados)
      setEditando(false)
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    if (!confirmando) {
      setConfirmando(true)
      // Reseta confirmação após 3s se não clicar de novo
      setTimeout(() => setConfirmando(false), 3000)
      return
    }
    setExcluindo(true)
    try {
      await onExcluir(nota.id)
    } finally {
      setExcluindo(false)
    }
  }

  if (editando) {
    return (
      <div className="py-2">
        <NoteForm
          dadosIniciais={nota}
          onSalvar={handleSalvar}
          onCancelar={() => setEditando(false)}
          salvando={salvando}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 py-2.5 border-b border-slate-700/50 last:border-0">
      <div className="flex items-start gap-2">
        <NoteTag cor={nota.cor} titulo={nota.titulo} temLink={!!nota.link_url} />

        {ehAutor && (
          <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setEditando(true)}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
              title="Editar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleExcluir}
              disabled={excluindo}
              className={`p-1 rounded transition-colors ${
                confirmando
                  ? 'text-red-400 bg-red-900/30 hover:text-red-300'
                  : 'text-slate-500 hover:text-red-400 hover:bg-slate-700'
              }`}
              title={confirmando ? 'Clique novamente para confirmar' : 'Excluir'}
            >
              {excluindo ? (
                <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin block" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {nota.conteudo && (
        <p className="text-slate-400 text-xs leading-snug">{nota.conteudo}</p>
      )}

      {nota.link_url && (
        <a
          href={nota.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2 transition-colors self-start"
        >
          {nota.link_titulo || nota.link_url} →
        </a>
      )}

      <p className="text-slate-600 text-[11px]">
        por {autor}{isAdmin ? ' (ADM)' : ''}
        {confirmando && (
          <span className="ml-2 text-red-400 font-medium">Clique no lixo para confirmar</span>
        )}
      </p>
    </div>
  )
}

export default function NoteList({ notas, loading, onSalvarEdicao, onExcluir }) {
  const { perfil } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!notas.length) {
    return (
      <p className="text-slate-600 text-xs py-2 leading-relaxed">
        Nenhuma nota ainda. Seja o primeiro a adicionar!
      </p>
    )
  }

  return (
    <div>
      {notas.map(nota => (
        <NoteItem
          key={nota.id}
          nota={nota}
          ehAutor={nota.user_id === perfil?.id}
          onSalvarEdicao={onSalvarEdicao}
          onExcluir={onExcluir}
        />
      ))}
    </div>
  )
}
