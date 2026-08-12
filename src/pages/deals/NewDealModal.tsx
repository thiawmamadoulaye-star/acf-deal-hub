import { useEffect, useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate } from '@/types/database'

interface Props { onClose: () => void; onCreated: () => void }

export default function NewDealModal({ onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [form, setForm] = useState({ mandate_id: '', deal_name: '', deal_value: '', probability: '20', expected_close_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { supabase.from('mandates').select('*').order('created_at', { ascending: false }).then(({ data }) => setMandates((data as Mandate[]) ?? [])) }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('deals').insert({
      organization_id: profile?.organization_id, mandate_id: form.mandate_id, deal_name: form.deal_name,
      deal_value: form.deal_value ? Number(form.deal_value) : null, probability: Number(form.probability),
      expected_close_date: form.expected_close_date || null, stage: 'origination', owner_id: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouveau deal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mandat associé *</label>
            <select required className="input-field" value={form.mandate_id} onChange={(e) => setForm({ ...form, mandate_id: e.target.value })}>
              <option value="">Sélectionner un mandat…</option>
              {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du deal *</label>
            <input required className="input-field" value={form.deal_name} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} placeholder="Ex: Financement bancaire syndiqué" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valeur (FCFA)</label>
              <input type="number" className="input-field" value={form.deal_value} onChange={(e) => setForm({ ...form, deal_value: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probabilité (%)</label>
              <input type="number" min={0} max={100} className="input-field" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de closing prévue</label>
            <input type="date" className="input-field" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enregistrement…' : 'Créer le deal'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
