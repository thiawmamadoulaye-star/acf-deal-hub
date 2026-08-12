// Edge Function : generate-memo — génère un mémorandum d'investissement via IA.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { callChatCompletion } from '../_shared/aiProvider.ts'

const SYSTEM_PROMPT = `Tu es un analyste senior chez ACF (Advanced Capital & Finance), cabinet de conseil
financier basé à Dakar, Sénégal. Tu rédiges des mémorandums d'investissement professionnels,
factuels et structurés à destination d'investisseurs institutionnels, banques et fonds.

Règles impératives :
- Reste strictement factuel : n'invente aucun chiffre non fourni dans le contexte.
- Si une donnée manque, indique explicitement "donnée non communiquée" plutôt que d'inventer.
- Adopte un ton professionnel, clair et synthétique, adapté au contexte financier ouest-africain.
- Structure ta réponse en JSON strict avec exactement les clés suivantes :
  executive_summary, context, financial_summary, risks, recommendation.
- Chaque section doit faire 3 à 6 phrases, rédigées en français.
- Ne mets aucun texte en dehors du JSON.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { mandate, financialAnalysis, riskAssessment, deals } = await req.json()

    const userPrompt = `Voici les données du mandat à synthétiser :

MANDAT
- Référence : ${mandate?.reference}
- Titre : ${mandate?.title}
- Client : ${mandate?.client?.name ?? 'non communiqué'}
- Type de mandat : ${mandate?.mandate_type}
- Secteur : ${mandate?.sector ?? 'non communiqué'}
- Montant recherché : ${mandate?.amount_requested ?? 'non communiqué'} FCFA
- Closing visé : ${mandate?.target_close_date ?? 'non communiqué'}
- Description : ${mandate?.description ?? 'non communiquée'}

ANALYSE FINANCIÈRE
${financialAnalysis ? JSON.stringify(financialAnalysis, null, 2) : 'Aucune analyse financière enregistrée.'}

NOTATION DES RISQUES
${riskAssessment ? JSON.stringify(riskAssessment, null, 2) : 'Aucune notation de risque enregistrée.'}

DEALS ASSOCIÉS
${deals && deals.length > 0 ? JSON.stringify(deals, null, 2) : 'Aucun deal actif enregistré.'}

Rédige le mémorandum d'investissement structuré en respectant strictement le format JSON demandé.`

    const raw = await callChatCompletion([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ])

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("La réponse du modèle ne contient pas de JSON valide : " + raw.slice(0, 300))
    const parsed = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ success: true, content: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
