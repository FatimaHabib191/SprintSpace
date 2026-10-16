import { CalendarDays, Clock, Folder, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog'
import { PriorityBadge } from '@/components/ui/misc'
import { useDeleteTask } from '@/hooks/queries'
import { statusLabel, type Task } from '@/lib/types'
import { formatDay, isOverdue } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

interface Props {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
}

/** Slide-over panel with everything about one task. */
export function TaskDetailSheet({ task, onClose, onEdit }: Props) {
  const remove = useDeleteTask()
  const [confirm, setConfirm] = useState(false)
  const overdue = task ? isOverdue(task.dueDate, task.status) : false

  const onDelete = async () => {
    if (!task) return
    try {
      await remove.mutateAsync(task.id)
      toast.success('Task deleted')
      setConfirm(false)
      onClose()
    } catch (err) {
      setConfirm(false)
      toast.error(err instanceof Error ? err.message : 'Could not delete the task')
    }
  }

  return (
    <>
      <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
        {task && (
          <DialogContent side title={task.title} description={`${statusLabel(task.status)} task`}>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-semibold text-forest-700">{statusLabel(task.status)}</span>
                <PriorityBadge priority={task.priority} />
                {overdue && <span className="rounded-full bg-terracotta-600 px-2.5 py-0.5 text-xs font-semibold text-white">Overdue</span>}
              </div>

              <section aria-label="Description">
                <h3 className="mb-1.5 text-sm font-semibold text-ink-muted">Description</h3>
                {task.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{task.description}</p>
                ) : (
                  <p className="text-sm italic text-ink-muted">No description yet.</p>
                )}
              </section>

              <dl className="space-y-3 rounded-xl border border-line bg-ivory p-4 text-sm">
                <div className="flex items-center gap-3">
                  <dt className="flex w-28 items-center gap-2 text-ink-muted"><Folder className="h-4 w-4" aria-hidden /> Project</dt>
                  <dd>
                    <Link to={`/app/projects/${task.project}`} onClick={onClose} className="inline-flex items-center gap-2 font-medium hover:underline">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.projectColor ?? '#2f5d46' }} aria-hidden />
                      {task.projectName ?? 'Open project'}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt className="flex w-28 items-center gap-2 text-ink-muted"><CalendarDays className="h-4 w-4" aria-hidden /> Due</dt>
                  <dd className={overdue ? 'font-medium text-terracotta-600' : ''}>{task.dueDate ? formatDay(task.dueDate) : 'No due date'}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt className="flex w-28 items-center gap-2 text-ink-muted"><Clock className="h-4 w-4" aria-hidden /> Created</dt>
                  <dd>{format(parseISO(task.createdAt), 'MMM d, yyyy')}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dt className="flex w-28 items-center gap-2 text-ink-muted"><Clock className="h-4 w-4" aria-hidden /> Updated</dt>
                  <dd>{format(parseISO(task.updatedAt), 'MMM d, yyyy · h:mm a')}</dd>
                </div>
                {task.completedAt && (
                  <div className="flex items-center gap-3">
                    <dt className="flex w-28 items-center gap-2 text-ink-muted"><Clock className="h-4 w-4" aria-hidden /> Completed</dt>
                    <dd>{format(parseISO(task.completedAt), 'MMM d, yyyy')}</dd>
                  </div>
                )}
              </dl>

              <div className="flex gap-2">
                <Button onClick={() => onEdit(task)}><Pencil className="h-4 w-4" /> Edit task</Button>
                <Button variant="danger-ghost" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this task?"
        description={<>“{task?.title}” will be permanently removed. This can’t be undone.</>}
        confirmLabel="Delete task"
        loading={remove.isPending}
        onConfirm={onDelete}
      />
    </>
  )
}
