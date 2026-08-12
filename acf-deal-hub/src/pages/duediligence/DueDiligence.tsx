import { useEffect, useState } from 'react'
import { ClipboardCheck, Sparkles, Flag, CheckCircle2, Circle, Clock, MinusCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate, DueDiligenceChecklist, DueDiligenceItem, DDCategory, DDItemStatus } from '@/types/database'
import Badge from '@/components/ui/Badge'

const categoryLabels: Record<DDCategory, string> = {
  financial: 'Financière', legal: 'Juridique', tax: 'Fiscale', esg: 'ESG', operational: 'Opérationnelle',
}
const categoryOrder: DDCategory[] = ['financial', 'legal', 'tax', 'esg', 'operational']

const statusIcons: Record<DDItemStatus, JSX.Element> = {
  pending: <Circle size={16} className="text-gray-300" />,
  in_progress: <Clock size={16} className="text-amber-500" />,
  completed: <CheckCircle2 size={16} className="text-emerald-600" />,
  flagged: <Flag size={16} className="text-red-500" />,
  not_applicable: <MinusCircle size={16} className="text-gray-300" />,
}
const statusLabels: Record<DDItemStatus, string> = {
  pending: 'À faire', in_progress: 'En cours', completed: 'Complété', flagged: 'Signalé', not_applicable: 'N/A',
}

export default function DueDiligence() {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [selectedMandate, setSelectedMandate] = useState('')
  const [checklist, setChecklist] = useState<DueDiligenceChecklist | null>(null)
  const [items, setItems] = useState<DueDiligenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    supabase.from('mandates').select('*').order('title').then(({ data }) => {
      setMandates((data as Mandate[]) ?? [])
      if (data && data.length > 0) setSelectedMandate((data as Mandate[])[0].id)
    })
  }, [])

  async function loadChecklist(mandateId: string) {
    setLoading(true)
    const { data: cl } = await supabase.from('due_diligence_checklists').select('*').eq('mandate_id', mandateId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setChecklist(cl as DueDiligenceChecklist | null)
    if (cl) {
      const { data: its } = await supabase.from('due_diligence_items').select('*').eq('checklist_id', cl.id).order('category')
      setItems((its as DueDiligenceItem[]) ?? [])
    } else {
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => { if (selectedMandate) loadChecklist(selectedMandate) }, [selectedMandate])

  async function generateChecklist() {
    setGenerating(true)
    const { error } = await supabase.rpc('generate_standard_dd_checklist', {
      p_mandate_id: selectedMandate, p_org_id: profile?.organization_id, p_created_by: profile?.id,
    })
    setGenerating(false)
    if (!error) loadChecklist(selectedMandate)
    else alert('Erreur lors de la génération : ' + error.message)
  }

  async function updateItemStatus(itemId: string, status: DDItemStatus) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)))
    await supabase.from('due_diligence_items').update({ status, risk_flag: status === 'flagged', updated_by: profile?.id }).eq('id', itemId)
  }

  const progress = items.length > 0 ? Math.round((items.filter((i) => i.status === 'completed').length / items.length) * 100) : 0
  const flaggedCount = items.filter((i) => i.status === 'flagged').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Due Diligence</h2>
        <p className="text-gray-500 text-sm mt-0.5">Checklist structurée : financière, juridique, fiscale, ESG et opérationnelle</p>
      </div>

      <div className="max-w-sm">
        <select className="input-field" value={selectedMandate} onChange={(e) => setSelectedMandate(e.target.value)}>
          {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Chargement…</div>
      ) : !checklist ? (
        <div className="card text-center py-10">
          <ClipboardCheck size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Aucune checklist de Due Diligence n'existe pour ce mandat.</p>
          <button onClick={generateChecklist} disabled={generating} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            <Sparkles size={16} />{generating ? 'Génération…' : 'Générer la checklist standard ACF'}
          </button>
        </div>
      ) : (
        <>
          <div className="card flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 font-medium">Progression globale</span>
                <span className="font-bold text-navy-800">{progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-navy-700 to-gold-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {flaggedCount > 0 && <Badge color="red"><Flag size={12} className="inline mr-1" /> {flaggedCount} point(s) signalé(s)</Badge>}
          </div>

          {categoryOrder.map((cat) => {
            const catItems = items.filter((i) => i.category === cat)
            if (catItems.length === 0) return null
            const catCompleted = catItems.filter((i) => i.status === 'completed').length
            return (
              <div key={cat} className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{categoryLabels[cat]}</h3>
                  <span className="text-xs text-gray-500">{catCompleted}/{catItems.length} complétés</span>
                </div>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 flex-1">
                        {statusIcons[item.status]}
                        <span className={`text-sm ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.label}</span>
                      </div>
                      <select className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white" value={item.status} onChange={(e) => updateItemStatus(item.id, e.target.value as DDItemStatus)}>
                        {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
