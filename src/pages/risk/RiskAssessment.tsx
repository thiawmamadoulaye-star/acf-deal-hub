import { useEffect, useState } from 'react'
import { ShieldAlert, Plus } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import type { Mandate, RiskAssessment as RA } from '@/types/database'
import Badge from '@/components/ui/Badge'
import RiskAssessmentFormModal from './RiskAssessmentFormModal'

function riskLevelFromScore(avg: number): { label: string; color: 'green' | 'yellow' | 'red' } {
  if (avg <= 30) return { label: 'Faible', color: 'green' }
  if (avg <= 60) return { label: 'Modéré', color: 'yellow' }
  return { label: 'Élevé', color: 'red' }
}

export default function RiskAssessment() {
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [selectedMandate, setSelectedMandate] = useState('')
  const [assessments, setAssessments] = useState<RA[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    supabase.from('mandates').select('*').order('title').then(({ data }) => {
      setMandates((data as Mandate[]) ?? [])
      if (data && data.length > 0) setSelectedMandate((data as Mandate[])[0].id)
    })
  }, [])

  async function loadAssessments(mandateId: string) {
    setLoading(true)
    const { data, error } = await supabase.from('risk_assessments').select('*').eq('mandate_id', mandateId).order('assessed_at', { ascending: false })
    if (!error && data) setAssessments(data as RA[])
    setLoading(false)
  }

  useEffect(() => { if (selectedMandate) loadAssessments(selectedMandate) }, [selectedMandate])

  const latest = assessments[0]
  const scores = latest ? [latest.credit_risk_score ?? 0, latest.operational_risk_score ?? 0, latest.regulatory_risk_score ?? 0, latest.country_risk_score ?? 0] : []
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const overallRisk = latest ? riskLevelFromScore(avgScore) : null

  const radarData = latest ? [
    { risk: 'Crédit', score: latest.credit_risk_score ?? 0 },
    { risk: 'Opérationnel', score: latest.operational_risk_score ?? 0 },
    { risk: 'Réglementaire', score: latest.regulatory_risk_score ?? 0 },
    { risk: 'Pays', score: latest.country_risk_score ?? 0 },
  ] : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notation des Risques</h2>
          <p className="text-gray-500 text-sm mt-0.5">Évaluation multi-critères par mandat (score sur 100 — plus élevé = plus risqué)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouvelle évaluation</button>
      </div>

      <div className="max-w-sm">
        <select className="input-field" value={selectedMandate} onChange={(e) => setSelectedMandate(e.target.value)}>
          {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Chargement…</div>
      ) : !latest ? (
        <div className="card text-center py-10">
          <ShieldAlert size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune évaluation de risque pour ce mandat.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Score global de risque</h3>
                {overallRisk && <Badge color={overallRisk.color}>{overallRisk.label}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ScoreBox label="Risque Crédit" value={latest.credit_risk_score} />
                <ScoreBox label="Risque Opérationnel" value={latest.operational_risk_score} />
                <ScoreBox label="Risque Réglementaire" value={latest.regulatory_risk_score} />
                <ScoreBox label="Risque Pays" value={latest.country_risk_score} />
              </div>
              {latest.comments && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Commentaire de l'analyste : </span>{latest.comments}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Cartographie des risques</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="risk" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#1f3363" fill="#1f3363" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {assessments.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Historique des évaluations</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Crédit</th><th className="pb-2 font-medium">Opérationnel</th>
                    <th className="pb-2 font-medium">Réglementaire</th><th className="pb-2 font-medium">Pays</th><th className="pb-2 font-medium">Niveau global</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => {
                    const s = [a.credit_risk_score, a.operational_risk_score, a.regulatory_risk_score, a.country_risk_score].filter((v): v is number => v !== null)
                    const avg = s.length ? s.reduce((x, y) => x + y, 0) / s.length : 0
                    const level = riskLevelFromScore(avg)
                    return (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="py-2">{new Date(a.assessed_at).toLocaleDateString('fr-FR')}</td>
                        <td className="py-2">{a.credit_risk_score ?? '—'}</td>
                        <td className="py-2">{a.operational_risk_score ?? '—'}</td>
                        <td className="py-2">{a.regulatory_risk_score ?? '—'}</td>
                        <td className="py-2">{a.country_risk_score ?? '—'}</td>
                        <td className="py-2"><Badge color={level.color}>{level.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && (
        <RiskAssessmentFormModal mandateId={selectedMandate} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadAssessments(selectedMandate) }} />
      )}
    </div>
  )
}

function ScoreBox({ label, value }: { label: string; value: number | null }) {
  const level = value !== null ? riskLevelFromScore(value) : null
  return (
    <div className="border border-gray-100 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      {level && <Badge color={level.color}>{level.label}</Badge>}
    </div>
  )
}
