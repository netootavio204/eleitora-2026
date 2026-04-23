import { useState } from 'react'
import Modal from '../ui/Modal'
import NoteList from '../notes/NoteList'
import NoteForm from '../notes/NoteForm'
import { useNotes } from '../../hooks/useNotes'
import { useToast } from '../../contexts/ToastContext'
import { CORES_CATEGORIA } from '../../lib/constants'
import { formatarDataExtenso, formatarDataCurta, chipEmDias } from '../../lib/dateUtils'

export default function EventModal({ evento, onClose }) {
  const { notas, loading, criarNota, atualizarNota, excluirNota } = useNotes(evento?.id)
  const { showToast } = useToast()
  const [formNova, setFormNova] = useState(false)
  const [salvandoNova, setSalvandoNova] = useState(false)

  if (!evento) return null

  const cores = CORES_CATEGORIA[evento.categoria] ?? CORES_CATEGORIA['Outros']
  const dataExtenso = formatarDataExtenso(evento.data_evento)
  const chip = chipEmDias(evento.data_evento)

  // Cria nota nova — toast gerenciado pelo NoteForm
  async function handleCriarNota(dados) {
    setSalvandoNova(true)
    try {
      await criarNota(dados)
      setFormNova(false)
    } finally {
      setSalvandoNova(false)
    }
  }

  // Atualiza nota existente (inline no NoteList) — toast gerenciado pelo NoteForm
  async function handleAtualizarNota(id, dados) {
    await atualizarNota(id, dados)
  }

  // Exclui nota — toast aqui pois não há NoteForm envolvido
  async function handleExcluirNota(id) {
    try {
      await excluirNota(id)
      showToast('Nota excluída.', 'sucesso')
    } catch (e) {
      showToast(`Erro ao excluir: ${e.message}`, 'erro')
      throw e
    }
  }

  async function copiarParaPauta() {
    const texto = `📅 ${dataExtenso} — ${evento.categoria}: ${evento.descricao}`
    try {
      await navigator.clipboard.writeText(texto)
      showToast('Copiado para a área de transferência.', 'sucesso')
    } catch {
      showToast('Não foi possível copiar.', 'erro')
    }
  }

  async function copiarData() {
    try {
      await navigator.clipboard.writeText(formatarDataCurta(evento.data_evento))
      showToast('Data copiada.', 'sucesso')
    } catch {
      showToast('Não foi possível copiar.', 'erro')
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-slate-200 text-base font-medium capitalize leading-snug">
            {dataExtenso}
          </p>
          <span className="self-start px-2 py-0.5 rounded-full bg-blue-900 text-blue-300 text-[11px] font-medium">
            {chip}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors flex-shrink-0 mt-0.5"
          aria-label="Fechar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Categoria + Descrição */}
      <div className="px-5 pb-4 flex flex-col gap-3">
        <span className={`self-start px-3 py-1 rounded-full text-xs font-medium ${cores.bg} ${cores.text}`}>
          {evento.categoria}
        </span>
        <p className="text-slate-100 text-[15px] font-medium leading-snug">
          {evento.descricao}
        </p>
      </div>

      <hr className="border-slate-700 mx-5" />

      {/* Seção de notas */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Notas
        </p>

        <NoteList
          notas={notas}
          loading={loading}
          onSalvarEdicao={handleAtualizarNota}
          onExcluir={handleExcluirNota}
        />

        {formNova ? (
          <NoteForm
            onSalvar={handleCriarNota}
            onCancelar={() => setFormNova(false)}
            salvando={salvandoNova}
          />
        ) : (
          <button
            onClick={() => setFormNova(true)}
            className="w-full py-2 rounded-lg border border-slate-600 text-slate-400 text-sm hover:border-slate-400 hover:text-slate-200 transition-colors"
          >
            + Adicionar nota
          </button>
        )}
      </div>

      <hr className="border-slate-700 mx-5" />

      {/* Ações + rodapé */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            onClick={copiarParaPauta}
            className="flex-1 py-2 rounded-lg border border-blue-600 text-blue-400 text-sm font-medium hover:bg-blue-600/10 transition-colors"
          >
            📋 Copiar para pauta
          </button>
          <button
            onClick={copiarData}
            className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm font-medium hover:border-slate-400 hover:text-slate-200 transition-colors"
          >
            📅 Copiar data
          </button>
        </div>
        <p className="text-slate-600 text-[11px]">
          Fonte: Senado Federal · Calendário Eleitoral 2026
        </p>
      </div>
    </Modal>
  )
}
