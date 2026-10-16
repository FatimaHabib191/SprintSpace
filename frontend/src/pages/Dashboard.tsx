import { AlertTriangle, CheckCircle2, FolderKanban, ListChecks, Loader, Plus, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectDialog } from '@/components/projects/ProjectDialog'
import { StatCard } from '@/components/dashboard/StatCard'
import { TaskRow } from '@/components/tasks/TaskRow'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader, ProgressBar, Skeleton } from '@/components/ui/misc'
import { useAuth } from '@/context/AuthContext'
import { useSummary, useTasks } from '@/hooks/queries'
import { useTaskPanels } from '@/hooks/useTaskPanels'
import { errorMessage } from '@/lib/api'
import { plural } from '@/lib/utils'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Dashboard() {
  const { user } = useAuth()
  const summary = useSummary()
  const overdue = useTasks({ overdue: true, sort: 'dueDate', limit: 5 })
  const [newProject, setNewProject] = useState(false)
  const { open, panels } = useTaskPanels()
  const s = summary.data

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        subtitle="Here’s where your work stands right now."
        actions={<Button onClick={() => setNewProject(true)}><Plus className="h-4 w-4" /> New project</Button>}
      />

      {summary.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : summary.isError ? (
        <ErrorState message={errorMessage(summary.error, 'Could not load your dashboard')} onRetry={() => summary.refetch()} />
      ) : s && s.totalProjects === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="Start with your first project"
          body="Projects hold your tasks and Kanban board. Create one and your dashboard will fill in with real progress."
          action={<Button onClick={() => setNewProject(true)}><Plus className="h-4 w-4" /> Create a project</Button>}
        />
      ) : (
        s && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Projects" value={s.totalProjects} icon={<FolderKanban className="h-5 w-5" />} hint={`${s.activeProjects} active`} />
              <StatCard label="Tasks" value={s.totalTasks} icon={<ListChecks className="h-5 w-5" />} hint={`${s.completedTasks} completed`} />
              <StatCard label="In progress" value={s.inProgressTasks} icon={<Loader className="h-5 w-5" />} hint="Being worked on now" />
              <StatCard label="Overdue" value={s.overdueTasks} tone={s.overdueTasks > 0 ? 'warn' : 'default'} icon={<AlertTriangle className="h-5 w-5" />} hint={s.overdueTasks ? 'Need your attention' : 'Nothing past due'} />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <section className="rounded-2xl border border-line bg-paper p-6 shadow-soft lg:col-span-2" aria-labelledby="completion-h">
                <h2 id="completion-h" className="font-serif text-lg font-semibold">Overall completion</h2>
                <div className="mt-5 flex items-end gap-3">
                  <span className="font-serif text-5xl font-semibold text-forest-700">{s.completionRate}%</span>
                  <span className="mb-2 flex items-center gap-1 text-sm text-ink-muted"><TrendingUp className="h-4 w-4" aria-hidden /> {s.completedTasks} of {plural(s.totalTasks, 'task')}</span>
                </div>
                <div className="mt-4"><ProgressBar value={s.completionRate} label="Overall completion" /></div>
                {s.totalTasks === 0 && <p className="mt-4 text-sm text-ink-muted">Add tasks to a project to start tracking progress.</p>}
              </section>

              <section className="rounded-2xl border border-line bg-paper p-6 shadow-soft lg:col-span-3" aria-labelledby="progress-h">
                <div className="flex items-center justify-between">
                  <h2 id="progress-h" className="font-serif text-lg font-semibold">Progress by project</h2>
                  <Link to="/app/analytics" className="text-sm font-medium text-forest-600 hover:underline">Full analytics</Link>
                </div>
                {s.projectProgress.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-muted">No active projects.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {s.projectProgress.slice(0, 5).map((p) => (
                      <li key={p.projectId}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <Link to={`/app/projects/${p.projectId}`} className="flex min-w-0 items-center gap-2 font-medium hover:underline">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
                            <span className="truncate">{p.name}</span>
                          </Link>
                          <span className="shrink-0 text-xs text-ink-muted">{p.total === 0 ? 'No tasks' : `${p.done}/${p.total} · ${p.completion}%`}</span>
                        </div>
                        <ProgressBar value={p.completion} color={p.color} label={`${p.name} progress`} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section aria-labelledby="attention-h" className="rounded-2xl border border-line bg-paper p-3 shadow-soft sm:p-4">
              <div className="flex items-center justify-between px-2 pb-2 pt-1 sm:px-3">
                <h2 id="attention-h" className="font-serif text-lg font-semibold">Needs attention</h2>
                <Link to="/app/tasks?overdue=true" className="text-sm font-medium text-forest-600 hover:underline">See all overdue</Link>
              </div>
              {overdue.isLoading ? (
                <Skeleton className="m-2 h-20" />
              ) : overdue.isError ? (
                <div className="p-2"><ErrorState message={errorMessage(overdue.error)} onRetry={() => overdue.refetch()} /></div>
              ) : overdue.data && overdue.data.data.length > 0 ? (
                <ul className="divide-y divide-line">{overdue.data.data.map((t) => <TaskRow key={t.id} task={t} onOpen={open} />)}</ul>
              ) : (
                <p className="flex items-center gap-2 px-3 py-6 text-sm text-ink-muted"><CheckCircle2 className="h-5 w-5 text-forest-600" aria-hidden /> You’re all caught up — nothing is overdue.</p>
              )}
            </section>
          </div>
        )
      )}
      <ProjectDialog open={newProject} onOpenChange={setNewProject} />
      {panels}
    </>
  )
}
