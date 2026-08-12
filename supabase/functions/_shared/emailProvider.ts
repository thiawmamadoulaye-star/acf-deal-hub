// Abstraction du fournisseur d'envoi d'emails transactionnels (Resend).
// Sans RESEND_API_KEY, retourne "skipped_no_provider" sans erreur.

export interface SendEmailResult {
  status: 'sent' | 'failed' | 'skipped_no_provider'
  providerResponse?: unknown
}

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'ACF DEAL HUB <onboarding@resend.dev>'

  if (!apiKey) {
    console.warn(`[emailProvider] RESEND_API_KEY non configurée — email à ${params.to} non envoyé.`)
    return { status: 'skipped_no_provider' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, html: params.html }),
    })
    const data = await res.json()
    if (!res.ok) return { status: 'failed', providerResponse: data }
    return { status: 'sent', providerResponse: data }
  } catch (err) {
    return { status: 'failed', providerResponse: { error: (err as Error).message } }
  }
}

function baseTemplate(bodyHtml: string): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9fafb; padding: 24px;">
    <div style="background: #152447; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <span style="color: #d49a1e; font-weight: bold; font-size: 18px;">ACF DEAL HUB</span>
      <div style="color: #b0c1e1; font-size: 12px; margin-top: 2px;">Advanced Capital & Finance — Dakar, Sénégal</div>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
      ${bodyHtml}
    </div>
    <div style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
      © ${new Date().getFullYear()} Advanced Capital & Finance. Cet email est envoyé automatiquement.
    </div>
  </div>`
}

export function signatureRequestTemplate(params: { signatoryName: string; title: string; link: string }): string {
  return baseTemplate(`
    <h2 style="color: #152447; font-size: 18px;">Demande de signature électronique</h2>
    <p>Bonjour ${params.signatoryName},</p>
    <p>ACF vous invite à consulter et signer électroniquement le document suivant :</p>
    <p style="font-weight: bold; color: #152447;">${params.title}</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.link}" style="background: #d49a1e; color: #152447; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Consulter et signer le document
      </a>
    </div>
    <p style="font-size: 12px; color: #6b7280;">Ce lien est personnel et confidentiel, valable 14 jours.</p>
  `)
}

export function newMessageTemplate(params: { recipientName: string; senderName: string; mandateTitle: string; messagePreview: string; link: string }): string {
  return baseTemplate(`
    <h2 style="color: #152447; font-size: 18px;">Nouveau message</h2>
    <p>Bonjour ${params.recipientName},</p>
    <p><strong>${params.senderName}</strong> vous a envoyé un message concernant le mandat
      <strong>${params.mandateTitle}</strong> :</p>
    <div style="background: #f3f4f6; border-left: 3px solid #d49a1e; padding: 12px 16px; margin: 16px 0; font-style: italic; color: #374151;">
      « ${params.messagePreview} »
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.link}" style="background: #152447; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Répondre sur ACF DEAL HUB
      </a>
    </div>
  `)
}

export function signatureCompletedTemplate(params: { title: string; signatoryName: string; link: string }): string {
  return baseTemplate(`
    <h2 style="color: #152447; font-size: 18px;">Document signé ✅</h2>
    <p>Le document <strong>${params.title}</strong> vient d'être signé par ${params.signatoryName}.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.link}" style="background: #152447; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Consulter sur ACF DEAL HUB
      </a>
    </div>
  `)
}

export function invoiceOverdueTemplate(params: { invoiceNumber: string; amount: string; mandateTitle: string; link: string }): string {
  return baseTemplate(`
    <h2 style="color: #b91c1c; font-size: 18px;">Facture en retard de paiement</h2>
    <p>La facture <strong>${params.invoiceNumber}</strong> (${params.amount}) liée au mandat
      <strong>${params.mandateTitle}</strong> est désormais en retard de paiement.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${params.link}" style="background: #152447; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Voir la facture
      </a>
    </div>
  `)
}
