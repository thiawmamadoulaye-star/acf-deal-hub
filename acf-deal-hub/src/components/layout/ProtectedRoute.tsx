import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/types/database'

interface ProtectedRouteProps {
  allowedRoles?: Profile['role'][]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-950">
        <div className="text-white text-sm animate-pulse">Chargement d'ACF DEAL HUB…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    const STAFF_ROLES = ['super_admin', 'partner', 'manager', 'analyst']
    let fallback = '/no-access'
    if (profile.role === 'client') fallback = '/client/dashboard'
    else if (profile.role === 'investor') fallback = '/investor/dashboard'
    else if (STAFF_ROLES.includes(profile.role)) fallback = '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
