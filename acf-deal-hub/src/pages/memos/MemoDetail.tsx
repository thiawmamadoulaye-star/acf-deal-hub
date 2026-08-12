import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Sparkles, CheckCircle2, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { InvestmentMemo, Mandate } from '@/types/database'
import Badge from '@/components/ui/Badge'
import { exportMemoToPdf } from '@/lib/pdfExport'

interface Props { memoId: string; onBack: () => void }

const sectionLabels: Record<string, string> = {
  context: 'Contexte de la mission', financial_summary: 'Analyse financière',
  risks: 'Analyse des risques', recommendation: "Recommandation d'ACF",
}

export default function MemoDetail({ memoId, onBack }: Props) {
  const [memo, setMemo] = useState<InvestmentMemo | null>(null)
  const [content, setContent] = useState<Record<string, string>>({})
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [mandate, setMandate] = useState<Mandate | null>(null)

  useEffect(() => {
    supabase.from('investment_memos').select('*, mandate:mandates(*)').eq('id', memoId).single().then(({ data }) => {
      const m = data as unknown as InvestmentMemo & { mandate?: Mandate }
      setMemo(m)
      setMandate(m?.mandate ?? null)
      setContent((m?.content as Record<string, string>) ?? {})
      setExecutiveSummary(m?.executive_summary ?? '')
      setLoading(false)
    })
  }, [memoId])

  async function handleExportPdf() {
    if (!memo) return
    setExporting(true)
    try { await exportMemoToPdf({ ...memo, content, executive_summary: executiveSummary }, mandate) } finally { setExporting(false) }
  }

  async function handleSave(newStatus?: string) {
    setSaving(true)
    const { error } = await supabase.from('investment_memos').update({ content, executive_summary: executiveSummary, status: newStatus ?? memo?.status }).eq('id', memoId)
    setSaving(false)
    if (!error) {
      setSaved(true)
      if (newStatus) setMemo((m) => (m ? { ...m, status: newStatus } : m))
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (loading) return <div className="text-center text-gray-400 py-10">Chargement…</div>
  if (!memo) return <div className="text-center text-gray-400 py-10">Mémorandum introuvable.</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm"><ArrowLeft size={16} /> Retour aux mémorandums</button>
        <div className="flex items-center gap-2">
          {memo.generated_by_ai && <Badge color="navy"><Sparkles size={10} className="inline mr-1" />Généré par assistant</Badge>}
          <Badge color={memo.status === 'final' ? 'green' : memo.status === 'review' ? 'yellow' : 'gray'}>
            {memo.status === 'final' ? 'Final' : memo.status === 'review' ? 'En revue' : 'Brouillon'}
          </Badge>
          <button onClick={handleExportPdf} disabled={exporting} className="flex items-center gap-1.5 text-xs font-medium bg-navy-800 text-white px-3 py-1.5 rounded-lg hover:bg-navy-900 disabled:opacity-60">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {exporting ? 'Génération…' : 'Exporter en PDF'}
          </button>
        </div>
      </div>

      <div><h2 className="text-xl font-bold text-gray-900">{memo.title}</h2></div>

      <div className="card">
        <label className="block text-sm font-semibold text-gray-900 mb-2">Résumé exécutif</label>
        <textarea className="input-field" rows={3} value={executiveSummary} onChange={(e) => setExecutiveSummary(e.target.value)} />
      </div>

      {Object.entries(sectionLabels).map(([key, label]) => (
        <div key={key} className="card">
          <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
          <textarea className="input-field font-mono text-sm" rows={8} value={content[key] ?? ''} onChange={(e) => setContent({ ...content, [key]: e.target.value })} />
        </div>
      ))}

      <div className="flex items-center justify-between sticky bottom-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
        <div className="text-sm text-gray-500">
          {saved && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} /> Enregistré</span>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSave()} disabled={saving} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60">
            <Save size={16} /> Enregistrer le brouillon
          </button>
          {memo.status !== 'final' && (
            <button onClick={() => handleSave('final')} disabled={saving} className="btn-gold flex items-center gap-2 disabled:opacity-60">
              <CheckCircle2 size={16} /> Valider en version finale
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
