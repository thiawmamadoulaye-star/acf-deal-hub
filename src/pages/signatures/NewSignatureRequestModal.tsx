import { useEffect, useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate } from '@/types/database'

interface Props { onClose: () => void; onCreated: () => void }

export default function NewSignatureRequestModal({ onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [form, setForm] = useState({
    mandate_id: '', title: '', document_type: 'term_sheet', signatory_name: '', signatory_email: '',
    signatory_company: '', provider: 'native' as 'native' | 'yousign', document_id: '',
  })
  const [documents, setDocuments] = useState<{ id: string; filename: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { supabase.from('mandates').select('*').order('title').then(({ data }) => setMandates((data as Mandate[]) ?? [])) }, [])

  useEffect(() => {
    if (!form.mandate_id) { setDocuments([]); return }
    supabase.from('documents').select('id, filename').eq('mandate_id', form.mandate_id).then(({ data }) => setDocuments((data as { id: string; filename: string }[]) ?? []))
  }, [form.mandate_id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (form.provider === 'yousign' && !form.document_id) {
      setError('Sélectionnez un document de la Data Room pour une signature Yousign qualifiée.')
      setSaving(false)
      return
    }

    const { data: inserted, error } = await supabase.from('signature_requests').insert({
      organization_id: profile?.organization_id, mandate_id: form.mandate_id || null, document_id: form.document_id || null,
      title: form.title, document_type: form.document_type, signatory_name: form.signatory_name,
      signatory_email: form.signatory_email, signatory_company: form.signatory_company || null,
      provider: form.provider, created_by: profile?.id,
    }).select().single()

    if (error || !inserted) { setSaving(false); setError(error?.message ?? 'Erreur inconnue.'); return }

    if (form.provider === 'yousign') {
      const { data: ysResult, error: ysError } = await supabase.functions.invoke('yousign-create-signature', { body: { signatureRequestId: inserted.id } })
      if (ysError || !ysResult?.success) {
        setSaving(false)
        setError(`Demande créée localement, mais la procédure Yousign a échoué : ${ysResult?.error ?? ysError?.message ?? 'erreur inconnue'}.`)
        return
      }
    } else {
      const link = `${window.location.origin}/sign/${inserted.access_token}`
      await supabase.functions.invoke('send-notification-email', {
        body: { template: 'signature_request', organizationId: profile?.organization_id, toEmail: form.signatory_email, data: { signatoryName: form.signatory_name, title: form.title, link } },
      })
    }

    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Nouvelle demande de signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre du document *</label>
            <input required className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Term Sheet - Financement" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
              <select className="input-field" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                <option value="term_sheet">Term Sheet</option><option value="nda">NDA</option><option value="mandate_letter">Lettre de mission</option><option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mandat lié</label>
              <select className="input-field" value={form.mandate_id} onChange={(e) => setForm({ ...form, mandate_id: e.target.value, document_id: '' })}>
                <option value="">Aucun</option>
                {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Prestataire de signature</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setForm({ ...form, provider: 'native' })} className={`text-left border rounded-lg px-3 py-2.5 text-sm ${form.provider === 'native' ? 'border-navy-700 bg-navy-50' : 'border-gray-200'}`}>
                <div className="font-medium text-gray-900">Signature native</div>
                <div className="text-xs text-gray-500 mt-0.5">Lien interne, dessin manuscrit</div>
              </button>
              <button type="button" onClick={() => setForm({ ...form, provider: 'yousign' })} className={`text-left border rounded-lg px-3 py-2.5 text-sm ${form.provider === 'yousign' ? 'border-navy-700 bg-navy-50' : 'border-gray-200'}`}>
                <div className="font-medium text-gray-900">Yousign (qualifiée)</div>
                <div className="text-xs text-gray-500 mt-0.5">Valeur légale eIDAS renforcée</div>
              </button>
            </div>
            {form.provider === 'yousign' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document à signer (Data Room) *</label>
                <select className="input-field" value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} disabled={!form.mandate_id}>
                  <option value="">{form.mandate_id ? 'Sélectionner un document…' : "Choisissez d'abord un mandat"}</option>
                  {documents.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Le document doit contenir "SIGNATURE_ICI" à l'emplacement souhaité.</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Informations du signataire</h4>
            <div className="space-y-3">
              <input required className="input-field" placeholder="Nom complet du signataire *" value={form.signatory_name} onChange={(e) => setForm({ ...form, signatory_name: e.target.value })} />
              <input required type="email" className="input-field" placeholder="Email du signataire *" value={form.signatory_email} onChange={(e) => setForm({ ...form, signatory_email: e.target.value })} />
              <input className="input-field" placeholder="Société (optionnel)" value={form.signatory_company} onChange={(e) => setForm({ ...form, signatory_company: e.target.value })} />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-xs text-navy-700">
            {form.provider === 'native' ? "Un email contenant le lien de signature sera envoyé automatiquement (si configuré)." : 'Yousign enverra directement son propre email de signature qualifiée.'}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">{saving ? 'Création…' : 'Créer la demande'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
