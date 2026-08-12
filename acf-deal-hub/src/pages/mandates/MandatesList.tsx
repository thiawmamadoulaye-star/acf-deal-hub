import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Mandate } from '@/types/database'
import Badge from '@/components/ui/Badge'
import MandateFormModal from './MandateFormModal'

const typeLabels: Record<string, string> = {
  debt_raising: 'Levée de dette', equity_raising: 'Levée de fonds', project_finance: 'Project Finance',
  restructuring: 'Restructuration', ma_advisory: 'M&A Advisory', strategy_advisory: 'Conseil stratégique', other: 'Autre',
}

const statusConfig: Record<string, { label: string; color: 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'gold' }> = {
  draft: { label: 'Brouillon', color: 'gray' }, active: { label: 'Actif', color: 'blue' },
  due_diligence: { label: 'Due Diligence', color: 'yellow' }, negotiation: { label: 'Négociation', color: 'gold' },
  closing: { label: 'Closing', color: 'gold' }, closed_won: { label: 'Gagné', color: 'green' },
  closed_lost: { label: 'Perdu', color: 'red' }, on_hold: { label: 'En pause', color: 'gray' },
}

function formatFCFA(value: number | null) {
  if (!value) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds FCFA`
  return `${(value / 1_000_000).toFixed(0)} M FCFA`
}

export default function MandatesList() {
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function loadMandates() {
    setLoading(true)
    const { data, error } = await supabase.from('mandates').select('*, client:companies(id, name)').order('created_at', { ascending: false })
    if (!error && data) setMandates(data as unknown as Mandate[])
    setLoading(false)
  }

  useEffect(() => { loadMandates() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mandats</h2>
          <p className="text-gray-500 text-sm mt-0.5">Missions confiées à ACF par ses clients</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouveau mandat</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && <div className="col-span-full text-center text-gray-400 py-10">Chargement…</div>}
        {!loading && mandates.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">Aucun mandat pour le moment. Créez votre premier mandat.</div>}
        {mandates.map((m) => {
          const status = statusConfig[m.status] ?? { label: m.status, color: 'gray' as const }
          return (
            <Link key={m.id} to={`/mandates/${m.id}`} className="card hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center"><Briefcase size={18} /></div>
                <Badge color={status.color}>{status.label}</Badge>
              </div>
              <div className="text-xs text-gray-400 mb-1">{m.reference}</div>
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{m.title}</h3>
              <div className="text-sm text-gray-500 mb-3">{(m as any).client?.name ?? '—'}</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{typeLabels[m.mandate_type]}</span>
                <span className="font-semibold text-navy-800">{formatFCFA(m.amount_requested)}</span>
              </div>
              {m.target_close_date && <div className="text-xs text-gray-400 mt-2">Closing visé : {new Date(m.target_close_date).toLocaleDateString('fr-FR')}</div>}
            </Link>
          )
        })}
      </div>

      {showModal && <MandateFormModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadMandates() }} />}
    </div>
  )
}
