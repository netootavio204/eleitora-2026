import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useEvents() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function buscar() {
      setLoading(true)
      setErro(null)
      try {
        const { data, error } = await supabase
          .from('eventos')
          .select('*')
          .order('data_evento', { ascending: true })
        if (error) throw error
        setEventos(data || [])
      } catch(e) {
        console.error('Erro eventos:', e)
        setErro(e.message)
      } finally {
        setLoading(false)
      }
    }
    buscar()
  }, [])

  return { eventos, loading, erro }
}
