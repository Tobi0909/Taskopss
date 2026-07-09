import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/board" replace />
  }

  return <>{children}</>
}
