import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { Mandate, MandateMessage } from '@/types/database'

interface MandateWithLastMessage extends Mandate { lastMessage?: MandateMessage }

export default function ClientMessages() {
  const [mandates, setMandates] = useState<MandateWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: mandatesData } = await supabase.from('mandates').select('*')
      const list = (mandatesData as Mandate[]) ?? []
      const enriched = await Promise.all(list.map(async (m) => {
        const { data: msgs } = await supabase.from('mandate_messages').select('*').eq('mandate_id', m.id).order('created_at', { ascending: false }).limit(1)
        return { ...m, lastMessage: msgs?.[0] as MandateMessage | undefined }
      }))
      setMandates(enriched)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Messagerie</h2>
        <p className="text-gray-500 text-sm mt-0.5">Échangez de façon sécurisée avec votre conseiller ACF, par mandat</p>
      </div>
      <div className="space-y-3">
        {loading && <div className="text-center text-gray-400 py-10">Chargement…</div>}
        {!loading && mandates.length === 0 && <div className="card text-center text-gray-400 py-10">Aucun mandat associé à votre compte.</div>}
        {mandates.map((m) => (
          <Link key={m.id} to={`/client/mandates/${m.id}`} className="card flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center"><MessageSquare size={18} /></div>
              <div>
                <div className="font-medium text-gray-900">{m.title}</div>
                <div className="text-sm text-gray-500 line-clamp-1">{m.lastMessage ? m.lastMessage.content : 'Aucun message pour le moment'}</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
