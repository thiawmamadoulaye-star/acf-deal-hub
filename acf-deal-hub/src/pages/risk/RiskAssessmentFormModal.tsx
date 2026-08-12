import { useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

interface Props { mandateId: string; onClose: () => void; onCreated: () => void }

function riskLevel(avg: number) {
  if (avg <= 30) return 'Low'
  if (avg <= 60) return 'Medium'
  return 'High'
}

export default function RiskAssessmentFormModal({ mandateId, onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ credit_risk_score: '30', operational_risk_score: '30', regulatory_risk_score: '30', country_risk_score: '30', comments: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const scores = [Number(form.credit_risk_score), Number(form.operational_risk_score), Number(form.regulatory_risk_score), Number(form.country_risk_score)]
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const { error } = await supabase.from('risk_assessments').insert({
      mandate_id: mandateId, credit_risk_score: scores[0], operational_risk_score: scores[1],
      regulatory_risk_score: scores[2], country_risk_score: scores[3], overall_risk_level: riskLevel(avg),
      comments: form.comments || null, assessed_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
  }

  const sliderFields = [
    { key: 'credit_risk_score', label: 'Risque de Crédit' }, { key: 'operational_risk_score', label: 'Risque Opérationnel' },
    { key: 'regulatory_risk_score', label: 'Risque Réglementaire' }, { key: 'country_risk_score', label: 'Risque Pays' },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouvelle évaluation de risque</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {sliderFields.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{f.label}</label>
                <span className="text-sm font-bold text-navy-800">{form[f.key]}/100</span>
              </div>
              <input type="range" min={0} max={100} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full accent-navy-700" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire de l'analyste</label>
            <textarea className="input-field" rows={3} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enregistrement…' : "Enregistrer l'évaluation"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
