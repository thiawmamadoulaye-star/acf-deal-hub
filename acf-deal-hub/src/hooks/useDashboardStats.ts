import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface DashboardStats {
  activeMandates: number
  totalPipelineValue: number
  activeInvestors: number
  closingRate: number
  pipelineByStage: { stage: string; count: number; value: number }[]
  mandatesBySector: { sector: string; count: number }[]
  loading: boolean
}

const STAGE_LABELS: Record<string, string> = {
  origination: 'Origination', qualification: 'Qualification', mandate_signed: 'Mandat signé',
  analysis: 'Analyse', structuring: 'Structuration', due_diligence: 'Due Diligence',
  negotiation: 'Négociation', term_sheet: 'Term Sheet', closing: 'Closing',
  post_closing: 'Post Closing', lost: 'Perdu',
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    activeMandates: 0, totalPipelineValue: 0, activeInvestors: 0, closingRate: 0,
    pipelineByStage: [], mandatesBySector: [], loading: true,
  })

  useEffect(() => {
    async function fetchStats() {
      try {
        const [mandatesRes, dealsRes, investorsRes] = await Promise.all([
          supabase.from('mandates').select('id, status, sector'),
          supabase.from('deals').select('id, stage, deal_value'),
          supabase.from('investors').select('id').eq('is_active', true),
        ])

        const mandates = mandatesRes.data ?? []
        const deals = dealsRes.data ?? []
        const investors = investorsRes.data ?? []

        const activeMandates = mandates.filter((m: any) => !['closed_won', 'closed_lost'].includes(m.status)).length
        const totalPipelineValue = deals.reduce((sum: number, d: any) => sum + (d.deal_value ?? 0), 0)
        const closedWon = mandates.filter((m: any) => m.status === 'closed_won').length
        const closedTotal = mandates.filter((m: any) => ['closed_won', 'closed_lost'].includes(m.status)).length
        const closingRate = closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0

        const stageMap = new Map<string, { count: number; value: number }>()
        deals.forEach((d: any) => {
          const key = d.stage
          const current = stageMap.get(key) ?? { count: 0, value: 0 }
          stageMap.set(key, { count: current.count + 1, value: current.value + (d.deal_value ?? 0) })
        })
        const pipelineByStage = Array.from(stageMap.entries()).map(([stage, v]) => ({ stage: STAGE_LABELS[stage] ?? stage, count: v.count, value: v.value }))

        const sectorMap = new Map<string, number>()
        mandates.forEach((m: any) => {
          const key = m.sector ?? 'Non spécifié'
          sectorMap.set(key, (sectorMap.get(key) ?? 0) + 1)
        })
        const mandatesBySector = Array.from(sectorMap.entries()).map(([sector, count]) => ({ sector, count }))

        setStats({ activeMandates, totalPipelineValue, activeInvestors: investors.length, closingRate, pipelineByStage, mandatesBySector, loading: false })
      } catch (err) {
        console.error('Erreur chargement dashboard:', err)
        setStats((prev) => ({ ...prev, loading: false }))
      }
    }
    fetchStats()
  }, [])

  return stats
}
