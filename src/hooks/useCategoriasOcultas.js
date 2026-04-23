import { useState, useEffect, useCallback } from 'react'
import { CORES_CATEGORIA } from '../lib/constants'

const STORAGE_KEY = 'eleitoral_categorias_ocultas'

export const TODAS_CATEGORIAS = Object.keys(CORES_CATEGORIA)

function lerStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useCategoriasOcultas() {
  const [ocultas, setOcultas] = useState(lerStorage)

  // Sincroniza entre abas
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setOcultas(lerStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleCategoria = useCallback((categoria) => {
    setOcultas(prev => {
      const proximas = prev.includes(categoria)
        ? prev.filter(c => c !== categoria)
        : [...prev, categoria]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proximas))
      return proximas
    })
  }, [])

  const estaOculta = useCallback((categoria) => ocultas.includes(categoria), [ocultas])

  return { ocultas, toggleCategoria, estaOculta }
}
