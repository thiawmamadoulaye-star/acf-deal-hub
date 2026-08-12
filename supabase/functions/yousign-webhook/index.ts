// Edge Function : yousign-webhook — réception des statuts Yousign.
// Déploiement : supabase functions deploy yousign-webhook --no-verify-jwt
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)
const webhookSecret = Deno.env.get('YOUSIGN_WEBHOOK_SECRET')

const EVENT_STATUS_MAP: Record<string, string> = {
  'signature_request.done': 'signed',
  'signer.done': 'signed',
  'signature_request.declined': 'declined',
  'signer.declined': 'declined',
  'signature_request.expired': 'expired',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Méthode non supportée.' }), { status: 405 })
  }

  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get('x-yousign-signature') ?? ''

    if (webhookSecret) {
      const isValid = await verifyHmacSignature(rawBody, signatureHeader, webhookSecret)
      if (!isValid) {
        return new Response(JSON.stringify({ success: false, error: 'Signature webhook invalide.' }), { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    const eventType: string = payload.event_name ?? payload.event ?? 'unknown'
    const procedureId: string | undefined = payload.data?.signature_request?.id ?? payload.data?.id

    await supabase.from('esignature_webhook_events').insert({
      provider: 'yousign', event_type: eventType, payload, processed: false,
    })

    const mappedStatus = EVENT_STATUS_MAP[eventType]
    if (mappedStatus && procedureId) {
      const { data: sr } = await supabase
        .from('signature_requests').select('id')
        .eq('provider_request_id', procedureId).eq('provider', 'yousign').maybeSingle()

      if (sr) {
        const update: Record<string, unknown> = { status: mappedStatus }
        if (mappedStatus === 'signed') update.signed_at = new Date().toISOString()

        await supabase.from('signature_requests').update(update).eq('id', sr.id)

        await supabase.from('esignature_webhook_events')
          .update({ processed: true, signature_request_id: sr.id })
          .eq('provider', 'yousign').eq('event_type', eventType).is('processed', false)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function verifyHmacSignature(rawBody: string, signatureHeader: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
    const computedHex = Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
    return computedHex === signatureHeader
  } catch {
    return false
  }
}
