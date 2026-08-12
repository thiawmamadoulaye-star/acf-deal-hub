import { useState, FormEvent, useMemo } from 'react'
import { X, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

interface InitialValues {
  fiscal_year?: number
  revenue?: number
  ebitda?: number
  net_income?: number
  total_debt?: number
  total_equity?: number
  cash_flow_operations?: number
}

interface Props {
  mandateId: string
  onClose: () => void
  onCreated: () => void
  initialValues?: InitialValues
  importSourceLabel?: string
}

export default function FinancialAnalysisFormModal({ mandateId, onClose, onCreated, initialValues, importSourceLabel }: Props) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    fiscal_year: String(initialValues?.fiscal_year ?? new Date().getFullYear() - 1),
    revenue: initialValues?.revenue ? String(initialValues.revenue) : '',
    ebitda: initialValues?.ebitda ? String(initialValues.ebitda) : '',
    net_income: initialValues?.net_income ? String(initialValues.net_income) : '',
    total_debt: initialValues?.total_debt ? String(initialValues.total_debt) : '',
    total_equity: initialValues?.total_equity ? String(initialValues.total_equity) : '',
    cash_flow_operations: initialValues?.cash_flow_operations ? String(initialValues.cash_flow_operations) : '',
    debt_service: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ratios = useMemo(() => {
    const revenue = Number(form.revenue) || 0
    const ebitda = Number(form.ebitda) || 0
    const netIncome = Number(form.net_income) || 0
    const totalDebt = Number(form.total_debt) || 0
    const totalEquity = Number(form.total_equity) || 0
    const cashFlow = Number(form.cash_flow_operations) || 0
    const debtService = Number(form.debt_service) || 0

    const dscr = debtService > 0 ? cashFlow / debtService : null
    const leverage = ebitda > 0 ? totalDebt / ebitda : null
    const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : null
    const totalAssets = totalDebt + totalEquity
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : null
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : null

    return { dscr, leverage, roe, roa, ebitdaMargin }
  }, [form])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('financial_analyses').insert({
      mandate_id: mandateId,
      fiscal_year: Number(form.fiscal_year),
      revenue: form.revenue ? Number(form.revenue) : null,
      ebitda: form.ebitda ? Number(form.ebitda) : null,
      net_income: form.net_income ? Number(form.net_income) : null,
      total_debt: form.total_debt ? Number(form.total_debt) : null,
      total_equity: form.total_equity ? Number(form.total_equity) : null,
      cash_flow_operations: form.cash_flow_operations ? Number(form.cash_flow_operations) : null,
      dscr: ratios.dscr,
      leverage_ratio: ratios.leverage,
      roe: ratios.roe,
      roa: ratios.roa,
      analyzed_by: profile?.id,
    })

    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouvelle analyse financière</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {importSourceLabel && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 mb-4">
            Champs pré-remplis automatiquement à partir de « {importSourceLabel} ». Vérifiez chaque valeur avant d'enregistrer.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercice fiscal *</label>
            <input required type="number" className="input-field max-w-[150px]" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiffre d'affaires (FCFA)</label>
              <input type="number" className="input-field" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">EBITDA (FCFA)</label>
              <input type="number" className="input-field" value={form.ebitda} onChange={(e) => setForm({ ...form, ebitda: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Résultat net (FCFA)</label>
              <input type="number" className="input-field" value={form.net_income} onChange={(e) => setForm({ ...form, net_income: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dette totale (FCFA)</label>
              <input type="number" className="input-field" value={form.total_debt} onChange={(e) => setForm({ ...form, total_debt: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capitaux propres (FCFA)</label>
              <input type="number" className="input-field" value={form.total_equity} onChange={(e) => setForm({ ...form, total_equity: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash-flow opérationnel (FCFA)</label>
              <input type="number" className="input-field" value={form.cash_flow_operations} onChange={(e) => setForm({ ...form, cash_flow_operations: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service de la dette annuel (FCFA)</label>
              <input type="number" className="input-field" value={form.debt_service} onChange={(e) => setForm({ ...form, debt_service: e.target.value })} />
              <p className="text-[11px] text-gray-400 mt-0.5">Utilisé uniquement pour calculer le DSCR</p>
            </div>
          </div>

          <div className="bg-navy-50 border border-navy-100 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-800 mb-3"><Sparkles size={16} /> Ratios calculés automatiquement</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div><div className="text-xs text-gray-500">DSCR</div><div className="font-bold text-navy-900">{ratios.dscr?.toFixed(2) ?? '—'}</div></div>
              <div><div className="text-xs text-gray-500">Leverage</div><div className="font-bold text-navy-900">{ratios.leverage?.toFixed(2) ?? '—'}x</div></div>
              <div><div className="text-xs text-gray-500">ROE</div><div className="font-bold text-navy-900">{ratios.roe?.toFixed(1) ?? '—'}%</div></div>
              <div><div className="text-xs text-gray-500">ROA</div><div className="font-bold text-navy-900">{ratios.roa?.toFixed(1) ?? '—'}%</div></div>
              <div><div className="text-xs text-gray-500">Marge EBITDA</div><div className="font-bold text-navy-900">{ratios.ebitdaMargin?.toFixed(1) ?? '—'}%</div></div>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enregistrement…' : "Enregistrer l'analyse"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
