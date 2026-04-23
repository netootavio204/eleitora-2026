import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        buscarPerfil(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    }).catch(() => setIsLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        buscarPerfil(session.user.id)
      } else {
        setPerfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function buscarPerfil(userId) {
    try {
      const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .single()
      setPerfil(data || { role: 'user' })
    } catch {
      setPerfil({ role: 'user' })
    }
  }

  return (
    <AuthContext.Provider value={{
      session,
      perfil,
      isAdmin: perfil?.role === 'admin',
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
