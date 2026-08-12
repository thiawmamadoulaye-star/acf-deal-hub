import { NavLink, Outlet } from 'react-router-dom'
import { ShieldCheck, LayoutDashboard, FileText, MessageSquare, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/ui/NotificationBell'

const clientNav = [
  { to: '/client/dashboard', label: 'Mes Mandats', icon: LayoutDashboard },
  { to: '/client/documents', label: 'Mes Documents', icon: FileText },
  { to: '/client/messages', label: 'Messagerie', icon: MessageSquare },
]

export default function ClientLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-950 text-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-gold-400" size={24} />
            <div>
              <div className="font-bold text-sm leading-tight">ACF DEAL HUB</div>
              <div className="text-[11px] text-navy-300">Espace Client</div>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {clientNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-gold-500 text-navy-950' : 'text-navy-100 hover:bg-navy-800'}`}>
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center">
                <UserIcon size={16} />
              </div>
              <span>{profile?.first_name}</span>
            </div>
            <button onClick={signOut} className="text-navy-300 hover:text-white">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav className="sm:hidden flex items-center justify-around border-t border-navy-800 px-2 py-2">
          {clientNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs ${isActive ? 'text-gold-400' : 'text-navy-300'}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
