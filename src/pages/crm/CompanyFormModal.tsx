import { useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'

interface Props { onClose: () => void; onCreated: () => void }

export default function CompanyFormModal({ onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ name: '', company_type: 'client', sector: '', country: 'Sénégal', city: '', annual_revenue: '', status: 'prospect' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('companies').insert({
      organization_id: profile?.organization_id, name: form.name, company_type: form.company_type,
      sector: form.sector || null, country: form.country, city: form.city || null,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null, status: form.status, created_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouvelle entreprise</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
            <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: SICAP SA" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select className="input-field" value={form.company_type} onChange={(e) => setForm({ ...form, company_type: e.target.value })}>
                <option value="client">Client</option><option value="target">Cible</option><option value="partner">Partenaire</option><option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="prospect">Prospect</option><option value="active">Actif</option><option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
            <input className="input-field" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Énergie, Immobilier…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <input className="input-field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chiffre d'affaires annuel (FCFA)</label>
            <input type="number" className="input-field" value={form.annual_revenue} onChange={(e) => setForm({ ...form, annual_revenue: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enregistrement…' : "Créer l'entreprise"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
