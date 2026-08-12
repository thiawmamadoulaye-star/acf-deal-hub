import { useEffect, useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { supabase } from '@/lib/supabaseClient'
import type { Deal, DealStage } from '@/types/database'
import { Plus, GripVertical, Landmark } from 'lucide-react'
import NewDealModal from './NewDealModal'
import DealInvestorsModal from './DealInvestorsModal'

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'origination', label: 'Origination', color: 'bg-gray-100' },
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-50' },
  { key: 'mandate_signed', label: 'Mandat signé', color: 'bg-blue-50' },
  { key: 'analysis', label: 'Analyse', color: 'bg-indigo-50' },
  { key: 'structuring', label: 'Structuration', color: 'bg-indigo-50' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'bg-amber-50' },
  { key: 'negotiation', label: 'Négociation', color: 'bg-amber-50' },
  { key: 'term_sheet', label: 'Term Sheet', color: 'bg-gold-50' },
  { key: 'closing', label: 'Closing', color: 'bg-gold-50' },
  { key: 'post_closing', label: 'Post Closing', color: 'bg-emerald-50' },
]

function formatFCFA(value: number | null) {
  if (!value) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Mds`
  return `${(value / 1_000_000).toFixed(0)} M`
}

function DealCard({ deal, onManageInvestors }: { deal: Deal; onManageInvestors: (deal: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 p-3 mb-2 shadow-sm cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm text-gray-900 line-clamp-2">{deal.deal_name}</div>
        <GripVertical size={14} className="text-gray-300 shrink-0 mt-0.5" />
      </div>
      <div className="text-xs text-gray-500 mt-1">{(deal as any).mandate?.reference}</div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-semibold text-navy-800">{formatFCFA(deal.deal_value)} FCFA</span>
        <span className="text-xs bg-navy-100 text-navy-700 px-2 py-0.5 rounded-full">{deal.probability}%</span>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onManageInvestors(deal) }}
        className="mt-2 flex items-center gap-1.5 text-xs text-navy-700 hover:text-navy-900 font-medium"
      >
        <Landmark size={12} /> Gérer les investisseurs
      </button>
    </div>
  )
}

function StageColumn({
  stage, deals, onManageInvestors,
}: {
  stage: typeof STAGES[number]
  deals: Deal[]
  onManageInvestors: (deal: Deal) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  const stageValue = deals.reduce((sum, d) => sum + (d.deal_value ?? 0), 0)

  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-72 rounded-xl ${stage.color} p-3 ${isOver ? 'ring-2 ring-navy-400' : ''}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="font-semibold text-sm text-gray-800">{stage.label}</h4>
        <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded-full">{deals.length}</span>
      </div>
      <div className="text-xs text-gray-500 mb-3 px-1">{formatFCFA(stageValue)} FCFA</div>
      <div className="min-h-[100px]">
        {deals.map((d) => <DealCard key={d.id} deal={d} onManageInvestors={onManageInvestors} />)}
      </div>
    </div>
  )
}

export default function DealPipeline() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [managingInvestorsFor, setManagingInvestorsFor] = useState<Deal | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function loadDeals() {
    setLoading(true)
    const { data, error } = await supabase.from('deals').select('*, mandate:mandates(id, reference, title)').order('position_in_stage')
    if (!error && data) setDeals(data as unknown as Deal[])
    setLoading(false)
  }

  useEffect(() => { loadDeals() }, [])

  function handleDragStart(event: DragStartEvent) { setActiveId(event.active.id as string) }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const dealId = active.id as string
    const newStage = over.id as DealStage
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)))

    const { error } = await supabase.from('deals').update({ stage: newStage }).eq('id', dealId)
    if (error) {
      console.error('Erreur mise à jour deal:', error)
      loadDeals()
    }
  }

  const activeDeal = deals.find((d) => d.id === activeId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deal Pipeline</h2>
          <p className="text-gray-500 text-sm mt-0.5">Glissez-déposez les deals entre les étapes pour actualiser leur statut</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouveau deal</button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Chargement du pipeline…</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map((stage) => (
              <StageColumn key={stage.key} stage={stage} deals={deals.filter((d) => d.stage === stage.key)} onManageInvestors={setManagingInvestorsFor} />
            ))}
          </div>
          <DragOverlay>{activeDeal ? <DealCard deal={activeDeal} onManageInvestors={() => {}} /> : null}</DragOverlay>
        </DndContext>
      )}

      {showModal && <NewDealModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadDeals() }} />}

      {managingInvestorsFor && (
        <DealInvestorsModal dealId={managingInvestorsFor.id} dealName={managingInvestorsFor.deal_name} onClose={() => setManagingInvestorsFor(null)} />
      )}
    </div>
  )
}
