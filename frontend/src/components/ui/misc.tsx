import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/lib/types'
import { priorityLabel } from '@/lib/types'
import { Button } from './button'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-forest-600', className)} aria-hidden />
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-ink-muted">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-sage-100', className)} aria-hidden />
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-paper/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-600">{icon}</div>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-terracotta-100 bg-terracotta-50 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-terracotta-600" aria-hidden />
      <p className="text-sm font-medium text-terracotta-700">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  )
}

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-sage-100 text-sage-600',
  medium: 'bg-ochre-50 text-ochre-600',
  high: 'bg-terracotta-100 text-terracotta-700',
  urgent: 'bg-terracotta-600 text-white',
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', priorityStyles[priority], className)}>
      {priorityLabel(priority)}
    </span>
  )
}

export function ProgressBar({ value, color = '#2f5d46', label }: { value: number; color?: string; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label ?? 'Completion'}
      className="h-1.5 w-full overflow-hidden rounded-full bg-sage-100"
    >
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-serif text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-serif text-lg font-semibold', light ? 'text-ivory' : 'text-forest-800', className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#faf6ee' : '#2f5d46'} />
        <path d="M9 21.5l5-5 3.5 3.5 6-8" fill="none" stroke={light ? '#2f5d46' : '#faf6ee'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23.5" cy="12" r="2" fill="#c4704f" />
      </svg>
      SprintSpace
    </span>
  )
}
