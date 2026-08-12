import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, ChevronRight, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import Badge from '@/components/ui/Badge'
import type { Deal, Mandate } from '@/types/database'

interface DealInvestorRow { id: string; status: string; amount_committed: number | null; deal: Deal & { mandate?: Mandate } }

const statusConfig: Record<string, { label: string; color: 'gray' | 'blue' | 'green' | 'red' | 'gold' }> = {
  identified: { label: 'Identifié', color: 'gray' }, contacted: { label: 'Contacté', color: 'blue' },
  nda_signed: { label: 'NDA signé', color: 'blue' }, interested: { label: 'Intéressé', color: 'gold' },
  declined: { label: 'Décliné', color: 'red' }, committed: { label: 'Engagé', color: 'green' }, funded: { label: 'Financé', color: 'green' },
}

function formatFCFA(value: number | null) {
  if (!value) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds FCFA`
  return `${(value / 1_000_000).toFixed(0)} M FCFA`
}

export default function InvestorDashboard() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<DealInvestorRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.investor_id) { setLoading(false); return }
    supabase.from('deal_investors').select('id, status, amount_committed, deal:deals(*, mandate:mandates(reference, title, sector))').eq('investor_id', profile.investor_id).then(({ data, error }) => {
      if (!error && data) setRows(data as unknown as DealInvestorRow[])
      setLoading(false)
    })
  }, [profile?.investor_id])

  if (!loading && !profile?.investor_id) {
    return <div className="card text-center py-10 text-gray-500">Votre compte n'est pas encore rattaché à une fiche investisseur. Contactez votre interlocuteur ACF.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bienvenue {profile?.first_name} 👋</h2>
        <p className="text-gray-500 text-sm mt-0.5">Opportunités d'investissement sur lesquelles ACF vous a sollicité</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && <div className="text-center text-gray-400 py-10">Chargement…</div>}
        {!loading && rows.length === 0 && <div className="card text-center text-gray-400 py-10">Aucune opportunité ne vous a encore été partagée.</div>}
        {rows.map((row) => {
          const status = statusConfig[row.status] ?? { label: row.status, color: 'gray' as const }
          return (
            <Link key={row.id} to={`/investor/deals/${row.deal.id}`} className="card hover:shadow-md transition-shadow flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center"><Briefcase size={20} /></div>
                <div>
                  <div className="text-xs text-gray-400">{row.deal.mandate?.reference}</div>
                  <h3 className="font-semibold text-gray-900">{row.deal.deal_name}</h3>
                  <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5"><TrendingUp size={13} /> {formatFCFA(row.deal.deal_value)}{row.deal.mandate?.sector && ` — ${row.deal.mandate.sector}`}</div>
                </div>
              </div>
              <div className="flex items-center gap-3"><Badge color={status.color}>{status.label}</Badge><ChevronRight size={18} className="text-gray-300" /></div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
