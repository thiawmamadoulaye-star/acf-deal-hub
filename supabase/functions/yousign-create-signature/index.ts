// Edge Function : yousign-create-signature — signature qualifiée eIDAS via Yousign.
// Prérequis : supabase secrets set YOUSIGN_API_KEY=xxxxx
// Le document doit contenir la chaîne "SIGNATURE_ICI" comme ancre.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const yousignApiKey = Deno.env.get('YOUSIGN_API_KEY')
const yousignApiUrl = Deno.env.get('YOUSIGN_API_URL') ?? 'https://api-sandbox.yousign.app/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!yousignApiKey) {
      return jsonResponse({
        success: false,
        error: "Yousign n'est pas configuré. Définissez YOUSIGN_API_KEY dans les secrets Supabase.",
      }, 400)
    }

    const { signatureRequestId } = await req.json()

    const { data: sr, error: srError } = await supabase
      .from('signature_requests').select('*, document:documents(*)').eq('id', signatureRequestId).single()

    if (srError || !sr) return jsonResponse({ success: false, error: 'Demande de signature introuvable.' }, 404)
    if (!sr.document) {
      return jsonResponse({ success: false, error: 'Aucun document associé. Liez un document de la Data Room.' }, 400)
    }

    const yousignHeaders = { Authorization: `Bearer ${yousignApiKey}`, 'Content-Type': 'application/json' }

    const procedureRes = await fetch(`${yousignApiUrl}/signature_requests`, {
      method: 'POST', headers: yousignHeaders,
      body: JSON.stringify({ name: sr.title, delivery_mode: 'email' }),
    })
    const procedure = await procedureRes.json()
    if (!procedureRes.ok) return jsonResponse({ success: false, error: 'Erreur Yousign (procédure)', details: procedure }, 502)
    const procedureId = procedure.id

    const { data: fileBlob, error: downloadError } = await supabase.storage.from('dataroom').download(sr.document.file_path)
    if (downloadError || !fileBlob) return jsonResponse({ success: false, error: 'Impossible de récupérer le document.' }, 500)

    const formData = new FormData()
    formData.append('file', fileBlob, sr.document.filename)
    formData.append('nature', 'signable_document')

    const docRes = await fetch(`${yousignApiUrl}/signature_requests/${procedureId}/documents`, {
      method: 'POST', headers: { Authorization: `Bearer ${yousignApiKey}` }, body: formData,
    })
    const documentRecord = await docRes.json()
    if (!docRes.ok) return jsonResponse({ success: false, error: 'Erreur Yousign (upload)', details: documentRecord }, 502)

    const signerRes = await fetch(`${yousignApiUrl}/signature_requests/${procedureId}/signers`, {
      method: 'POST', headers: yousignHeaders,
      body: JSON.stringify({
        info: {
          first_name: sr.signatory_name.split(' ')[0] || sr.signatory_name,
          last_name: sr.signatory_name.split(' ').slice(1).join(' ') || '-',
          email: sr.signatory_email, locale: 'fr',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'no_otp',
        fields: [{ document_id: documentRecord.id, type: 'signature', anchor_string: 'SIGNATURE_ICI', anchor_position: 'after' }],
      }),
    })
    const signer = await signerRes.json()
    if (!signerRes.ok) return jsonResponse({ success: false, error: 'Erreur Yousign (signataire)', details: signer }, 502)

    const activateRes = await fetch(`${yousignApiUrl}/signature_requests/${procedureId}/activate`, {
      method: 'POST', headers: yousignHeaders,
    })
    if (!activateRes.ok) {
      const activateError = await activateRes.json()
      return jsonResponse({ success: false, error: 'Erreur Yousign (activation)', details: activateError }, 502)
    }

    await supabase.from('signature_requests').update({
      provider: 'yousign', provider_request_id: procedureId,
      provider_metadata: { document_id: documentRecord.id, signer_id: signer.id },
    }).eq('id', signatureRequestId)

    return jsonResponse({ success: true, procedureId })
  } catch (err) {
    return jsonResponse({ success: false, error: (err as Error).message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
