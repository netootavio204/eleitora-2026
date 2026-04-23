import { useState } from 'react'
import { CORES_NOTA } from '../../lib/constants'
import { useToast } from '../../contexts/ToastContext'

const MAX_TITULO = 60

function validarUrl(url) {
  if (!url) return true
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function NoteForm({ dadosIniciais = null, onSalvar, onCancelar, salvando = false }) {
  const { showToast } = useToast()
  const [titulo, setTitulo] = useState(dadosIniciais?.titulo ?? '')
  const [cor, setCor] = useState(dadosIniciais?.cor ?? CORES_NOTA[0].hex)
  // Colunas corretas do banco: conteudo, link_url, link_titulo
  const [conteudo, setConteudo] = useState(dadosIniciais?.conteudo ?? '')
  const [linkUrl, setLinkUrl] = useState(dadosIniciais?.link_url ?? '')
  const [linkTitulo, setLinkTitulo] = useState(dadosIniciais?.link_titulo ?? '')
  const [erro, setErro] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) {
      setErro('O título é obrigatório.')
      return
    }
    if (linkUrl.trim() && !validarUrl(linkUrl.trim())) {
      setErro('URL inválida. Use o formato https://...')
      return
    }
    setErro(null)

    try {
      await onSalvar({
        titulo: titulo.trim(),
        cor,
        conteudo: conteudo.trim() || null,
        link_url: linkUrl.trim() || null,
        link_titulo: linkUrl.trim() ? (linkTitulo.trim() || null) : null,
      })
      showToast(dadosIniciais ? 'Nota atualizada.' : 'Nota adicionada.', 'sucesso')
    } catch (e) {
      const msg = e.message ?? 'Erro ao salvar nota.'
      setErro(msg)
      showToast(msg, 'erro')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 bg-slate-700/30 rounded-lg p-3 border border-slate-600"
    >
      <p className="text-slate-300 text-xs font-semibold">
        {dadosIniciais ? 'Editar nota' : 'Nova nota'}
      </p>

      {/* Título */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-slate-400 text-[11px]">Título *</label>
          <span className={`text-[11px] ${titulo.length >= MAX_TITULO ? 'text-amber-400' : 'text-slate-600'}`}>
            {titulo.length}/{MAX_TITULO}
          </span>
        </div>
        <input
          type="text"
          value={titulo}
          onChange={e => setTitulo(e.target.value.slice(0, MAX_TITULO))}
          placeholder="Ex: Acompanhar resultado ao vivo"
          autoFocus
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Seletor de cor */}
      <div>
        <p className="text-slate-400 text-[11px] mb-2">Cor da etiqueta</p>
        <div className="flex items-center gap-2 flex-wrap">
          {CORES_NOTA.map(c => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setCor(c.hex)}
              title={c.nome}
              className="w-6 h-6 rounded-full focus:outline-none flex-shrink-0"
              style={{
                backgroundColor: c.hex,
                outline: cor === c.hex ? '2px solid white' : '2px solid transparent',
                outlineOffset: '2px',
                transform: cor === c.hex ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 100ms, outline 100ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* Observações / Conteúdo */}
      <div>
        <label className="text-slate-400 text-[11px] block mb-1">Observações (opcional)</label>
        <textarea
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
          placeholder="Detalhes adicionais..."
          rows={3}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {/* URL */}
      <div>
        <label className="text-slate-400 text-[11px] block mb-1">Link (opcional)</label>
        <input
          type="text"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Título do link — só aparece se URL preenchida */}
      {linkUrl.trim() && (
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">Texto do link</label>
          <input
            type="text"
            value={linkTitulo}
            onChange={e => setLinkTitulo(e.target.value)}
            placeholder="Ex: Ver guia do TSE"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {erro && (
        <p className="text-red-400 text-xs leading-snug">{erro}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {salvando ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Salvando…
            </span>
          ) : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm font-medium hover:border-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
