import { FolderKanban, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectDialog } from '@/components/projects/ProjectDialog'
import { useProjectActions } from '@/components/projects/useProjectActions'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/misc'
import { useProjects } from '@/hooks/queries'
import { useDebounced } from '@/hooks/useDebounced'
import { errorMessage } from '@/lib/api'

export function Projects() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const view = (params.get('view') as 'false' | 'true' | 'all' | null) ?? 'false'
  const debounced = useDebounced(search.trim())
  const [creating, setCreating] = useState(false)
  const actions = useProjectActions()
  const q = useProjects({ search: debounced || undefined, archived: view })

  const setView = (v: string) => {
    const next = new URLSearchParams(params)
    if (v === 'false') next.delete('view')
    else next.set('view', v)
    setParams(next, { replace: true })
  }

  const projects = q.data?.data ?? []
  const filtering = !!debounced || view !== 'false'

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every project has its own board, deadline and progress."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New project</Button>}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input type="search" aria-label="Search projects" placeholder="Search projects…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect aria-label="Show projects" className="sm:w-48" value={view} onChange={(e) => setView(e.target.value)}>
          <option value="false">Active projects</option>
          <option value="true">Archived</option>
          <option value="all">All projects</option>
        </NativeSelect>
      </div>

      {q.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52" />)}</div>
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, 'Could not load projects')} onRetry={() => q.refetch()} />
      ) : projects.length === 0 ? (
        filtering ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="No projects found" body="Nothing matches your search or filter. Try different keywords or switch the view." action={<Button variant="outline" onClick={() => { setSearch(''); setView('false') }}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={<FolderKanban className="h-6 w-6" />} title="Create your first project" body="A project is a home for related tasks. Give it a name, a deadline and a color to get started." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create a project</Button>} />
        )
      ) : (
        <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${q.isFetching ? 'opacity-80' : ''}`}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onEdit={actions.edit} onArchive={actions.archive} onDelete={actions.askDelete} />
          ))}
        </div>
      )}

      <ProjectDialog open={creating} onOpenChange={setCreating} />
      {actions.dialogs}
    </>
  )
}
