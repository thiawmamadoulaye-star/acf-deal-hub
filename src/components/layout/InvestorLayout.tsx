import { Outlet, NavLink } from 'react-router-dom'
import { ShieldCheck, LayoutDashboard, LogOut, Landmark } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/ui/NotificationBell'

export default function InvestorLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-950 text-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-gold-400" size={24} />
            <div>
              <div className="font-bold text-sm leading-tight">ACF DEAL HUB</div>
              <div className="text-[11px] text-navy-300">Portail Investisseur</div>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/investor/dashboard" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-gold-500 text-navy-950' : 'text-navy-100 hover:bg-navy-800'}`}>
              <LayoutDashboard size={16} /> Opportunités
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center">
                <Landmark size={16} />
              </div>
              <span>{profile?.first_name}</span>
            </div>
            <button onClick={signOut} className="text-navy-300 hover:text-white">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
