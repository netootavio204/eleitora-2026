import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNotes(eventoId) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!eventoId) return
    let cancelado = false

    async function buscarNotas() {
      setLoading(true)
      setErro(null)
      try {
        const { data, error } = await supabase
          .from('notas')
          .select('*, perfis(nome, email, role)')
          .eq('evento_id', eventoId)
          .order('criado_em', { ascending: false })
        if (error) throw error
        if (!cancelado) setNotas(data || [])
      } catch (e) {
        if (!cancelado) setErro(e.message)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    buscarNotas()
    return () => { cancelado = true }
  }, [eventoId])

  async function criarNota(dados) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')
    const { data, error } = await supabase
      .from('notas')
      .insert({
        evento_id: Number(eventoId),
        user_id: user.id,
        titulo: dados.titulo,
        conteudo: dados.conteudo || null,
        cor: dados.cor || '#3B82F6',
        link_url: dados.link_url || null,
        link_titulo: dados.link_titulo || null
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setNotas(prev => [data, ...prev])
    return data
  }


  async function atualizarNota(id, dados) {
    const { data, error } = await supabase
      .from('notas')
      .update({ ...dados, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Buscar perfis separadamente também na atualização
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nome, email, role')
      .eq('id', data.user_id)
      .single()

    const notaCompleta = { ...data, perfis: perfil ?? null }
    setNotas(prev => prev.map(n => n.id === id ? notaCompleta : n))
    return notaCompleta
  }

  async function excluirNota(id) {
    const snapshot = notas
    setNotas(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('notas').delete().eq('id', id)
    if (error) {
      setNotas(snapshot)
      throw error
    }
  }

  return { notas, loading, erro, criarNota, atualizarNota, excluirNota }
}
