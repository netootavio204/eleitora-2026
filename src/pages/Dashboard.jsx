import { useState, useMemo } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import AgendaPanel from '../components/agenda/AgendaPanel'
import CalendarGrid from '../components/calendar/CalendarGrid'
import EventModal from '../components/events/EventModal'
import { useEvents } from '../hooks/useEvents'
import { useAuth } from '../contexts/AuthContext'
import { useCategoriasOcultas } from '../hooks/useCategoriasOcultas'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [periodo, setPeriodo] = useState('todos')
  const [syncing, setSyncing] = useState(false)
  const [ultimaSync, setUltimaSync] = useState(null)
  const [eventoSelecionado, setEventoSelecionado] = useState(null)

  const { eventos, loading, erro } = useEvents()
  const { estaOculta } = useCategoriasOcultas()

  const eventosFiltrados = useMemo(
    () => eventos.filter(e => !estaOculta(e.categoria)),
    [eventos, estaOculta]
  )

  async function handleAtualizar() {
    if (syncing) return
    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.functions.invoke('scraper', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const agora = format(new Date(), "HH:mm 'de' dd/MM", { locale: ptBR })
      setUltimaSync(`Atualizado às ${agora}`)
    } catch {
      setUltimaSync('Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          titulo="Dashboard"
          periodo={periodo}
          onPeriodo={setPeriodo}
          onAtualizar={handleAtualizar}
          syncing={syncing}
          ultimaSync={ultimaSync}
        />

        <main className="flex flex-1 gap-4 p-4 overflow-hidden">
          {/* AgendaPanel largura fixa 380px */}
          <section className="w-[380px] flex-shrink-0 overflow-hidden flex flex-col">
            {loading && (
              <div className="flex items-center justify-center flex-1">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {erro && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                Erro ao carregar eventos: {erro}
              </div>
            )}
            {!loading && !erro && (
              <AgendaPanel
                eventos={eventosFiltrados}
                onEventoClick={setEventoSelecionado}
                periodo={periodo}
              />
            )}
          </section>

          {/* CalendarGrid 70% */}
          <section className="flex-1 overflow-hidden">
            <CalendarGrid eventos={eventosFiltrados} periodo={periodo} />
          </section>
        </main>
      </div>

      {eventoSelecionado && (
        <EventModal
          evento={eventoSelecionado}
          onClose={() => setEventoSelecionado(null)}
        />
      )}
    </div>
  )
}
