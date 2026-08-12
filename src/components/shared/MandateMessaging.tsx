import { useEffect, useRef, useState, FormEvent } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { MandateMessage } from '@/types/database'

interface Props {
  mandateId: string
  title?: string
}

export default function MandateMessaging({ mandateId, title = 'Messagerie sécurisée' }: Props) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<MandateMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  async function loadMessages() {
    setLoading(true)
    const { data } = await supabase.from('mandate_messages').select('*').eq('mandate_id', mandateId).order('created_at')
    setMessages((data as MandateMessage[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadMessages()
    const channel = supabase.channel(`mandate-messages-${mandateId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mandate_messages', filter: `mandate_id=eq.${mandateId}` }, () => loadMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [mandateId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function notifyOtherParty(messageContent: string) {
    try {
      const { data: mandate } = await supabase.from('mandates').select('title, reference, owner_id, client_id').eq('id', mandateId).single()
      if (!mandate) return

      const isClientSender = profile?.role === 'client'
      const senderName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Un utilisateur'

      let toEmail: string | null = null
      let recipientProfileId: string | null = null
      let recipientName = ''
      let link = ''

      if (isClientSender) {
        if (!mandate.owner_id) return
        const { data: owner } = await supabase.from('profiles').select('id, email, first_name').eq('id', mandate.owner_id).single()
        if (!owner) return
        toEmail = owner.email
        recipientProfileId = owner.id
        recipientName = owner.first_name ?? ''
        link = `/mandates/${mandateId}`
      } else {
        const { data: contact } = await supabase.from('contacts').select('email, first_name').eq('company_id', mandate.client_id).eq('is_primary', true).maybeSingle()
        if (!contact?.email) return
        toEmail = contact.email
        recipientName = contact.first_name ?? ''
        link = `/client/mandates/${mandateId}`
      }

      if (!toEmail) return

      await supabase.functions.invoke('send-notification-email', {
        body: {
          template: 'new_message', organizationId: profile?.organization_id, recipientProfileId, toEmail,
          data: { recipientName, senderName, mandateTitle: mandate.title, messagePreview: messageContent.slice(0, 140), link },
        },
      })
    } catch (err) {
      console.warn('Notification email non envoyée :', err)
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return
    setSending(true)
    const content = newMessage.trim()

    const { error } = await supabase.from('mandate_messages').insert({
      organization_id: profile.organization_id, mandate_id: mandateId,
      sender_id: profile.id, sender_role: profile.role, content,
    })

    setSending(false)
    if (!error) {
      setNewMessage('')
      loadMessages()
      notifyOtherParty(content)
    }
  }

  return (
    <div className="card flex flex-col h-[420px]">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <MessageSquare size={18} /> {title}
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading && <div className="text-center text-gray-400 text-sm py-6">Chargement…</div>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Aucun message pour le moment.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === profile?.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <div>{msg.content}</div>
                <div className={`text-[10px] mt-1 ${isMine ? 'text-navy-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <input className="input-field flex-1" placeholder="Écrire un message…" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
        <button type="submit" disabled={sending || !newMessage.trim()} className="btn-primary px-4 disabled:opacity-60">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
