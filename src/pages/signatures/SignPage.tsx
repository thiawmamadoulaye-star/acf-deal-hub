import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShieldCheck, FileSignature, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import SignaturePad from '@/components/ui/SignaturePad'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const functionsUrl = `${supabaseUrl}/functions/v1/sign-document`

interface SignatureRequestInfo {
  id: string
  title: string
  document_type: string
  signatory_name: string
  signatory_email: string
  status: string
  expires_at: string
  mandates?: { reference: string; title: string } | null
}

export default function SignPage() {
  const { token } = useParams()
  const [request, setRequest] = useState<SignatureRequestInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signatoryName, setSignatoryName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'signed' | 'declined' | null>(null)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => {
    async function fetchRequest() {
      try {
        const res = await fetch(`${functionsUrl}?token=${token}`, { headers: { apikey: supabaseAnonKey } })
        const json = await res.json()
        if (!json.success) {
          setError(json.error ?? 'Demande introuvable.')
        } else {
          setRequest(json.data)
          setSignatoryName(json.data.signatory_name)
        }
      } catch (err) {
        setError('Impossible de charger la demande de signature.')
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchRequest()
  }, [token])

  async function handleSign() {
    if (!signatureData) return
    setSubmitting(true)
    try {
      const res = await fetch(functionsUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
        body: JSON.stringify({ token, action: 'sign', signatureDataUrl: signatureData, signatoryName }),
      })
      const json = await res.json()
      if (json.success) setResult('signed'); else setError(json.error)
    } finally { setSubmitting(false) }
  }

  async function handleDecline() {
    setSubmitting(true)
    try {
      const res = await fetch(functionsUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
        body: JSON.stringify({ token, action: 'decline', reason: declineReason }),
      })
      const json = await res.json()
      if (json.success) setResult('declined'); else setError(json.error)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500 mb-3"><ShieldCheck size={28} className="text-navy-950" /></div>
          <h1 className="text-xl font-bold text-white">ACF DEAL HUB</h1>
          <p className="text-navy-300 text-sm">Signature électronique sécurisée</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {loading && <div className="text-center text-gray-400 py-10">Chargement de la demande…</div>}

          {!loading && error && (
            <div className="text-center py-8">
              <AlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
              <p className="text-gray-700 font-medium">{error}</p>
            </div>
          )}

          {!loading && request && !error && result === null && (
            <>
              {request.status !== 'pending' ? (
                <div className="text-center py-8">
                  {request.status === 'signed' && <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />}
                  {request.status === 'expired' && <Clock size={40} className="mx-auto text-gray-400 mb-3" />}
                  {request.status === 'declined' && <XCircle size={40} className="mx-auto text-red-500 mb-3" />}
                  <p className="text-gray-700 font-medium">
                    {request.status === 'signed' && 'Ce document a déjà été signé.'}
                    {request.status === 'expired' && 'Cette demande de signature a expiré.'}
                    {request.status === 'declined' && 'Cette signature a été refusée.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4"><FileSignature size={20} className="text-navy-700" /><h2 className="font-bold text-gray-900">{request.title}</h2></div>
                  {request.mandates && <div className="text-sm text-gray-500 mb-4">Mandat : {request.mandates.reference} — {request.mandates.title}</div>}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-4">
                    En signant ce document, vous confirmez votre accord. Votre signature, IP et l'horodatage seront enregistrés à des fins de preuve.
                  </div>

                  {!showDeclineForm ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Signataire</label>
                        <input className="input-field" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
                      </div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Votre signature</label>
                      <SignaturePad onChange={setSignatureData} signatoryName={request.signatory_name} />
                      <div className="flex gap-3 mt-5">
                        <button onClick={() => setShowDeclineForm(true)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Refuser</button>
                        <button onClick={handleSign} disabled={!signatureData || submitting} className="flex-1 btn-gold disabled:opacity-60">{submitting ? 'Envoi…' : 'Signer le document'}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motif du refus (optionnel)</label>
                      <textarea className="input-field" rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowDeclineForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Annuler</button>
                        <button onClick={handleDecline} disabled={submitting} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-60">{submitting ? 'Envoi…' : 'Confirmer le refus'}</button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {result === 'signed' && (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900 mb-1">Document signé avec succès</p>
              <p className="text-sm text-gray-500">Merci, votre signature a bien été enregistrée par ACF.</p>
            </div>
          )}

          {result === 'declined' && (
            <div className="text-center py-8">
              <XCircle size={48} className="mx-auto text-red-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900 mb-1">Signature refusée</p>
              <p className="text-sm text-gray-500">Votre réponse a été transmise à ACF.</p>
            </div>
          )}
        </div>

        <p className="text-center text-navy-400 text-xs mt-4">© {new Date().getFullYear()} Advanced Capital & Finance — Dakar, Sénégal</p>
      </div>
    </div>
  )
}
