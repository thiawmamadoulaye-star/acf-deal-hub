import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  accent?: 'navy' | 'gold'
}

export default function StatCard({ label, value, icon: Icon, trend, trendUp, accent = 'navy' }: StatCardProps) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <div className="text-sm text-gray-500 mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className={`text-xs mt-1 font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accent === 'gold' ? 'bg-gold-100 text-gold-700' : 'bg-navy-100 text-navy-700'}`}>
        <Icon size={22} />
      </div>
    </div>
  )
}
