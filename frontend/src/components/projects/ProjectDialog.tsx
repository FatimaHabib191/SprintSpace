import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { useCreateProject, useUpdateProject } from '@/hooks/queries'
import { applyServerErrors } from '@/lib/formErrors'
import { PROJECT_COLORS, projectSchema, type ProjectValues } from '@/lib/schemas'
import type { Project } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
  onSaved?: (p: Project) => void
}

const blank: ProjectValues = { name: '', description: '', color: PROJECT_COLORS[0]!, startDate: '', deadline: '' }

export function ProjectDialog({ open, onOpenChange, project, onSaved }: Props) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({ resolver: zodResolver(projectSchema), defaultValues: blank })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    reset(
      project
        ? { name: project.name, description: project.description, color: project.color, startDate: project.startDate ?? '', deadline: project.deadline ?? '' }
        : blank,
    )
  }, [open, project, reset])

  const color = watch('color')
  const busy = isSubmitting || create.isPending || update.isPending

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    const body = { name: v.name, description: v.description, color: v.color, startDate: v.startDate || null, deadline: v.deadline || null }
    try {
      const saved = project ? await update.mutateAsync({ id: project.id, ...body }) : await create.mutateAsync(body)
      toast.success(project ? 'Project updated' : 'Project created')
      onOpenChange(false)
      onSaved?.(saved)
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['name', 'description', 'color', 'startDate', 'deadline']))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent title={project ? 'Edit project' : 'New project'} description="Projects group related tasks on a Kanban board.">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Name" htmlFor="p-name" error={errors.name?.message}>
            <Input id="p-name" autoFocus maxLength={100} placeholder="e.g. Website redesign" aria-invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Description" htmlFor="p-desc" error={errors.description?.message}>
            <Textarea id="p-desc" rows={3} placeholder="What is this project about?" {...register('description')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="p-start" error={errors.startDate?.message}>
              <Input id="p-start" type="date" {...register('startDate')} />
            </Field>
            <Field label="Deadline" htmlFor="p-deadline" error={errors.deadline?.message}>
              <Input id="p-deadline" type="date" aria-invalid={!!errors.deadline} {...register('deadline')} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Color</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Project color">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`Color ${c}`}
                  onClick={() => setValue('color', c, { shouldDirty: true })}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-paper transition', color === c ? 'ring-2 ring-charcoal' : 'hover:scale-110')}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="h-4 w-4 text-white" aria-hidden />}
                </button>
              ))}
            </div>
          </fieldset>
          {formError && <p role="alert" className="rounded-lg bg-terracotta-50 px-3 py-2 text-sm text-terracotta-700">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" loading={busy}>{project ? 'Save changes' : 'Create project'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
