import { useEffect, useState } from 'react'
import { Building2, Briefcase, TrendingUp, Wallet, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { ConsolidatedGroupStat } from '@/types/database'
import StatCard from '@/components/ui/StatCard'

function formatFCFA(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds FCFA`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} M FCFA`
  return `${value.toLocaleString('fr-FR')} FCFA`
}

export default function GroupDashboard() {
  const { profile } = useAuth()
  const [groupId, setGroupId] = useState<string | null>(null)
  const [stats, setStats] = useState<ConsolidatedGroupStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!profile?.organization_id) { setLoading(false); return }

      const { data: org } = await supabase.from('organizations').select('group_id').eq('id', profile.organization_id).single()

      if (!org?.group_id) { setLoading(false); return }
      setGroupId(org.group_id)

      const { data, error: rpcError } = await supabase.rpc('get_consolidated_group_stats', { p_group_id: org.group_id })

      if (rpcError) setError(rpcError.message)
      else setStats((data as ConsolidatedGroupStat[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profile?.organization_id])

  if (!profile?.is_group_admin) {
    return (
      <div className="card text-center py-10 text-gray-500 flex flex-col items-center gap-3">
        <AlertCircle size={28} className="text-amber-500" />
        Cette vue consolidée est réservée aux administrateurs de groupe.
      </div>
    )
  }

  if (loading) return <div className="text-center text-gray-400 py-10">Chargement…</div>

  if (!groupId) {
    return (
      <div className="card text-center py-10 text-gray-500">
        Votre organisation n'est rattachée à aucun groupe. Créez un enregistrement dans <code>organization_groups</code>.
      </div>
    )
  }

  if (error) {
    return <div className="card text-center py-10 text-red-500">Erreur lors du chargement des statistiques consolidées : {error}</div>
  }

  const totalMandates = stats.reduce((s, o) => s + Number(o.active_mandates), 0)
  const totalPipeline = stats.reduce((s, o) => s + Number(o.total_pipeline_value), 0)
  const totalInvoiced = stats.reduce((s, o) => s + Number(o.total_invoiced), 0)
  const totalCollected = stats.reduce((s, o) => s + Number(o.total_collected), 0)

  const chartData = stats.map((o) => ({
    name: o.organization_name,
    'Pipeline (Mds)': +(Number(o.total_pipeline_value) / 1_000_000_000).toFixed(2),
    'Facturé (Mds)': +(Number(o.total_invoiced) / 1_000_000_000).toFixed(2),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tableau de Bord Consolidé — Groupe</h2>
        <p className="text-gray-500 text-sm mt-0.5">Vue agrégée de toutes les organisations du groupe ({stats.length} entité(s))</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Mandats actifs (groupe)" value={String(totalMandates)} icon={Briefcase} accent="navy" />
        <StatCard label="Pipeline total" value={formatFCFA(totalPipeline)} icon={TrendingUp} accent="gold" />
        <StatCard label="Total facturé" value={formatFCFA(totalInvoiced)} icon={Wallet} accent="navy" />
        <StatCard label="Total encaissé" value={formatFCFA(totalCollected)} icon={Building2} accent="gold" />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Comparatif par organisation</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Pipeline (Mds)" fill="#1f3363" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Facturé (Mds)" fill="#d49a1e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Organisation</th><th className="pb-3 font-medium">Mandats actifs</th>
              <th className="pb-3 font-medium">Pipeline</th><th className="pb-3 font-medium">Facturé</th><th className="pb-3 font-medium">Encaissé</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((o) => (
              <tr key={o.organization_id} className="border-b border-gray-50">
                <td className="py-3 font-medium text-gray-900">{o.organization_name}</td>
                <td className="py-3 text-gray-600">{o.active_mandates}</td>
                <td className="py-3 text-gray-600">{formatFCFA(Number(o.total_pipeline_value))}</td>
                <td className="py-3 text-gray-600">{formatFCFA(Number(o.total_invoiced))}</td>
                <td className="py-3 text-gray-600">{formatFCFA(Number(o.total_collected))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
