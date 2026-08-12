// Edge Function : sign-document — signature native via token d'accès unique.
// Déploiement : supabase functions deploy sign-document --no-verify-jwt
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail, signatureCompletedTemplate } from '../_shared/emailProvider.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)
const appUrl = Deno.env.get('APP_URL') ?? 'https://app.acfsenegal.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)

  try {
    if (req.method === 'GET') {
      const token = url.searchParams.get('token')
      if (!token) return jsonResponse({ success: false, error: 'Token manquant.' }, 400)

      const { data, error } = await supabase
        .from('signature_requests')
        .select('id, title, document_type, signatory_name, signatory_email, status, expires_at, created_at, mandate_id, mandates(reference, title)')
        .eq('access_token', token)
        .maybeSingle()

      if (error || !data) return jsonResponse({ success: false, error: 'Demande de signature introuvable.' }, 404)

      if (data.status === 'pending' && new Date(data.expires_at) < new Date()) {
        await supabase.from('signature_requests').update({ status: 'expired' }).eq('id', data.id)
        data.status = 'expired'
      }

      return jsonResponse({ success: true, data })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { token, action } = body
      if (!token || !action) return jsonResponse({ success: false, error: 'Paramètres manquants.' }, 400)

      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('access_token', token)
        .maybeSingle()

      if (fetchError || !request) return jsonResponse({ success: false, error: 'Demande de signature introuvable.' }, 404)
      if (request.status !== 'pending') {
        return jsonResponse({ success: false, error: `Cette demande est déjà au statut "${request.status}".` }, 409)
      }
      if (new Date(request.expires_at) < new Date()) {
        await supabase.from('signature_requests').update({ status: 'expired' }).eq('id', request.id)
        return jsonResponse({ success: false, error: 'Cette demande de signature a expiré.' }, 410)
      }

      const clientIp = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'inconnue'

      if (action === 'sign') {
        const { signatureDataUrl, signatoryName } = body
        if (!signatureDataUrl) return jsonResponse({ success: false, error: 'Signature manquante.' }, 400)

        const { error: updateError } = await supabase
          .from('signature_requests')
          .update({
            status: 'signed',
            signature_data_url: signatureDataUrl,
            signatory_name: signatoryName || request.signatory_name,
            signed_at: new Date().toISOString(),
            signer_ip: clientIp,
          })
          .eq('id', request.id)

        if (updateError) throw updateError

        await supabase.from('activity_logs').insert({
          organization_id: request.organization_id,
          entity_type: 'signature_request',
          entity_id: request.id,
          action: 'signed',
          details: { signatory_email: request.signatory_email, ip: clientIp },
        })

        try {
          if (request.created_by) {
            const { data: creator } = await supabase
              .from('profiles').select('id, email').eq('id', request.created_by).single()

            if (creator?.email) {
              const link = `${appUrl}/signatures`
              const html = signatureCompletedTemplate({
                title: request.title, signatoryName: signatoryName || request.signatory_name, link,
              })
              const emailResult = await sendEmail({ to: creator.email, subject: `Document signé — ${request.title}`, html })
              await supabase.from('email_logs').insert({
                organization_id: request.organization_id, to_email: creator.email,
                subject: `Document signé — ${request.title}`, template: 'signature_completed',
                status: emailResult.status, provider_response: emailResult.providerResponse ?? null,
              })
              await supabase.rpc('create_notification', {
                p_organization_id: request.organization_id, p_profile_id: creator.id,
                p_type: 'signature_signed', p_title: 'Document signé',
                p_body: `${request.title} a été signé par ${signatoryName || request.signatory_name}`, p_link: link,
              })
            }
          }
        } catch (notifyErr) {
          console.warn('Notification post-signature non envoyée :', notifyErr)
        }

        return jsonResponse({ success: true, message: 'Document signé avec succès.' })
      }

      if (action === 'decline') {
        const { reason } = body
        const { error: updateError } = await supabase
          .from('signature_requests')
          .update({ status: 'declined', decline_reason: reason ?? null })
          .eq('id', request.id)

        if (updateError) throw updateError

        await supabase.from('activity_logs').insert({
          organization_id: request.organization_id, entity_type: 'signature_request',
          entity_id: request.id, action: 'declined', details: { reason, ip: clientIp },
        })

        return jsonResponse({ success: true, message: 'Signature refusée.' })
      }

      return jsonResponse({ success: false, error: 'Action non reconnue.' }, 400)
    }

    return jsonResponse({ success: false, error: 'Méthode non supportée.' }, 405)
  } catch (err) {
    return jsonResponse({ success: false, error: (err as Error).message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
