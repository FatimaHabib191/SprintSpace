import { CalendarDays } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/misc'
import { statusLabel, type Task } from '@/lib/types'
import { cn, formatDay, isOverdue } from '@/lib/utils'

export function TaskRow({ task, onOpen, showProject = true }: { task: Task; onOpen: (t: Task) => void; showProject?: boolean }) {
  const overdue = isOverdue(task.dueDate, task.status)
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="flex w-full flex-col gap-2 rounded-xl px-4 py-3 text-left transition-colors hover:bg-sage-50 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-medium', task.status === 'done' && 'text-ink-muted line-through')}>{task.title}</span>
          {showProject && (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.projectColor ?? '#2f5d46' }} aria-hidden />
              {task.projectName ?? 'Project'}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700">{statusLabel(task.status)}</span>
          <PriorityBadge priority={task.priority} />
          <span className={cn('inline-flex min-w-24 items-center gap-1 text-xs', overdue ? 'font-semibold text-terracotta-600' : 'text-ink-muted')}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {task.dueDate ? formatDay(task.dueDate, 'MMM d, yyyy') : 'No due date'}
            {overdue && <span className="sr-only"> (overdue)</span>}
          </span>
        </span>
      </button>
    </li>
  )
}
