import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Briefcase, KanbanSquare, Landmark,
  FolderLock, Users, FileText, Settings, ShieldCheck,
  Calculator, ClipboardCheck, ShieldAlert, Sparkles, FileSignature, Bot, Globe2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: null },
  { to: '/companies', label: 'Entreprises (CRM)', icon: Building2, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/mandates', label: 'Mandats', icon: Briefcase, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/deals', label: 'Deal Pipeline', icon: KanbanSquare, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/investors', label: 'Investisseurs', icon: Landmark, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/dataroom', label: 'Data Room', icon: FolderLock, roles: null },
  { to: '/financial-analysis', label: 'Analyse Financière', icon: Calculator, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/due-diligence', label: 'Due Diligence', icon: ClipboardCheck, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/risk-assessment', label: 'Notation des Risques', icon: ShieldAlert, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/investment-memos', label: 'Mémorandums (IA)', icon: Sparkles, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/ai-assistant', label: 'Assistant IA', icon: Bot, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/signatures', label: 'Signature Électronique', icon: FileSignature, roles: ['super_admin','partner','manager','analyst'] },
  { to: '/invoices', label: 'Facturation', icon: FileText, roles: ['super_admin','partner','manager'] },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, roles: ['super_admin'] },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings, roles: ['super_admin'] },
] as const

const groupNavItem = { to: '/group-dashboard', label: 'Tableau de Bord Groupe', icon: Globe2 }

export default function Sidebar() {
  const { profile } = useAuth()

  return (
    <aside className="w-64 bg-navy-950 text-white min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-navy-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-gold-400" size={28} />
          <div>
            <div className="font-bold text-lg leading-tight">ACF DEAL HUB</div>
            <div className="text-xs text-navy-300">Advanced Capital & Finance</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {profile?.is_group_admin && (
          <NavLink to={groupNavItem.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 border border-gold-500/30 ${isActive ? 'bg-gold-500 text-navy-950' : 'text-gold-400 hover:bg-navy-800'}`}>
            <groupNavItem.icon size={18} />
            {groupNavItem.label}
          </NavLink>
        )}
        {navItems
          .filter((item) => !item.roles || (profile && item.roles.includes(profile.role as any)))
          .map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-gold-500 text-navy-950' : 'text-navy-100 hover:bg-navy-800'}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="px-6 py-4 border-t border-navy-800 text-xs text-navy-400">
        © {new Date().getFullYear()} ACF — Dakar, Sénégal
      </div>
    </aside>
  )
}
