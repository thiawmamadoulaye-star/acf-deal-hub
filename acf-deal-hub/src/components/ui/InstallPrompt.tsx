import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('acf_install_prompt_dismissed')
    if (alreadyDismissed) { setDismissed(true); return }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    if (iOS) { setIsIOS(true); setVisible(true); return }

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem('acf_install_prompt_dismissed', '1')
    setDismissed(true)
    setVisible(false)
  }

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-navy-950 text-white rounded-xl shadow-2xl p-4 flex items-start gap-3 border border-navy-800">
        <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-navy-950" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Installer ACF DEAL HUB</div>
          {isIOS ? (
            <p className="text-xs text-navy-300 mt-1">
              Appuyez sur <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>.
            </p>
          ) : (
            <p className="text-xs text-navy-300 mt-1">
              Accédez plus rapidement à vos mandats en installant l'application.
            </p>
          )}
          {!isIOS && (
            <button onClick={handleInstall} className="mt-2 flex items-center gap-1.5 bg-gold-500 text-navy-950 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gold-600">
              <Download size={14} /> Installer
            </button>
          )}
        </div>
        <button onClick={handleDismiss} className="text-navy-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
