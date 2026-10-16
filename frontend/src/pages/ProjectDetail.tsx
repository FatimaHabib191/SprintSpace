import { Archive, ArrowLeft, CalendarDays, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { deadlineLabel } from '@/components/projects/ProjectCard'
import { useProjectActions } from '@/components/projects/useProjectActions'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { EmptyState, ErrorState, PageLoader, ProgressBar, Skeleton } from '@/components/ui/misc'
import { useProject, useProjectTasks } from '@/hooks/queries'
import { useDebounced } from '@/hooks/useDebounced'
import { useTaskPanels } from '@/hooks/useTaskPanels'
import { ApiError, errorMessage } from '@/lib/api'
import { PRIORITIES, type TaskPriority } from '@/lib/types'
import { cn, formatDay, plural } from '@/lib/utils'
import { ListChecks } from 'lucide-react'

export function ProjectDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const tasks = useProjectTasks(id)
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<'' | TaskPriority>('')
  const debounced = useDebounced(search.trim().toLowerCase(), 200)
  const { open, create, panels } = useTaskPanels({ projectId: id, lockProject: false })
  const actions = useProjectActions({ onDeleted: () => navigate('/app/projects', { replace: true }) })

  const all = useMemo(() => tasks.data ?? [], [tasks.data])
  const filtersActive = !!debounced || !!priority
  const visible = useMemo(
    () =>
      all.filter(
        (t) =>
          (!priority || t.priority === priority) &&
          (!debounced || t.title.toLowerCase().includes(debounced) || t.description.toLowerCase().includes(debounced)),
      ),
    [all, debounced, priority],
  )

  if (project.isLoading) return <PageLoader label="Loading project…" />
  if (project.isError) {
    const notFound = project.error instanceof ApiError && project.error.status === 404
    return (
      <div className="mx-auto max-w-md pt-10">
        {notFound ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="Project not found" body="It may have been deleted, or the link is wrong." action={<Button asChild><Link to="/app/projects">Back to projects</Link></Button>} />
        ) : (
          <ErrorState message={errorMessage(project.error, 'Could not load this project')} onRetry={() => project.refetch()} />
        )}
      </div>
    )
  }

  const p = project.data!
  const dl = deadlineLabel(p)

  return (
    <>
      <Link to="/app/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-charcoal">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All projects
      </Link>

      <header className="mb-6 rounded-2xl border border-line bg-paper p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
              <h1 className="break-words font-serif text-2xl font-semibold sm:text-3xl">{p.name}</h1>
              {p.archived && <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sage-600">Archived</span>}
            </div>
            {p.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-ink-soft">{p.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-muted">
              {p.startDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> Starts {formatDay(p.startDate)}</span>}
              {dl && <span className={cn('inline-flex items-center gap-1.5', dl.tone === 'late' && 'font-semibold text-terracotta-600', dl.tone === 'warn' && 'font-medium text-ochre-600')}><CalendarDays className="h-3.5 w-3.5" aria-hidden /> {dl.text}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => actions.edit(p)}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="outline" size="sm" onClick={() => actions.archive(p)}>
              {p.archived ? <><RotateCcw className="h-4 w-4" /> Restore</> : <><Archive className="h-4 w-4" /> Archive</>}
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => actions.askDelete(p)}><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-ink-muted">{p.taskCount === 0 ? 'No tasks yet' : `${p.doneCount} of ${plural(p.taskCount, 'task')} complete`}</span>
              <span className="font-semibold">{p.completion}%</span>
            </div>
            <ProgressBar value={p.completion} color={p.color} label="Project completion" />
          </div>
          <dl className="flex gap-6 text-xs text-ink-muted">
            <div><dt>In progress</dt><dd className="font-serif text-lg font-semibold text-charcoal">{p.inProgressCount}</dd></div>
            <div><dt>Overdue</dt><dd className={cn('font-serif text-lg font-semibold', p.overdueCount ? 'text-terracotta-600' : 'text-charcoal')}>{p.overdueCount}</dd></div>
          </dl>
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input type="search" aria-label="Search tasks in this project" placeholder="Search tasks…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect aria-label="Filter by priority" className="sm:w-44" value={priority} onChange={(e) => setPriority(e.target.value as '' | TaskPriority)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </NativeSelect>
        {filtersActive && <Button variant="ghost" onClick={() => { setSearch(''); setPriority('') }}>Clear</Button>}
        <Button onClick={() => create('todo')}><Plus className="h-4 w-4" /> New task</Button>
      </div>

      {tasks.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : tasks.isError ? (
        <ErrorState message={errorMessage(tasks.error, 'Could not load tasks')} onRetry={() => tasks.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-6 w-6" />} title="No tasks in this project yet" body="Add your first task and it will appear in the To Do column, ready to drag across the board." action={<Button onClick={() => create('todo')}><Plus className="h-4 w-4" /> Add the first task</Button>} />
      ) : (
        <>
          <KanbanBoard projectId={id} allTasks={all} visibleTasks={visible} filtersActive={filtersActive} onOpenTask={open} onAddTask={create} />
          <p className="mt-2 text-xs text-ink-muted">Tip: drag cards to move them, or focus a card and press Space, then use the arrow keys. Press Enter to open it.</p>
        </>
      )}

      {panels}
      {actions.dialogs}
    </>
  )
}
