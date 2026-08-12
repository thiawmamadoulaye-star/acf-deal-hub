import { useEffect, useState } from 'react'
import { Sparkles, FileText, Plus, Bot, ListTree } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate, InvestmentMemo } from '@/types/database'
import Badge from '@/components/ui/Badge'
import MemoDetail from './MemoDetail'
import { generateMemoContent } from './generateMemoContent'

export default function InvestmentMemos() {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [selectedMandate, setSelectedMandate] = useState('')
  const [memos, setMemos] = useState<InvestmentMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [openMemoId, setOpenMemoId] = useState<string | null>(null)
  const [showFallbackNotice, setShowFallbackNotice] = useState(false)

  useEffect(() => {
    supabase.from('mandates').select('*, client:companies(*)').order('title').then(({ data }) => {
      setMandates((data as unknown as Mandate[]) ?? [])
      if (data && data.length > 0) setSelectedMandate((data as Mandate[])[0].id)
    })
  }, [])

  async function loadMemos(mandateId: string) {
    setLoading(true)
    const { data, error } = await supabase.from('investment_memos').select('*, mandate:mandates(reference, title)').eq('mandate_id', mandateId).order('created_at', { ascending: false })
    if (!error && data) setMemos(data as unknown as InvestmentMemo[])
    setLoading(false)
  }

  useEffect(() => { if (selectedMandate) loadMemos(selectedMandate) }, [selectedMandate])

  async function handleGenerate() {
    setGenerating(true)
    let usedRealAI = false
    try {
      const mandate = mandates.find((m) => m.id === selectedMandate)
      if (!mandate) return

      const [{ data: fa }, { data: risk }, { data: deals }] = await Promise.all([
        supabase.from('financial_analyses').select('*').eq('mandate_id', selectedMandate).order('fiscal_year', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('risk_assessments').select('*').eq('mandate_id', selectedMandate).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('deals').select('*').eq('mandate_id', selectedMandate),
      ])

      let content: Record<string, string>

      try {
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('generate-memo', {
          body: { mandate, financialAnalysis: fa, riskAssessment: risk, deals: deals ?? [] },
        })
        if (aiError || !aiResult?.success) throw new Error(aiError?.message ?? 'Échec IA')
        content = aiResult.content
        usedRealAI = true
      } catch {
        content = generateMemoContent({ mandate, financialAnalysis: fa, riskAssessment: risk, deals: deals ?? [] })
      }

      const { data: inserted, error } = await supabase.from('investment_memos').insert({
        organization_id: profile?.organization_id, mandate_id: selectedMandate,
        title: `Mémorandum d'investissement — ${mandate.title}`, executive_summary: content.executive_summary,
        content, status: 'draft', generated_by_ai: true, created_by: profile?.id,
      }).select().single()

      if (!error && inserted) {
        await loadMemos(selectedMandate)
        setOpenMemoId(inserted.id)
        if (!usedRealAI) setShowFallbackNotice(true)
      }
    } finally { setGenerating(false) }
  }

  if (openMemoId) {
    return <MemoDetail memoId={openMemoId} onBack={() => { setOpenMemoId(null); loadMemos(selectedMandate) }} />
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mémorandums d'Investissement</h2>
          <p className="text-gray-500 text-sm mt-0.5">Génération assistée à partir des données du mandat, de l'analyse financière et des risques</p>
        </div>
        <button onClick={handleGenerate} disabled={generating || !selectedMandate} className="btn-gold flex items-center gap-2 disabled:opacity-60">
          <Sparkles size={16} />{generating ? 'Génération en cours…' : 'Générer un mémorandum (IA)'}
        </button>
      </div>

      <div className="bg-navy-50 border border-navy-100 rounded-lg p-4 flex items-start gap-3">
        <Bot size={20} className="text-navy-700 mt-0.5 shrink-0" />
        <p className="text-sm text-navy-800">
          L'assistant tente d'abord une génération via IA générative réelle (si configurée côté serveur), puis compile automatiquement
          les informations du mandat pour produire un <strong>brouillon structuré</strong>, entièrement modifiable avant validation.
        </p>
      </div>

      {showFallbackNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800">
          <ListTree size={18} className="mt-0.5 shrink-0" />
          <span>L'IA générative n'est pas configurée (ou momentanément indisponible) : le mémorandum a été généré par le <strong>moteur local à base de règles</strong>.</span>
          <button onClick={() => setShowFallbackNotice(false)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
        </div>
      )}

      <div className="max-w-sm">
        <select className="input-field" value={selectedMandate} onChange={(e) => setSelectedMandate(e.target.value)}>
          {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <div className="col-span-full text-center text-gray-400 py-10">Chargement…</div>}
        {!loading && memos.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">Aucun mémorandum pour ce mandat.</div>}
        {memos.map((memo) => (
          <button key={memo.id} onClick={() => setOpenMemoId(memo.id)} className="card text-left hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-gold-100 text-gold-700 flex items-center justify-center"><FileText size={18} /></div>
              <div className="flex gap-2">
                {memo.generated_by_ai && <Badge color="navy"><Sparkles size={10} className="inline mr-1" />IA</Badge>}
                <Badge color={memo.status === 'final' ? 'green' : memo.status === 'review' ? 'yellow' : 'gray'}>
                  {memo.status === 'final' ? 'Final' : memo.status === 'review' ? 'En revue' : 'Brouillon'}
                </Badge>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{memo.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{memo.executive_summary}</p>
            <div className="text-xs text-gray-400 mt-3">Créé le {new Date(memo.created_at).toLocaleDateString('fr-FR')}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
