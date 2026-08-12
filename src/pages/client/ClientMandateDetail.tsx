import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Download } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Mandate, DocumentRow } from '@/types/database'
import MandateMessaging from '@/components/shared/MandateMessaging'

export default function ClientMandateDetail() {
  const { id } = useParams()
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    const [{ data: m }, { data: docs }] = await Promise.all([
      supabase.from('mandates').select('*, client:companies(*)').eq('id', id).single(),
      supabase.from('documents').select('*').eq('mandate_id', id),
    ])
    setMandate(m as unknown as Mandate)
    setDocuments((docs as DocumentRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { if (id) loadData() }, [id])

  async function handleDownload(doc: DocumentRow) {
    const { data } = await supabase.storage.from('dataroom').createSignedUrl(doc.file_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  if (loading) return <div className="text-center text-gray-400 py-10">Chargement…</div>
  if (!mandate) return <div className="text-center text-gray-400 py-10">Mandat introuvable.</div>

  return (
    <div className="space-y-6">
      <Link to="/client/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm"><ArrowLeft size={16} /> Retour à mes mandats</Link>
      <div>
        <div className="text-xs text-gray-400">{mandate.reference}</div>
        <h2 className="text-xl font-bold text-gray-900">{mandate.title}</h2>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText size={18} /> Documents partagés ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun document partagé pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 text-sm text-gray-800"><FileText size={16} className="text-navy-600" />{d.filename}</div>
                <button onClick={() => handleDownload(d)} className="text-navy-700 hover:text-navy-900"><Download size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MandateMessaging mandateId={mandate.id} title="Messagerie sécurisée avec votre conseiller ACF" />
    </div>
  )
}
