import { useEffect, useState } from 'react'
import { Users as UsersIcon, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Profile, AppRole } from '@/types/database'
import Badge from '@/components/ui/Badge'

const roleLabels: Record<AppRole, string> = {
  super_admin: 'Administrateur', partner: 'Associé', manager: 'Manager',
  analyst: 'Analyste', client: 'Client', investor: 'Investisseur',
}
const roleColors: Record<AppRole, 'navy' | 'gold' | 'blue' | 'gray' | 'green'> = {
  super_admin: 'navy', partner: 'gold', manager: 'blue', analyst: 'gray', client: 'green', investor: 'gray',
}

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (!error && data) setUsers(data as Profile[])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function updateRole(userId: string, role: AppRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (!error) loadUsers()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Gestion des utilisateurs</h2>
        <p className="text-gray-500 text-sm mt-0.5">Administration des accès et rôles applicatifs — réservé au Super Admin</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Utilisateur</th><th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Rôle</th><th className="pb-3 font-medium">Statut</th><th className="pb-3 font-medium">Modifier le rôle</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3">
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center"><UsersIcon size={14} /></div>
                    {u.first_name} {u.last_name}
                  </div>
                </td>
                <td className="py-3 text-gray-600">{u.email}</td>
                <td className="py-3"><Badge color={roleColors[u.role]}>{u.role === 'super_admin' && <ShieldCheck size={12} className="inline mr-1" />}{roleLabels[u.role]}</Badge></td>
                <td className="py-3"><Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Actif' : 'Inactif'}</Badge></td>
                <td className="py-3">
                  <select className="input-field text-xs py-1" value={u.role} onChange={(e) => updateRole(u.id, e.target.value as AppRole)}>
                    {Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
