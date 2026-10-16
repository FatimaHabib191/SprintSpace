import { Archive, CalendarDays, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { Link } from 'react-router-dom'
import { ProgressBar } from '@/components/ui/misc'
import type { Project } from '@/lib/types'
import { cn, daysUntil, formatDay, plural } from '@/lib/utils'

interface Props {
  project: Project
  onEdit: (p: Project) => void
  onArchive: (p: Project) => void
  onDelete: (p: Project) => void
}

export function deadlineLabel(p: Project): { text: string; tone: 'normal' | 'warn' | 'late' } | null {
  if (!p.deadline) return null
  const d = daysUntil(p.deadline)
  const done = p.taskCount > 0 && p.doneCount === p.taskCount
  if (done) return { text: `Due ${formatDay(p.deadline, 'MMM d')}`, tone: 'normal' }
  if (d < 0) return { text: `${plural(-d, 'day')} past deadline`, tone: 'late' }
  if (d === 0) return { text: 'Due today', tone: 'warn' }
  if (d <= 7) return { text: `Due in ${plural(d, 'day')}`, tone: 'warn' }
  return { text: `Due ${formatDay(p.deadline, 'MMM d, yyyy')}`, tone: 'normal' }
}

export function ProjectCard({ project: p, onEdit, onArchive, onDelete }: Props) {
  const dl = deadlineLabel(p)
  return (
    <article className={cn('relative rounded-2xl border border-line bg-paper p-5 shadow-soft transition-shadow hover:shadow-lift', p.archived && 'opacity-75')}>
      <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: p.color }} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg font-semibold">
            <Link to={`/app/projects/${p.id}`} className="after:absolute after:inset-0 after:rounded-2xl hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-forest-600">
              {p.name}
            </Link>
          </h3>
          {p.archived && <span className="mt-1 inline-block rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sage-600">Archived</span>}
        </div>
        <Menu.Root>
          <Menu.Trigger
            aria-label={`Actions for ${p.name}`}
            className="relative z-10 -mr-2 -mt-1 rounded-md p-1.5 text-ink-muted hover:bg-sage-100 hover:text-charcoal"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={4} className="z-50 min-w-44 rounded-xl border border-line bg-paper p-1 shadow-lift">
              <MenuItem icon={<Pencil className="h-4 w-4" />} onSelect={() => onEdit(p)}>Edit project</MenuItem>
              <MenuItem icon={p.archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />} onSelect={() => onArchive(p)}>
                {p.archived ? 'Restore project' : 'Archive project'}
              </MenuItem>
              <Menu.Separator className="my-1 h-px bg-line" />
              <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onSelect={() => onDelete(p)}>Delete project</MenuItem>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>

      <p className="mt-2 line-clamp-2 min-h-10 text-sm text-ink-muted">{p.description || 'No description'}</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-muted">{p.taskCount === 0 ? 'No tasks yet' : `${p.doneCount} of ${plural(p.taskCount, 'task')} done`}</span>
          <span className="font-semibold">{p.completion}%</span>
        </div>
        <ProgressBar value={p.completion} color={p.color} label={`${p.name} completion`} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        {dl ? (
          <span className={cn('inline-flex items-center gap-1.5', dl.tone === 'late' ? 'font-semibold text-terracotta-600' : dl.tone === 'warn' ? 'font-medium text-ochre-600' : 'text-ink-muted')}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {dl.text}
          </span>
        ) : (
          <span className="text-ink-muted">No deadline</span>
        )}
        {p.overdueCount > 0 && <span className="font-medium text-terracotta-600">{p.overdueCount} overdue</span>}
      </div>
    </article>
  )
}

function MenuItem({ children, icon, onSelect, danger }: { children: React.ReactNode; icon: React.ReactNode; onSelect: () => void; danger?: boolean }) {
  return (
    <Menu.Item
      onSelect={onSelect}
      className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-sage-100', danger && 'text-terracotta-600 data-[highlighted]:bg-terracotta-50')}
    >
      {icon} {children}
    </Menu.Item>
  )
}
