import { useState } from 'react'
import Modal from './Modal'
import { supabase } from '../../lib/supabase'

export default function AlterarSenhaModal({ onClose }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setLoading(false)

    if (error) {
      setErro(error.message)
    } else {
      setSucesso(true)
      setTimeout(onClose, 1800)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-slate-100 text-base font-semibold">Alterar Senha</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sucesso ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-slate-200 text-sm text-center">Senha alterada com sucesso!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-xs font-medium">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                autoFocus
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-400 text-xs font-medium">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {erro && (
              <p className="text-red-400 text-xs">{erro}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
