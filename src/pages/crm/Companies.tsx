import { useEffect, useState } from 'react'
import { Plus, Search, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Company } from '@/types/database'
import Badge from '@/components/ui/Badge'
import CompanyFormModal from './CompanyFormModal'

const typeLabels: Record<string, string> = { client: 'Client', target: 'Cible', partner: 'Partenaire', other: 'Autre' }
const statusColors: Record<string, 'green' | 'yellow' | 'gray'> = { active: 'green', prospect: 'yellow', inactive: 'gray' }

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  async function loadCompanies() {
    setLoading(true)
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    if (!error && data) setCompanies(data as Company[])
    setLoading(false)
  }

  useEffect(() => { loadCompanies() }, [])

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.sector ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Entreprises (CRM)</h2>
          <p className="text-gray-500 text-sm mt-0.5">Clients, cibles et partenaires d'ACF</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouvelle entreprise</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input className="input-field pl-9" placeholder="Rechercher par nom ou secteur…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Entreprise</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Secteur</th>
              <th className="pb-3 font-medium">Pays / Ville</th><th className="pb-3 font-medium">CA annuel</th><th className="pb-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Aucune entreprise trouvée.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3"><div className="flex items-center gap-2 font-medium text-gray-900"><Building2 size={16} className="text-navy-600" />{c.name}</div></td>
                <td className="py-3 text-gray-600">{typeLabels[c.company_type]}</td>
                <td className="py-3 text-gray-600">{c.sector ?? '—'}</td>
                <td className="py-3 text-gray-600">{c.city ?? c.country ?? '—'}</td>
                <td className="py-3 text-gray-600">{c.annual_revenue ? `${(c.annual_revenue / 1_000_000_000).toFixed(1)} Mds FCFA` : '—'}</td>
                <td className="py-3"><Badge color={statusColors[c.status] ?? 'gray'}>{c.status === 'active' ? 'Actif' : c.status === 'prospect' ? 'Prospect' : 'Inactif'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <CompanyFormModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadCompanies() }} />}
    </div>
  )
}
