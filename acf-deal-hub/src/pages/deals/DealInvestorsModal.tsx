import { useEffect, useState } from 'react'
import { X, Landmark, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Investor, SolicitationStatus } from '@/types/database'
import Badge from '@/components/ui/Badge'

interface Props { dealId: string; dealName: string; onClose: () => void }
interface DealInvestorRow { id: string; investor_id: string; status: SolicitationStatus; amount_committed: number | null; investor: Investor }

const statusLabels: Record<SolicitationStatus, string> = {
  identified: 'Identifié', contacted: 'Contacté', nda_signed: 'NDA signé', interested: 'Intéressé',
  declined: 'Décliné', committed: 'Engagé', funded: 'Financé',
}
const statusColors: Record<SolicitationStatus, 'gray' | 'blue' | 'gold' | 'green' | 'red'> = {
  identified: 'gray', contacted: 'blue', nda_signed: 'blue', interested: 'gold', declined: 'red', committed: 'green', funded: 'green',
}

export default function DealInvestorsModal({ dealId, dealName, onClose }: Props) {
  const [rows, setRows] = useState<DealInvestorRow[]>([])
  const [allInvestors, setAllInvestors] = useState<Investor[]>([])
  const [selectedInvestorId, setSelectedInvestorId] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  async function loadData() {
    setLoading(true)
    const [{ data: dealInvestors }, { data: investors }] = await Promise.all([
      supabase.from('deal_investors').select('*, investor:investors(*)').eq('deal_id', dealId),
      supabase.from('investors').select('*').eq('is_active', true).order('name'),
    ])
    setRows((dealInvestors as unknown as DealInvestorRow[]) ?? [])
    setAllInvestors((investors as Investor[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [dealId])

  const availableInvestors = allInvestors.filter((inv) => !rows.some((r) => r.investor_id === inv.id))

  async function handleAdd() {
    if (!selectedInvestorId) return
    setAdding(true)
    const { error } = await supabase.from('deal_investors').insert({ deal_id: dealId, investor_id: selectedInvestorId, status: 'identified' })
    setAdding(false)
    if (!error) { setSelectedInvestorId(''); loadData() }
  }

  async function updateStatus(rowId: string, status: SolicitationStatus) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, status } : r)))
    await supabase.from('deal_investors').update({ status }).eq('id', rowId)
  }

  async function handleRemove(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId))
    await supabase.from('deal_investors').delete().eq('id', rowId)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Landmark size={18} /> Investisseurs sollicités</h3>
            <p className="text-sm text-gray-500">{dealName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <select className="input-field flex-1" value={selectedInvestorId} onChange={(e) => setSelectedInvestorId(e.target.value)}>
            <option value="">Ajouter un investisseur…</option>
            {availableInvestors.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!selectedInvestorId || adding} className="btn-primary px-3 disabled:opacity-60"><Plus size={16} /></button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-6">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">Aucun investisseur sollicité pour ce deal.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5">
                <div>
                  <div className="font-medium text-sm text-gray-900">{row.investor.name}</div>
                  <div className="text-xs text-gray-400">{row.investor.country}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="text-xs border border-gray-200 rounded-md px-2 py-1" value={row.status} onChange={(e) => updateStatus(row.id, e.target.value as SolicitationStatus)}>
                    {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <Badge color={statusColors[row.status]}>{statusLabels[row.status]}</Badge>
                  <button onClick={() => handleRemove(row.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-xs text-navy-700 mt-4">
          Un investisseur ne voit une opportunité dans son Portail Investisseur que si son compte est rattaché à cette fiche investisseur.
        </div>
      </div>
    </div>
  )
}
