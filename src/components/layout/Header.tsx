import { LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/ui/NotificationBell'

const roleLabels: Record<string, string> = {
  super_admin: 'Administrateur', partner: 'Associé', manager: 'Manager',
  analyst: 'Analyste', client: 'Client', investor: 'Investisseur',
}

export default function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="text-sm text-gray-500">ACF DEAL HUB</div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-navy-800 text-white flex items-center justify-center">
            <UserIcon size={18} />
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">{profile?.first_name} {profile?.last_name}</div>
            <div className="text-xs text-gray-500">{profile ? roleLabels[profile.role] : ''}</div>
          </div>
        </div>
        <button onClick={signOut} className="text-gray-400 hover:text-red-600 transition-colors" title="Se déconnecter">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}
