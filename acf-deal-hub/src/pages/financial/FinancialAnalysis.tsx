import { useEffect, useState } from 'react'
import { Calculator, Plus, TrendingUp, AlertCircle, Upload } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import type { Mandate, FinancialAnalysis as FA } from '@/types/database'
import FinancialAnalysisFormModal from './FinancialAnalysisFormModal'
import ImportFinancialModal from '../import/ImportFinancialModal'

function ratioColor(value: number | null, good: number, warn: number, higherIsBetter = true) {
  if (value === null) return 'text-gray-400'
  if (higherIsBetter) {
    if (value >= good) return 'text-emerald-600'
    if (value >= warn) return 'text-amber-600'
    return 'text-red-600'
  } else {
    if (value <= good) return 'text-emerald-600'
    if (value <= warn) return 'text-amber-600'
    return 'text-red-600'
  }
}

export default function FinancialAnalysis() {
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [selectedMandate, setSelectedMandate] = useState('')
  const [analyses, setAnalyses] = useState<FA[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    supabase.from('mandates').select('*').order('title').then(({ data }) => {
      setMandates((data as Mandate[]) ?? [])
      if (data && data.length > 0) setSelectedMandate((data as Mandate[])[0].id)
    })
  }, [])

  async function loadAnalyses(mandateId: string) {
    setLoading(true)
    const { data, error } = await supabase.from('financial_analyses').select('*').eq('mandate_id', mandateId).order('fiscal_year')
    if (!error && data) setAnalyses(data as FA[])
    setLoading(false)
  }

  useEffect(() => { if (selectedMandate) loadAnalyses(selectedMandate) }, [selectedMandate])

  const latest = analyses[analyses.length - 1]
  const chartData = analyses.map((a) => ({
    year: a.fiscal_year,
    'CA (Mds)': a.revenue ? +(a.revenue / 1_000_000_000).toFixed(2) : null,
    'EBITDA (Mds)': a.ebitda ? +(a.ebitda / 1_000_000_000).toFixed(2) : null,
    'Résultat net (Mds)': a.net_income ? +(a.net_income / 1_000_000_000).toFixed(2) : null,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analyse Financière</h2>
          <p className="text-gray-500 text-sm mt-0.5">Ratios financiers calculés automatiquement par mandat</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn-gold flex items-center gap-2"><Upload size={16} /> Importer Excel/PDF</button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Saisie manuelle</button>
        </div>
      </div>

      <div className="max-w-sm">
        <select className="input-field" value={selectedMandate} onChange={(e) => setSelectedMandate(e.target.value)}>
          {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Chargement…</div>
      ) : analyses.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">Aucune analyse financière pour ce mandat.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">DSCR</div>
              <div className={`text-xl font-bold ${ratioColor(latest?.dscr ?? null, 1.5, 1.2)}`}>{latest?.dscr?.toFixed(2) ?? '—'}</div>
              <div className="text-[10px] text-gray-400 mt-1">Seuil bancaire ≥ 1.2</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Leverage</div>
              <div className={`text-xl font-bold ${ratioColor(latest?.leverage_ratio ?? null, 2, 3.5, false)}`}>{latest?.leverage_ratio?.toFixed(2) ?? '—'}x</div>
              <div className="text-[10px] text-gray-400 mt-1">Dette / EBITDA</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">ROE</div>
              <div className={`text-xl font-bold ${ratioColor(latest?.roe ?? null, 15, 8)}`}>{latest?.roe?.toFixed(1) ?? '—'}%</div>
              <div className="text-[10px] text-gray-400 mt-1">Rentabilité capitaux propres</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">ROA</div>
              <div className={`text-xl font-bold ${ratioColor(latest?.roa ?? null, 8, 4)}`}>{latest?.roa?.toFixed(1) ?? '—'}%</div>
              <div className="text-[10px] text-gray-400 mt-1">Rentabilité des actifs</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">Marge EBITDA</div>
              <div className={`text-xl font-bold ${ratioColor(latest?.ebitda && latest?.revenue ? (latest.ebitda / latest.revenue) * 100 : null, 20, 10)}`}>
                {latest?.ebitda && latest?.revenue ? `${((latest.ebitda / latest.revenue) * 100).toFixed(1)}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">EBITDA / CA</div>
            </div>
          </div>

          {(latest?.dscr && latest.dscr < 1.2) || (latest?.leverage_ratio && latest.leverage_ratio > 3.5) ? (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>Points de vigilance détectés : {latest.dscr && latest.dscr < 1.2 ? 'DSCR sous le seuil bancaire usuel (1.2). ' : ''}
                {latest.leverage_ratio && latest.leverage_ratio > 3.5 ? "Niveau d'endettement élevé (Dette/EBITDA > 3.5x)." : ''}
              </span>
            </div>
          ) : null}

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Évolution financière (Mds FCFA)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="CA (Mds)" stroke="#1f3363" strokeWidth={2} />
                <Line type="monotone" dataKey="EBITDA (Mds)" stroke="#d49a1e" strokeWidth={2} />
                <Line type="monotone" dataKey="Résultat net (Mds)" stroke="#3d5da0" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-x-auto">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator size={18} /> Détail par exercice</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Exercice</th><th className="pb-2 font-medium">CA</th><th className="pb-2 font-medium">EBITDA</th>
                  <th className="pb-2 font-medium">Résultat net</th><th className="pb-2 font-medium">Dette totale</th>
                  <th className="pb-2 font-medium">DSCR</th><th className="pb-2 font-medium">Leverage</th><th className="pb-2 font-medium">ROE</th><th className="pb-2 font-medium">ROA</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{a.fiscal_year}</td>
                    <td className="py-2 text-gray-600">{a.revenue ? `${(a.revenue / 1_000_000_000).toFixed(2)} Mds` : '—'}</td>
                    <td className="py-2 text-gray-600">{a.ebitda ? `${(a.ebitda / 1_000_000_000).toFixed(2)} Mds` : '—'}</td>
                    <td className="py-2 text-gray-600">{a.net_income ? `${(a.net_income / 1_000_000_000).toFixed(2)} Mds` : '—'}</td>
                    <td className="py-2 text-gray-600">{a.total_debt ? `${(a.total_debt / 1_000_000_000).toFixed(2)} Mds` : '—'}</td>
                    <td className={`py-2 font-medium ${ratioColor(a.dscr, 1.5, 1.2)}`}>{a.dscr?.toFixed(2) ?? '—'}</td>
                    <td className={`py-2 font-medium ${ratioColor(a.leverage_ratio, 2, 3.5, false)}`}>{a.leverage_ratio?.toFixed(2) ?? '—'}x</td>
                    <td className={`py-2 font-medium ${ratioColor(a.roe, 15, 8)}`}>{a.roe?.toFixed(1) ?? '—'}%</td>
                    <td className={`py-2 font-medium ${ratioColor(a.roa, 8, 4)}`}>{a.roa?.toFixed(1) ?? '—'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <FinancialAnalysisFormModal mandateId={selectedMandate} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadAnalyses(selectedMandate) }} />
      )}

      {showImportModal && (
        <ImportFinancialModal mandateId={selectedMandate} onClose={() => setShowImportModal(false)} onCreated={() => { setShowImportModal(false); loadAnalyses(selectedMandate) }} />
      )}
    </div>
  )
}
