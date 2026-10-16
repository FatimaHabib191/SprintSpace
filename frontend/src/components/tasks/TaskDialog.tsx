import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { useCreateTask, useDeleteTask, useProjects, useUpdateTask } from '@/hooks/queries'
import { applyServerErrors } from '@/lib/formErrors'
import { taskSchema, type TaskValues } from '@/lib/schemas'
import { PRIORITIES, STATUSES, type Task, type TaskStatus } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing task to edit; omit to create. */
  task?: Task
  /** Preselected project / column when creating. */
  defaultProjectId?: string
  defaultStatus?: TaskStatus
  /** Hide the project picker (used on a project's own board). */
  lockProject?: boolean
}

export function TaskDialog({ open, onOpenChange, task, defaultProjectId, defaultStatus, lockProject }: Props) {
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const projects = useProjects({ archived: 'false', limit: 100 })
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>({ resolver: zodResolver(taskSchema) })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      task
        ? { title: task.title, description: task.description, project: task.project, status: task.status, priority: task.priority, dueDate: task.dueDate ?? '' }
        : { title: '', description: '', project: defaultProjectId ?? '', status: defaultStatus ?? 'todo', priority: 'medium', dueDate: '' },
    )
  }, [open, task, defaultProjectId, defaultStatus, reset])

  const busy = isSubmitting || create.isPending || update.isPending

  const options = projects.data?.data ?? []
  // When editing, the task's project may be archived and so absent from the active list.
  const hasCurrent = !task || options.some((p) => p.id === task.project)

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      if (task) {
        await update.mutateAsync({
          id: task.id,
          title: v.title,
          description: v.description,
          status: v.status,
          priority: v.priority,
          dueDate: v.dueDate || null,
          ...(v.project !== task.project ? { project: v.project } : {}),
        })
        toast.success('Task updated')
      } else {
        await create.mutateAsync({
          projectId: v.project,
          title: v.title,
          description: v.description,
          status: v.status,
          priority: v.priority,
          dueDate: v.dueDate || null,
        })
        toast.success('Task created')
      }
      onOpenChange(false)
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['title', 'description', 'status', 'priority', 'dueDate', 'project']))
    }
  })

  const onDelete = async () => {
    if (!task) return
    try {
      await remove.mutateAsync(task.id)
      toast.success('Task deleted')
      setConfirmDelete(false)
      onOpenChange(false)
    } catch (err) {
      setConfirmDelete(false)
      setFormError(err instanceof Error ? err.message : 'Could not delete the task')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <DialogContent title={task ? 'Edit task' : 'New task'} description={task ? 'Update details, status or deadline.' : 'Add a task to your board.'}>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Title" htmlFor="t-title" error={errors.title?.message}>
              <Input id="t-title" autoFocus maxLength={200} placeholder="What needs to be done?" aria-invalid={!!errors.title} {...register('title')} />
            </Field>
            <Field label="Description" htmlFor="t-desc" error={errors.description?.message}>
              <Textarea id="t-desc" rows={3} placeholder="Add context, links or acceptance criteria" {...register('description')} />
            </Field>
            {!lockProject && (
              <Field label="Project" htmlFor="t-project" error={errors.project?.message}>
                <NativeSelect id="t-project" aria-invalid={!!errors.project} {...register('project')}>
                  <option value="" disabled>Select a project…</option>
                  {!hasCurrent && task && <option value={task.project}>{task.projectName ?? 'Archived project'}</option>}
                  {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </NativeSelect>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status" htmlFor="t-status" error={errors.status?.message}>
                <NativeSelect id="t-status" {...register('status')}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Priority" htmlFor="t-priority" error={errors.priority?.message}>
                <NativeSelect id="t-priority" {...register('priority')}>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Due date" htmlFor="t-due" error={errors.dueDate?.message}>
                <Input id="t-due" type="date" {...register('dueDate')} />
              </Field>
            </div>
            {formError && <p role="alert" className="rounded-lg bg-terracotta-50 px-3 py-2 text-sm text-terracotta-700">{formError}</p>}
            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {task && (
                  <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete</Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
                <Button type="submit" loading={busy}>{task ? 'Save changes' : 'Create task'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={<>“{task?.title}” will be permanently removed. This can’t be undone.</>}
        confirmLabel="Delete task"
        loading={remove.isPending}
        onConfirm={onDelete}
      />
    </>
  )
}
