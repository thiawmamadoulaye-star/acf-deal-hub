import { ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function NoAccessYet() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500 mb-4">
          <ShieldCheck size={28} className="text-navy-950" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Espace en cours de préparation</h1>
        <p className="text-sm text-gray-500 mb-6">
          Bonjour {profile?.first_name}, votre profil ({profile?.role}) ne dispose pas encore d'un espace dédié.
          Contactez votre interlocuteur ACF pour plus d'informations.
        </p>
        <button onClick={signOut} className="btn-primary inline-flex items-center gap-2">
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>
    </div>
  )
}
