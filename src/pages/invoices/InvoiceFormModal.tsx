import { useEffect, useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate } from '@/types/database'

interface Props { onClose: () => void; onCreated: () => void }

function generateInvoiceNumber() {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ACF-FACT-${year}-${rand}`
}

export default function InvoiceFormModal({ onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [form, setForm] = useState({ mandate_id: '', invoice_type: 'success_fee', amount: '', due_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { supabase.from('mandates').select('*').order('created_at', { ascending: false }).then(({ data }) => setMandates((data as Mandate[]) ?? [])) }, [])

  useEffect(() => {
    if (form.invoice_type !== 'success_fee' || !form.mandate_id) return
    const mandate = mandates.find((m) => m.id === form.mandate_id)
    if (mandate?.amount_requested && mandate?.success_fee_rate) {
      const suggested = (mandate.amount_requested * mandate.success_fee_rate) / 100
      setForm((f) => ({ ...f, amount: String(Math.round(suggested)) }))
    }
  }, [form.mandate_id, form.invoice_type, mandates])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('invoices').insert({
      organization_id: profile?.organization_id, mandate_id: form.mandate_id, invoice_number: generateInvoiceNumber(),
      invoice_type: form.invoice_type, amount: Number(form.amount), due_date: form.due_date || null,
      notes: form.notes || null, status: 'draft', created_by: profile?.id,
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    onCreated()
  }

  const selectedMandate = mandates.find((m) => m.id === form.mandate_id)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouvelle facture</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mandat *</label>
            <select required className="input-field" value={form.mandate_id} onChange={(e) => setForm({ ...form, mandate_id: e.target.value })}>
              <option value="">Sélectionner un mandat…</option>
              {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
            </select>
            {selectedMandate?.success_fee_rate && <p className="text-xs text-gray-400 mt-1">Success fee contractuel : {selectedMandate.success_fee_rate}% du montant recherché</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de facture</label>
            <select className="input-field" value={form.invoice_type} onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}>
              <option value="retainer">Retainer</option><option value="success_fee">Success Fee</option><option value="expense">Frais</option><option value="other">Autre</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
              <input required type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
              <input type="date" className="input-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Enregistrement…' : 'Créer la facture'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
