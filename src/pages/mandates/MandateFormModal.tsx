import { useEffect, useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Company } from '@/types/database'

interface Props { onClose: () => void; onCreated: () => void }

export default function MandateFormModal({ onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState({ title: '', client_id: '', mandate_type: 'project_finance', amount_requested: '', success_fee_rate: '', target_close_date: '', sector: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { supabase.from('companies').select('*').order('name').then(({ data }) => setCompanies((data as Company[]) ?? [])) }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('mandates').insert({
      organization_id: profile?.organization_id, title: form.title, client_id: form.client_id, mandate_type: form.mandate_type,
      amount_requested: form.amount_requested ? Number(form.amount_requested) : null,
      success_fee_rate: form.success_fee_rate ? Number(form.success_fee_rate) : null,
      target_close_date: form.target_close_date || null, sector: form.sector || null, description: form.description || null,
      status: 'draft', owner_id: profile?.id, created_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouveau mandat</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du mandat *</label>
            <input required className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Financement centrale solaire 30MW" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select required className="input-field" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Sélectionner un client…</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de mandat</label>
            <select className="input-field" value={form.mandate_type} onChange={(e) => setForm({ ...form, mandate_type: e.target.value })}>
              <option value="debt_raising">Levée de dette</option><option value="equity_raising">Levée de fonds propres</option>
              <option value="project_finance">Project Finance</option><option value="restructuring">Restructuration</option>
              <option value="ma_advisory">M&A Advisory</option><option value="strategy_advisory">Conseil en stratégie</option><option value="other">Autre</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant recherché (FCFA)</label>
              <input type="number" className="input-field" value={form.amount_requested} onChange={(e) => setForm({ ...form, amount_requested: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Success fee (%)</label>
              <input type="number" step="0.1" className="input-field" value={form.success_fee_rate} onChange={(e) => setForm({ ...form, success_fee_rate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
              <input className="input-field" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing visé</label>
              <input type="date" className="input-field" value={form.target_close_date} onChange={(e) => setForm({ ...form, target_close_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enregistrement…' : 'Créer le mandat'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
