import { useEffect, useState } from 'react'
import { Landmark, Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Investor } from '@/types/database'
import Badge from '@/components/ui/Badge'

const typeLabels: Record<string, string> = {
  bank: 'Banque', private_equity: 'Private Equity', dfi: 'DFI', family_office: 'Family Office',
  insurer: 'Assureur', sovereign_fund: 'Fonds Souverain', venture_capital: 'Venture Capital', other: 'Autre',
}

function formatFCFA(value: number | null) {
  if (!value) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds`
  return `${(value / 1_000_000).toFixed(0)} M`
}

export default function Investors() {
  const [investors, setInvestors] = useState<Investor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('investors').select('*').order('name').then(({ data, error }) => {
      if (!error && data) setInvestors(data as Investor[])
      setLoading(false)
    })
  }, [])

  const filtered = investors.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Base Investisseurs</h2>
          <p className="text-gray-500 text-sm mt-0.5">Banques, fonds, DFI et partenaires financiers — usage strictement interne</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouvel investisseur</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input className="input-field pl-9" placeholder="Rechercher un investisseur…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <div className="col-span-full text-center text-gray-400 py-10">Chargement…</div>}
        {!loading && filtered.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">Aucun investisseur trouvé.</div>}
        {filtered.map((inv) => (
          <div key={inv.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-gold-100 text-gold-700 flex items-center justify-center"><Landmark size={18} /></div>
              <Badge color="navy">{typeLabels[inv.investor_type]}</Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{inv.name}</h3>
            <div className="text-sm text-gray-500 mb-3">{inv.country ?? '—'}</div>
            {inv.sector_focus && inv.sector_focus.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {inv.sector_focus.map((s) => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
              </div>
            )}
            <div className="text-sm text-gray-600 border-t border-gray-100 pt-3">Ticket : {formatFCFA(inv.ticket_min)} — {formatFCFA(inv.ticket_max)} FCFA</div>
            {inv.contact_name && <div className="text-xs text-gray-400 mt-1">Contact : {inv.contact_name}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
