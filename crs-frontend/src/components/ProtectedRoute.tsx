import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: 'ADMIN' | 'STUDENT' }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/courses" replace />
  return children
}
