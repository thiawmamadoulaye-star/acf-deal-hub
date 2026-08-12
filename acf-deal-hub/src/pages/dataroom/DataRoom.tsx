import { useEffect, useState, ChangeEvent } from 'react'
import { FileText, Upload, Lock, Download } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { DocumentRow, Mandate, DocumentCategory } from '@/types/database'
import Badge from '@/components/ui/Badge'

const categoryLabels: Record<DocumentCategory, string> = {
  financial_statements: 'États financiers',
  business_plan: 'Business Plan',
  contracts: 'Contrats',
  legal: 'Juridique',
  tax: 'Fiscal',
  esg: 'ESG',
  due_diligence: 'Due Diligence',
  term_sheet: 'Term Sheet',
  nda: 'NDA',
  other: 'Autre',
}

export default function DataRoom() {
  const { profile } = useAuth()
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [selectedMandate, setSelectedMandate] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('financial_statements')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    const [{ data: docs }, { data: mands }] = await Promise.all([
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('mandates').select('*').order('title'),
    ])
    setDocuments((docs as DocumentRow[]) ?? [])
    setMandates((mands as Mandate[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedMandate) return

    setUploading(true)
    const filePath = `mandates/${selectedMandate}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage.from('dataroom').upload(filePath, file)

    if (uploadError) {
      alert("Erreur lors de l'upload : " + uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('documents').insert({
      organization_id: profile?.organization_id,
      mandate_id: selectedMandate,
      category,
      filename: file.name,
      file_path: filePath,
      file_size_kb: Math.round(file.size / 1024),
      mime_type: file.type,
      uploaded_by: profile?.id,
    })

    setUploading(false)
    if (dbError) {
      alert("Erreur lors de l'enregistrement : " + dbError.message)
      return
    }
    loadData()
    e.target.value = ''
  }

  async function handleDownload(doc: DocumentRow) {
    const { data, error } = await supabase.storage.from('dataroom').createSignedUrl(doc.file_path, 60)
    if (error || !data) {
      alert('Impossible de générer le lien de téléchargement.')
      return
    }
    await supabase.from('document_access_logs').insert({ document_id: doc.id, accessed_by: profile?.id, action: 'download' })
    window.open(data.signedUrl, '_blank')
  }

  async function toggleInvestorVisibility(doc: DocumentRow) {
    if (doc.category === 'due_diligence') return
    const { error } = await supabase.from('documents').update({ is_investor_visible: !doc.is_investor_visible }).eq('id', doc.id)
    if (!error) {
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_investor_visible: !d.is_investor_visible } : d)))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Data Room</h2>
        <p className="text-gray-500 text-sm mt-0.5">Documents sécurisés liés aux mandats — accès tracé et confidentiel</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Upload size={18} /> Déposer un document</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select className="input-field" value={selectedMandate} onChange={(e) => setSelectedMandate(e.target.value)}>
            <option value="">Sélectionner un mandat…</option>
            {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
          </select>
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
            {Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-2 cursor-pointer hover:border-navy-400 text-sm text-gray-500">
            {uploading ? 'Envoi en cours…' : 'Choisir un fichier'}
            <input type="file" className="hidden" disabled={!selectedMandate || uploading} onChange={handleUpload} />
          </label>
        </div>
        {!selectedMandate && <p className="text-xs text-amber-600 mt-2">Sélectionnez d'abord un mandat avant de déposer un document.</p>}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Documents ({documents.length})</h3>
        {loading ? (
          <div className="text-center text-gray-400 py-6">Chargement…</div>
        ) : documents.length === 0 ? (
          <div className="text-center text-gray-400 py-6">Aucun document déposé pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Fichier</th>
                <th className="pb-2 font-medium">Catégorie</th>
                <th className="pb-2 font-medium">Taille</th>
                <th className="pb-2 font-medium">Déposé le</th>
                <th className="pb-2 font-medium">Visible investisseurs</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-navy-600" />
                      {doc.filename}
                      {doc.is_confidential && <Lock size={12} className="text-amber-500" />}
                    </div>
                  </td>
                  <td className="py-2.5"><Badge color="navy">{categoryLabels[doc.category]}</Badge></td>
                  <td className="py-2.5 text-gray-500">{doc.file_size_kb ? `${Math.round(doc.file_size_kb)} Ko` : '—'}</td>
                  <td className="py-2.5 text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2.5">
                    <button
                      onClick={() => toggleInvestorVisibility(doc)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${doc.is_investor_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                      disabled={doc.category === 'due_diligence'}
                    >
                      {doc.is_investor_visible ? 'Visible' : 'Masqué'}
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => handleDownload(doc)} className="text-navy-700 hover:text-navy-900" title="Télécharger">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
