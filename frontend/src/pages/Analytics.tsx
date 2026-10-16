import { BarChart3, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityChart, ProjectProgressChart, StatusChart } from '@/components/dashboard/Charts'
import { StatCard } from '@/components/dashboard/StatCard'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageHeader, ProgressBar, Skeleton } from '@/components/ui/misc'
import { useSummary } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { AlertTriangle, CheckCircle2, ListChecks, Loader } from 'lucide-react'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-paper p-6 shadow-soft ${className}`}>
      <h2 className="mb-4 font-serif text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function Analytics() {
  const q = useSummary()
  const s = q.data

  return (
    <>
      <PageHeader title="Analytics" subtitle="Calculated live from your projects and tasks." />
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error, 'Could not load analytics')} onRetry={() => q.refetch()} />
      ) : !s || s.totalTasks === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No data to chart yet"
          body={s && s.totalProjects > 0 ? 'Add tasks to your projects and charts will appear here automatically.' : 'Create a project and add a few tasks. Your analytics are built only from real work.'}
          action={<Button asChild><Link to={s && s.totalProjects > 0 ? '/app/projects' : '/app/projects'}><Plus className="h-4 w-4" /> {s && s.totalProjects > 0 ? 'Open a project' : 'Create a project'}</Link></Button>}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total tasks" value={s.totalTasks} icon={<ListChecks className="h-5 w-5" />} hint={`across ${s.totalProjects} projects`} />
            <StatCard label="Completed" value={s.completedTasks} icon={<CheckCircle2 className="h-5 w-5" />} hint={`${s.completionRate}% completion rate`} />
            <StatCard label="In progress" value={s.inProgressTasks} icon={<Loader className="h-5 w-5" />} />
            <StatCard label="Overdue" value={s.overdueTasks} tone={s.overdueTasks ? 'warn' : 'default'} icon={<AlertTriangle className="h-5 w-5" />} />
          </div>
          <Card title="Completion rate">
            <div className="flex items-center gap-4">
              <span className="font-serif text-4xl font-semibold text-forest-700">{s.completionRate}%</span>
              <div className="flex-1"><ProgressBar value={s.completionRate} label="Overall completion" /></div>
            </div>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Tasks by status"><StatusChart data={s.byStatus} total={s.totalTasks} /></Card>
            <Card title="Tasks by priority"><PriorityChart data={s.byPriority} /></Card>
          </div>
          <Card title="Progress by project">
            <ProjectProgressChart data={s.projectProgress} />
            <ul className="mt-4 divide-y divide-line">
              {s.projectProgress.map((p) => (
                <li key={p.projectId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link to={`/app/projects/${p.projectId}`} className="flex min-w-0 items-center gap-2 font-medium hover:underline">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden /><span className="truncate">{p.name}</span>
                  </Link>
                  <span className="shrink-0 text-ink-muted">{p.total === 0 ? 'No tasks' : `${p.done}/${p.total} done · ${p.completion}%`}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}
