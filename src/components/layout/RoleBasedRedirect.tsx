import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function RoleBasedRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-950">
        <div className="text-white text-sm animate-pulse">Chargement…</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const STAFF_ROLES = ['super_admin', 'partner', 'manager', 'analyst']

  if (profile?.role === 'client') return <Navigate to="/client/dashboard" replace />
  if (profile?.role === 'investor') return <Navigate to="/investor/dashboard" replace />
  if (profile && STAFF_ROLES.includes(profile.role)) return <Navigate to="/dashboard" replace />

  return <Navigate to="/no-access" replace />
}
