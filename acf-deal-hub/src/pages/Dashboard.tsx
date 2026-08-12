import { Briefcase, TrendingUp, Landmark, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import StatCard from '@/components/ui/StatCard'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAuth } from '@/contexts/AuthContext'

const COLORS = ['#1f3363', '#d49a1e', '#3d5da0', '#eecb57', '#152447', '#e6b52f', '#89a2d2']

function formatFCFA(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds FCFA`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} M FCFA`
  return `${value.toLocaleString('fr-FR')} FCFA`
}

export default function Dashboard() {
  const { profile } = useAuth()
  const stats = useDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bonjour {profile?.first_name ?? ''} 👋</h2>
        <p className="text-gray-500 text-sm mt-0.5">Voici la vue d'ensemble de l'activité ACF DEAL HUB</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Mandats actifs" value={stats.loading ? '—' : String(stats.activeMandates)} icon={Briefcase} accent="navy" />
        <StatCard label="Valeur du pipeline" value={stats.loading ? '—' : formatFCFA(stats.totalPipelineValue)} icon={TrendingUp} accent="gold" />
        <StatCard label="Investisseurs actifs" value={stats.loading ? '—' : String(stats.activeInvestors)} icon={Landmark} accent="navy" />
        <StatCard label="Taux de closing" value={stats.loading ? '—' : `${stats.closingRate}%`} icon={Target} accent="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline par étape</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.pipelineByStage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1f3363" radius={[4, 4, 0, 0]} name="Nombre de deals" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Répartition sectorielle des mandats</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stats.mandatesBySector} dataKey="count" nameKey="sector" cx="50%" cy="50%" outerRadius={100} label={(entry) => entry.sector}>
                {stats.mandatesBySector.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!stats.loading && stats.pipelineByStage.length === 0 && (
        <div className="card text-center text-gray-500 text-sm py-8">
          Aucune donnée disponible. Commencez par créer votre premier mandat et les deals associés.
        </div>
      )}
    </div>
  )
}
