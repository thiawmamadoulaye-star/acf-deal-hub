// Edge Function : send-notification-email — notifications in-app + emails.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  sendEmail, signatureRequestTemplate, newMessageTemplate,
  signatureCompletedTemplate, invoiceOverdueTemplate,
} from '../_shared/emailProvider.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRoleKey)

interface RequestBody {
  template: 'signature_request' | 'new_message' | 'signature_completed' | 'invoice_overdue'
  organizationId: string
  recipientProfileId?: string
  toEmail: string
  data: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body: RequestBody = await req.json()
    const { template, organizationId, recipientProfileId, toEmail, data } = body

    let subject = ''
    let html = ''
    let notificationType = 'other'
    let notificationTitle = ''
    let notificationBody = ''
    let link = data.link ?? '/'

    switch (template) {
      case 'signature_request':
        subject = `Demande de signature — ${data.title}`
        html = signatureRequestTemplate({ signatoryName: data.signatoryName, title: data.title, link: data.link })
        notificationType = 'signature_request'
        notificationTitle = 'Nouvelle demande de signature envoyée'
        notificationBody = `${data.title} — en attente de la signature de ${data.signatoryName}`
        break
      case 'new_message':
        subject = `Nouveau message — ${data.mandateTitle}`
        html = newMessageTemplate({
          recipientName: data.recipientName, senderName: data.senderName,
          mandateTitle: data.mandateTitle, messagePreview: data.messagePreview, link: data.link,
        })
        notificationType = 'new_message'
        notificationTitle = `Nouveau message de ${data.senderName}`
        notificationBody = data.messagePreview
        break
      case 'signature_completed':
        subject = `Document signé — ${data.title}`
        html = signatureCompletedTemplate({ title: data.title, signatoryName: data.signatoryName, link: data.link })
        notificationType = 'signature_signed'
        notificationTitle = 'Document signé'
        notificationBody = `${data.title} a été signé par ${data.signatoryName}`
        break
      case 'invoice_overdue':
        subject = `Facture en retard — ${data.invoiceNumber}`
        html = invoiceOverdueTemplate({
          invoiceNumber: data.invoiceNumber, amount: data.amount, mandateTitle: data.mandateTitle, link: data.link,
        })
        notificationType = 'invoice_overdue'
        notificationTitle = `Facture ${data.invoiceNumber} en retard`
        notificationBody = `${data.amount} — ${data.mandateTitle}`
        break
      default:
        return new Response(JSON.stringify({ success: false, error: 'Template inconnu.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    if (recipientProfileId) {
      await supabase.rpc('create_notification', {
        p_organization_id: organizationId, p_profile_id: recipientProfileId,
        p_type: notificationType, p_title: notificationTitle, p_body: notificationBody, p_link: link,
      })
    }

    const result = await sendEmail({ to: toEmail, subject, html })

    await supabase.from('email_logs').insert({
      organization_id: organizationId, to_email: toEmail, subject, template,
      status: result.status, provider_response: result.providerResponse ?? null,
    })

    return new Response(JSON.stringify({ success: true, emailStatus: result.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
