import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, icon, hint, tone = 'default' }: { label: string; value: ReactNode; icon: ReactNode; hint?: string; tone?: 'default' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tone === 'warn' ? 'bg-terracotta-50 text-terracotta-600' : 'bg-forest-50 text-forest-600')} aria-hidden>{icon}</span>
      </div>
      <p className={cn('mt-3 font-serif text-3xl font-semibold', tone === 'warn' && 'text-terracotta-600')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
