import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Download, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Deal, Mandate, DocumentRow } from '@/types/database'
import Badge from '@/components/ui/Badge'

const categoryLabels: Record<string, string> = {
  financial_statements: 'États financiers', business_plan: 'Business Plan', contracts: 'Contrats', legal: 'Juridique',
  tax: 'Fiscal', esg: 'ESG', due_diligence: 'Due Diligence', term_sheet: 'Term Sheet', nda: 'NDA', other: 'Autre',
}

function formatFCFA(value: number | null) {
  if (!value) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds FCFA`
  return `${(value / 1_000_000).toFixed(0)} M FCFA`
}

export default function InvestorDealDetail() {
  const { id } = useParams()
  const [deal, setDeal] = useState<(Deal & { mandate?: Mandate }) | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: dealData } = await supabase.from('deals').select('*, mandate:mandates(*)').eq('id', id).single()
      setDeal(dealData as unknown as (Deal & { mandate?: Mandate }))
      if (dealData) {
        const { data: docs } = await supabase.from('documents').select('*').eq('mandate_id', (dealData as any).mandate_id).eq('is_investor_visible', true)
        setDocuments((docs as DocumentRow[]) ?? [])
      }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  async function handleDownload(doc: DocumentRow) {
    const { data } = await supabase.storage.from('dataroom').createSignedUrl(doc.file_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  if (loading) return <div className="text-center text-gray-400 py-10">Chargement…</div>
  if (!deal) return <div className="text-center text-gray-400 py-10">Opportunité introuvable.</div>

  return (
    <div className="space-y-6">
      <Link to="/investor/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm"><ArrowLeft size={16} /> Retour aux opportunités</Link>
      <div>
        <div className="text-xs text-gray-400">{deal.mandate?.reference}</div>
        <h2 className="text-xl font-bold text-gray-900">{deal.deal_name}</h2>
        {deal.mandate?.sector && <Badge color="navy">{deal.mandate.sector}</Badge>}
      </div>

      <div className="card flex items-center gap-3">
        <TrendingUp className="text-navy-700" size={20} />
        <div><div className="text-xs text-gray-500">Valeur de l'opération</div><div className="font-semibold text-gray-900">{formatFCFA(deal.deal_value)}</div></div>
      </div>

      {deal.mandate?.description && (
        <div className="card"><h3 className="font-semibold text-gray-900 mb-2">Description de l'opération</h3><p className="text-sm text-gray-600">{deal.mandate.description}</p></div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText size={18} /> Documents partagés ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun document n'a encore été partagé pour cette opportunité.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 text-sm text-gray-800"><FileText size={16} className="text-navy-600" />{d.filename}<Badge color="navy">{categoryLabels[d.category] ?? d.category}</Badge></div>
                <button onClick={() => handleDownload(d)} className="text-navy-700 hover:text-navy-900"><Download size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-navy-50 border border-navy-100 rounded-lg p-4 text-sm text-navy-700">
        Pour toute question sur cette opportunité, contactez directement votre interlocuteur ACF.
      </div>
    </div>
  )
}
