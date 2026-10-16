import { ChevronLeft, ChevronRight, ListChecks, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TaskRow } from '@/components/tasks/TaskRow'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/misc'
import { useProjects, useTasks } from '@/hooks/queries'
import { useDebounced } from '@/hooks/useDebounced'
import { useTaskPanels } from '@/hooks/useTaskPanels'
import { errorMessage } from '@/lib/api'
import { PRIORITIES, STATUSES, type TaskPriority, type TaskStatus } from '@/lib/types'
import { plural } from '@/lib/utils'

const PAGE_SIZE = 20

export function Tasks() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debounced = useDebounced(search.trim())
  const status = (params.get('status') ?? '') as '' | TaskStatus
  const priority = (params.get('priority') ?? '') as '' | TaskPriority
  const project = params.get('project') ?? ''
  const overdue = params.get('overdue') === 'true'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const projects = useProjects({ archived: 'all', limit: 100 })
  const q = useTasks({
    search: debounced || undefined,
    status: status || undefined,
    priority: priority || undefined,
    project: project || undefined,
    overdue: overdue || undefined,
    page,
    limit: PAGE_SIZE,
    sort: 'updatedAt',
  })
  const { open, create, panels } = useTaskPanels()

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const filtering = !!(debounced || status || priority || project || overdue)
  const clear = () => {
    setSearch('')
    setParams({}, { replace: true })
  }
  const items = q.data?.data ?? []
  const meta = q.data?.meta
  const hasProjects = (projects.data?.data.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title="All tasks"
        subtitle={meta ? `${plural(meta.total, 'task')}${filtering ? ' match your filters' : ' across all projects'}` : 'Search and filter across every project.'}
        actions={<Button onClick={() => create('todo')} disabled={!hasProjects}><Plus className="h-4 w-4" /> New task</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input type="search" aria-label="Search tasks" placeholder="Search tasks…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect aria-label="Filter by status" value={status} onChange={(e) => set('status', e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Filter by priority" value={priority} onChange={(e) => set('priority', e.target.value)}>
          <option value="">Any priority</option>
          {PRIORITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Filter by project" value={project} onChange={(e) => set('project', e.target.value)}>
          <option value="">All projects</option>
          {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archived)' : ''}</option>)}
        </NativeSelect>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-paper px-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#2f5d46]" checked={overdue} onChange={(e) => set('overdue', e.target.checked ? 'true' : '')} /> Overdue only
        </label>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, 'Could not load tasks')} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        filtering ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="No matching tasks" body="Try loosening your filters or searching for something else." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={<ListChecks className="h-6 w-6" />} title="No tasks yet" body={hasProjects ? 'Create a task to see it here.' : 'Create a project first, then add tasks to it.'} action={hasProjects ? <Button onClick={() => create('todo')}><Plus className="h-4 w-4" /> New task</Button> : undefined} />
        )
      ) : (
        <>
          <ul className={`divide-y divide-line rounded-2xl border border-line bg-paper p-1 shadow-soft ${q.isFetching ? 'opacity-80' : ''}`}>
            {items.map((t) => <TaskRow key={t.id} task={t} onOpen={open} />)}
          </ul>
          {meta && meta.totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}><ChevronLeft className="h-4 w-4" /> Previous</Button>
              <span className="text-sm text-ink-muted">Page {meta.page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => set('page', String(page + 1))}>Next <ChevronRight className="h-4 w-4" /></Button>
            </nav>
          )}
        </>
      )}
      {panels}
    </>
  )
}
