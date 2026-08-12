import { useEffect, useState } from 'react'
import { FileText, Download, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { DocumentRow, Mandate } from '@/types/database'
import Badge from '@/components/ui/Badge'

const categoryLabels: Record<string, string> = {
  financial_statements: 'États financiers', business_plan: 'Business Plan', contracts: 'Contrats', legal: 'Juridique',
  tax: 'Fiscal', esg: 'ESG', due_diligence: 'Due Diligence', term_sheet: 'Term Sheet', nda: 'NDA', other: 'Autre',
}

export default function ClientDocuments() {
  const [documents, setDocuments] = useState<(DocumentRow & { mandate?: Mandate })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('documents').select('*, mandate:mandates(reference, title)').order('uploaded_at', { ascending: false }).then(({ data, error }) => {
      if (!error && data) setDocuments(data as any)
      setLoading(false)
    })
  }, [])

  async function handleDownload(doc: DocumentRow) {
    const { data } = await supabase.storage.from('dataroom').createSignedUrl(doc.file_path, 60)
    if (data) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Mes Documents</h2>
        <p className="text-gray-500 text-sm mt-0.5">Ensemble des documents partagés par ACF sur vos mandats</p>
      </div>
      <div className="card">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Chargement…</div>
        ) : documents.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Aucun document partagé pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Document</th><th className="pb-3 font-medium">Mandat</th>
                <th className="pb-3 font-medium">Catégorie</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3"><div className="flex items-center gap-2 text-gray-800"><FileText size={16} className="text-navy-600" />{d.filename}{d.is_confidential && <Lock size={12} className="text-amber-500" />}</div></td>
                  <td className="py-3 text-gray-500">{d.mandate?.reference}</td>
                  <td className="py-3"><Badge color="navy">{categoryLabels[d.category] ?? d.category}</Badge></td>
                  <td className="py-3 text-gray-500">{new Date(d.uploaded_at).toLocaleDateString('fr-FR')}</td>
                  <td className="py-3 text-right"><button onClick={() => handleDownload(d)} className="text-navy-700 hover:text-navy-900"><Download size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
