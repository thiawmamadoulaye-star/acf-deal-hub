import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import type { Mandate, DocumentRow } from '@/types/database'
import Badge from '@/components/ui/Badge'
import { FileText, Calendar, DollarSign, User as UserIcon } from 'lucide-react'
import MandateMessaging from '@/components/shared/MandateMessaging'

export default function MandateDetail() {
  const { id } = useParams()
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: docs }] = await Promise.all([
        supabase.from('mandates').select('*, client:companies(*)').eq('id', id).single(),
        supabase.from('documents').select('*').eq('mandate_id', id),
      ])
      setMandate(m as unknown as Mandate)
      setDocuments((docs as DocumentRow[]) ?? [])
      setLoading(false)
    }
    if (id) load()
  }, [id])

  if (loading) return <div className="text-center text-gray-400 py-10">Chargement…</div>
  if (!mandate) return <div className="text-center text-gray-400 py-10">Mandat introuvable.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-400 mb-1">{mandate.reference}</div>
          <h2 className="text-xl font-bold text-gray-900">{mandate.title}</h2>
          <div className="text-sm text-gray-500 mt-1">Client : {(mandate as any).client?.name}</div>
        </div>
        <Badge color="gold">{mandate.status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <DollarSign className="text-navy-700" size={20} />
          <div>
            <div className="text-xs text-gray-500">Montant recherché</div>
            <div className="font-semibold text-gray-900">{mandate.amount_requested ? `${(mandate.amount_requested / 1_000_000_000).toFixed(1)} Mds FCFA` : '—'}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Calendar className="text-navy-700" size={20} />
          <div>
            <div className="text-xs text-gray-500">Closing visé</div>
            <div className="font-semibold text-gray-900">{mandate.target_close_date ? new Date(mandate.target_close_date).toLocaleDateString('fr-FR') : '—'}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <UserIcon className="text-navy-700" size={20} />
          <div>
            <div className="text-xs text-gray-500">Success fee</div>
            <div className="font-semibold text-gray-900">{mandate.success_fee_rate ? `${mandate.success_fee_rate}%` : '—'}</div>
          </div>
        </div>
      </div>

      {mandate.description && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-600">{mandate.description}</p>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Data Room ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun document déposé pour ce mandat.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <FileText size={16} className="text-navy-600" />
                <span className="text-sm text-gray-800">{d.filename}</span>
                <Badge color="gray">{d.category}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <MandateMessaging mandateId={mandate.id} title="Messagerie avec le client" />
    </div>
  )
}
