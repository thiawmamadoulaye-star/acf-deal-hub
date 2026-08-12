import { useEffect, useState } from 'react'
import { FileText, Plus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Invoice, InvoiceStatus } from '@/types/database'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import InvoiceFormModal from './InvoiceFormModal'

const statusConfig: Record<InvoiceStatus, { label: string; color: 'gray' | 'blue' | 'green' | 'red' | 'gold' }> = {
  draft: { label: 'Brouillon', color: 'gray' }, sent: { label: 'Envoyée', color: 'blue' },
  paid: { label: 'Payée', color: 'green' }, overdue: { label: 'En retard', color: 'red' }, cancelled: { label: 'Annulée', color: 'gray' },
}
const typeLabels: Record<string, string> = { retainer: 'Retainer', success_fee: 'Success Fee', expense: 'Frais', other: 'Autre' }

function formatFCFA(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Mds FCFA`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M FCFA`
  return `${value.toLocaleString('fr-FR')} FCFA`
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  async function loadInvoices() {
    setLoading(true)
    const { data, error } = await supabase.from('invoices').select('*, mandate:mandates(id, reference, title)').order('issue_date', { ascending: false })
    if (!error && data) setInvoices(data as unknown as Invoice[])
    setLoading(false)
  }

  useEffect(() => { loadInvoices() }, [])

  async function markAsPaid(invoiceId: string) {
    const { error } = await supabase.from('invoices').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', invoiceId)
    if (!error) loadInvoices()
  }

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0)
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').length
  const filtered = filterStatus === 'all' ? invoices : invoices.filter((i) => i.status === filterStatus)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Facturation & Honoraires</h2>
          <p className="text-gray-500 text-sm mt-0.5">Suivi des retainers et success fees par mandat</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Nouvelle facture</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total facturé" value={formatFCFA(totalBilled)} icon={FileText} accent="navy" />
        <StatCard label="Total encaissé" value={formatFCFA(totalPaid)} icon={CheckCircle2} accent="gold" />
        <StatCard label="En attente" value={formatFCFA(totalPending)} icon={Clock} accent="navy" />
        <StatCard label="Factures en retard" value={String(totalOverdue)} icon={AlertTriangle} accent="gold" />
      </div>

      <div className="flex gap-2">
        {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {s === 'all' ? 'Toutes' : statusConfig[s as InvoiceStatus].label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">N° Facture</th><th className="pb-3 font-medium">Mandat</th><th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Montant</th><th className="pb-3 font-medium">Émise le</th><th className="pb-3 font-medium">Échéance</th>
              <th className="pb-3 font-medium">Statut</th><th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="py-6 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-gray-400">Aucune facture pour ce filtre.</td></tr>}
            {filtered.map((inv) => {
              const status = statusConfig[inv.status]
              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="py-3 text-gray-600">{(inv as any).mandate?.reference}<br /><span className="text-xs text-gray-400">{(inv as any).mandate?.title}</span></td>
                  <td className="py-3 text-gray-600">{typeLabels[inv.invoice_type]}</td>
                  <td className="py-3 font-semibold text-navy-800">{formatFCFA(inv.amount)}</td>
                  <td className="py-3 text-gray-500">{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</td>
                  <td className="py-3 text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="py-3"><Badge color={status.color}>{status.label}</Badge></td>
                  <td className="py-3 text-right">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => markAsPaid(inv.id)} className="text-xs text-navy-700 hover:text-navy-900 font-medium">Marquer payée</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && <InvoiceFormModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); loadInvoices() }} />}
    </div>
  )
}
