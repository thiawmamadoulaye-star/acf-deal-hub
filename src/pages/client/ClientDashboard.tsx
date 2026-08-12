import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate, MandateStatus } from '@/types/database'
import Badge from '@/components/ui/Badge'

const statusConfig: Record<MandateStatus, { label: string; color: 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'gold'; progress: number }> = {
  draft: { label: 'Brouillon', color: 'gray', progress: 5 }, active: { label: 'En cours', color: 'blue', progress: 25 },
  due_diligence: { label: 'Due Diligence', color: 'yellow', progress: 45 }, negotiation: { label: 'Négociation', color: 'gold', progress: 65 },
  closing: { label: 'Closing', color: 'gold', progress: 85 }, closed_won: { label: 'Finalisé', color: 'green', progress: 100 },
  closed_lost: { label: 'Clôturé sans suite', color: 'red', progress: 100 }, on_hold: { label: 'En pause', color: 'gray', progress: 25 },
}

export default function ClientDashboard() {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('mandates').select('*, client:companies(name)').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!error && data) setMandates(data as unknown as Mandate[])
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bienvenue {profile?.first_name} 👋</h2>
        <p className="text-gray-500 text-sm mt-0.5">Suivez en temps réel l'avancement de vos mandats confiés à ACF</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && <div className="text-center text-gray-400 py-10">Chargement…</div>}
        {!loading && mandates.length === 0 && <div className="card text-center text-gray-400 py-10">Aucun mandat associé à votre compte.</div>}
        {mandates.map((m) => {
          const status = statusConfig[m.status]
          return (
            <Link key={m.id} to={`/client/mandates/${m.id}`} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center"><Briefcase size={20} /></div>
                  <div>
                    <div className="text-xs text-gray-400">{m.reference}</div>
                    <h3 className="font-semibold text-gray-900">{m.title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2"><Badge color={status.color}>{status.label}</Badge><ChevronRight size={18} className="text-gray-300" /></div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-navy-700 to-gold-500 transition-all" style={{ width: `${status.progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 mt-2"><span>Origination</span><span>Closing</span></div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
