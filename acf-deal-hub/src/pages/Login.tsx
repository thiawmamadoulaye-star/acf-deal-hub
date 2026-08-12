import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError("Identifiants invalides. Vérifiez votre email et mot de passe.")
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500 mb-4">
            <ShieldCheck size={32} className="text-navy-950" />
          </div>
          <h1 className="text-2xl font-bold text-white">ACF DEAL HUB</h1>
          <p className="text-navy-300 text-sm mt-1">Advanced Capital & Finance — Plateforme de gestion des transactions</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email professionnelle</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="prenom.nom@acfsenegal.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>
          <p className="text-xs text-center text-gray-400 pt-2">Accès réservé aux collaborateurs, clients et partenaires autorisés d'ACF.</p>
        </form>
      </div>
    </div>
  )
}
