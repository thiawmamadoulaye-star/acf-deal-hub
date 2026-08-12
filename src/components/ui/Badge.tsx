import { ReactNode } from 'react'
import clsx from 'clsx'

type BadgeColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'gold' | 'navy'

const colorMap: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gold: 'bg-gold-100 text-gold-800',
  navy: 'bg-navy-100 text-navy-800',
}

export default function Badge({ children, color = 'gray' }: { children: ReactNode; color?: BadgeColor }) {
  return <span className={clsx('badge', colorMap[color])}>{children}</span>
}
