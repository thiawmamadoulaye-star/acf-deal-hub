import { useEffect, useState } from 'react'
import { FileSignature, Plus, Copy, Check, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { SignatureRequest, SignatureStatus } from '@/types/database'
import Badge from '@/components/ui/Badge'
import NewSignatureRequestModal from './NewSignatureRequestModal'

const statusConfig: Record<SignatureStatus, { label: string; color: 'gray' | 'blue' | 'green' | 'red' | 'gold' }> = {
  pending: { label: 'En attente', color: 'gold' }, signed: { label: 'Signé', color: 'green' },
  declined: { label: 'Refusé', color: 'red' }, expired: { label: 'Expiré', color: 'gray' }, cancelled: { label: 'Annulé', color: 'gray' },
}
const typeLabels: Record<string, string> = { nda: 'NDA', term_sheet: 'Term Sheet', mandate_letter: 'Lettre de mission', other: 'Autre document' }

export default function SignatureRequests() {
  const [requests, setRequests] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function loadRequests() {
    setLoading(true)
    const { data, error } = await supabase.from('signature_requests').select('*, mandate:mandates(reference, title)').order('created_at', { ascending: false })
    if (!error && data) setRequests(data as unknown as SignatureRequest[])
    setLoading(false)
  }

  useEffect(() => { loadRequests() }, [])

  function copyLink(request: SignatureRequest) {
    const link = `${window.location.origin}/sign/${request.access_token}`
    navigator.clipboard.writeText(link)
    setCopiedId(request.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Signature Électronique</h2>
          <p className="text-gray-500 text-sm mt-0.5">Term Sheets, NDA et lettres de mission — suivi des signatures en cours</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouvelle demande</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Document</th><th className="pb-3 font-medium">Mandat</th><th className="pb-3 font-medium">Signataire</th>
              <th className="pb-3 font-medium">Statut</th><th className="pb-3 font-medium">Échéance</th><th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && requests.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Aucune demande de signature créée.</td></tr>}
            {requests.map((r) => {
              const status = statusConfig[r.status]
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3">
                    <div className="flex items-center gap-2 font-medium text-gray-900"><FileSignature size={16} className="text-navy-600" />{r.title}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      {typeLabels[r.document_type] ?? r.document_type}
                      <span className="text-gray-300">•</span>
                      <Badge color={r.provider === 'yousign' ? 'gold' : 'gray'}>{r.provider === 'yousign' ? 'Yousign' : 'Natif'}</Badge>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">{(r as any).mandate?.reference ?? '—'}</td>
                  <td className="py-3 text-gray-600">{r.signatory_name}<div className="text-xs text-gray-400">{r.signatory_email}</div></td>
                  <td className="py-3"><Badge color={status.color}>{status.label}</Badge></td>
                  <td className="py-3 text-gray-500">{new Date(r.expires_at).toLocaleDateString('fr-FR')}</td>
                  <td className="py-3 text-right">
                    {r.status === 'pending' && r.provider === 'native' && (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => copyLink(r)} className="text-xs text-navy-700 hover:text-navy-900 flex items-center gap-1">
                          {copiedId === r.id ? <Check size={14} /> : <Copy size={14} />}{copiedId === r.id ? 'Copié' : 'Copier le lien'}
                        </button>
                        <a href={`/sign/${r.access_token}`} target="_blank" rel="noreferrer" className="text-navy-700 hover:text-navy-900"><ExternalLink size={14} /></a>
                      </div>
                    )}
                    {r.status === 'pending' && r.provider === 'yousign' && <span className="text-xs text-gray-400">Géré par Yousign</span>}
                    {r.status === 'signed' && r.signed_at && <span className="text-xs text-gray-400">Signé le {new Date(r.signed_at).toLocaleDateString('fr-FR')}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && <NewSignatureRequestModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadRequests() }} />}
    </div>
  )
}
