import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, User as UserIcon, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Mandate, AiConversationMessage } from '@/types/database'

const suggestedQuestions = [
  "Quel est le niveau de risque global de ce mandat ?",
  "La société peut-elle supporter ce niveau d'endettement ?",
  'Résume la situation financière en 3 points clés.',
  "Quels sont les points de vigilance à soulever au comité d'investissement ?",
]

export default function AIAssistant() {
  const { profile } = useAuth()
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [selectedMandate, setSelectedMandate] = useState('')
  const [messages, setMessages] = useState<AiConversationMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [configError, setConfigError] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('mandates').select('*, client:companies(name)').order('title').then(({ data }) => {
      setMandates((data as unknown as Mandate[]) ?? [])
      if (data && data.length > 0) setSelectedMandate((data as Mandate[])[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedMandate) return
    supabase.from('ai_conversations').select('*').eq('mandate_id', selectedMandate).order('created_at').then(({ data }) => setMessages((data as AiConversationMessage[]) ?? []))
  }, [selectedMandate])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function buildMandateContext() {
    const mandate = mandates.find((m) => m.id === selectedMandate)
    const [{ data: fa }, { data: risk }, { data: deals }] = await Promise.all([
      supabase.from('financial_analyses').select('*').eq('mandate_id', selectedMandate).order('fiscal_year', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('risk_assessments').select('*').eq('mandate_id', selectedMandate).order('assessed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('deals').select('*').eq('mandate_id', selectedMandate),
    ])
    return { mandate, financialAnalysis: fa, riskAssessment: risk, deals: deals ?? [] }
  }

  async function handleAsk(q?: string) {
    const finalQuestion = q ?? question
    if (!finalQuestion.trim() || !selectedMandate || !profile) return

    setLoading(true)
    setConfigError(false)
    setQuestion('')

    const { data: userMsg } = await supabase.from('ai_conversations').insert({
      organization_id: profile.organization_id, mandate_id: selectedMandate, profile_id: profile.id, role: 'user', content: finalQuestion,
    }).select().single()

    if (userMsg) setMessages((prev) => [...prev, userMsg as AiConversationMessage])

    try {
      const context = await buildMandateContext()
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))

      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { mandateContext: context, history, question: finalQuestion } })

      if (error || !data?.success) { setConfigError(true); setLoading(false); return }

      const { data: assistantMsg } = await supabase.from('ai_conversations').insert({
        organization_id: profile.organization_id, mandate_id: selectedMandate, profile_id: profile.id, role: 'assistant', content: data.answer,
      }).select().single()

      if (assistantMsg) setMessages((prev) => [...prev, assistantMsg as AiConversationMessage])
    } catch (err) {
      setConfigError(true)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="text-gold-500" size={22} /> Assistant IA Financier</h2>
        <p className="text-gray-500 text-sm mt-0.5">Posez vos questions sur les mandats — l'assistant s'appuie sur les données réelles enregistrées</p>
      </div>

      <div className="max-w-sm">
        <select className="input-field" value={selectedMandate} onChange={(e) => setSelectedMandate(e.target.value)}>
          {mandates.map((m) => <option key={m.id} value={m.id}>{m.reference} — {m.title}</option>)}
        </select>
      </div>

      <div className="card flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-6 space-y-3">
              <Bot size={32} className="mx-auto text-gray-300" />
              <p className="text-sm">Posez votre première question sur ce mandat.</p>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {suggestedQuestions.map((q) => (
                  <button key={q} onClick={() => handleAsk(q)} className="text-xs bg-navy-50 text-navy-700 px-3 py-1.5 rounded-full hover:bg-navy-100">{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && <div className="w-7 h-7 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center shrink-0"><Bot size={14} /></div>}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
              {msg.role === 'user' && <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center shrink-0"><UserIcon size={14} /></div>}
            </div>
          ))}

          {loading && <div className="flex items-center gap-2 text-gray-400 text-sm"><Bot size={16} /> L'assistant analyse les données…</div>}

          {configError && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>L'assistant IA n'est pas encore configuré côté serveur. Un administrateur doit définir la clé API (OpenAI ou Azure OpenAI) dans les secrets Supabase.</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAsk() }} className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <input className="input-field flex-1" placeholder="Posez votre question…" value={question} onChange={(e) => setQuestion(e.target.value)} disabled={loading} />
          <button type="submit" disabled={loading || !question.trim()} className="btn-gold px-4 disabled:opacity-60"><Send size={16} /></button>
        </form>
      </div>
    </div>
  )
}
