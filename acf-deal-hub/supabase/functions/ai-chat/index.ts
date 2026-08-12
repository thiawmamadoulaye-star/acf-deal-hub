// Edge Function : ai-chat — assistant IA financier conversationnel.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { callChatCompletion, ChatMessage } from '../_shared/aiProvider.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { mandateContext, history, question } = await req.json()

    const systemPrompt = `Tu es l'assistant IA financier d'ACF (Advanced Capital & Finance), cabinet de
conseil financier basé à Dakar, Sénégal. Tu aides les analystes et managers à interpréter les données
financières, les ratios et les risques d'un mandat en cours.

Contexte du mandat actuellement consulté :
${JSON.stringify(mandateContext, null, 2)}

Règles :
- Réponds uniquement à partir des données fournies dans ce contexte et dans la conversation.
- Si une information demandée n'est pas disponible, dis-le clairement et propose d'aller la chercher
  dans le module concerné (Analyse Financière, Due Diligence, Notation des Risques).
- Sois concis, précis, et utilise un vocabulaire financier professionnel.
- N'invente jamais de chiffres.`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...((history ?? []) as ChatMessage[]),
      { role: 'user', content: question },
    ]

    const answer = await callChatCompletion(messages, 0.3)

    return new Response(JSON.stringify({ success: true, answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
