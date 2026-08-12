import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageSquare, FileSignature, CheckCircle2, AlertTriangle, Clock, Briefcase, Info } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification, NotificationType } from '@/types/database'

const iconMap: Record<NotificationType, JSX.Element> = {
  new_message: <MessageSquare size={16} className="text-blue-600" />,
  signature_request: <FileSignature size={16} className="text-gold-600" />,
  signature_signed: <CheckCircle2 size={16} className="text-emerald-600" />,
  signature_declined: <AlertTriangle size={16} className="text-red-600" />,
  invoice_overdue: <AlertTriangle size={16} className="text-red-600" />,
  dd_deadline: <Clock size={16} className="text-amber-600" />,
  deal_stage_change: <Briefcase size={16} className="text-navy-600" />,
  mandate_update: <Briefcase size={16} className="text-navy-600" />,
  other: <Info size={16} className="text-gray-500" />,
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

export default function NotificationBell() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function loadNotifications() {
    if (!profile) return
    const { data } = await supabase.from('notifications').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(20)
    setNotifications((data as AppNotification[]) ?? [])
  }

  useEffect(() => {
    loadNotifications()
    if (!profile) return
    const channel = supabase.channel(`notifications-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` }, () => loadNotifications())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleOpenNotification(n: AppNotification) {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative text-gray-500 hover:text-navy-800">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[420px] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-navy-700 hover:text-navy-900">Tout marquer comme lu</button>
            )}
          </div>
          <div className="overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">Aucune notification</div>
            ) : (
              notifications.map((n) => (
                <button key={n.id} onClick={() => handleOpenNotification(n)} className={`w-full text-left flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!n.is_read ? 'bg-navy-50/50' : ''}`}>
                  <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</div>
                    {n.body && <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</div>}
                    <div className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-gold-500 rounded-full mt-1.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
