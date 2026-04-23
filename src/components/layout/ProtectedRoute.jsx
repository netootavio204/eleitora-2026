import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'

export function ProtectedRoute({ children }) {
  const { session, isLoading } = useAuth()

  if (isLoading) return <Spinner fullScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}

export function AdminRoute({ children }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <Spinner fullScreen />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}
