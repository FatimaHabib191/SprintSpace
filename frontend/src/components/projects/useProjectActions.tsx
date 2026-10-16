import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useDeleteProject, useUpdateProject } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import type { Project } from '@/lib/types'
import { plural } from '@/lib/utils'
import { ProjectDialog } from './ProjectDialog'

/** Shared edit / archive / delete flows used by the projects list and the project page. */
export function useProjectActions(opts: { onDeleted?: (p: Project) => void } = {}) {
  const update = useUpdateProject()
  const remove = useDeleteProject()
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const archive = async (p: Project) => {
    try {
      await update.mutateAsync({ id: p.id, archived: !p.archived })
      toast.success(p.archived ? `“${p.name}” restored` : `“${p.name}” archived`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the project'))
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const p = deleting
    try {
      const { deletedTasks } = await remove.mutateAsync(p.id)
      toast.success(`Deleted “${p.name}” and ${plural(deletedTasks, 'task')}`)
      setDeleting(null)
      opts.onDeleted?.(p)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete the project'))
      setDeleting(null)
    }
  }

  const dialogs = (
    <>
      <ProjectDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} project={editing ?? undefined} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this project?"
        description={
          <>
            “{deleting?.name}” and <strong>all {deleting ? plural(deleting.taskCount, 'task') : ''}</strong> inside it will be permanently deleted. This can’t be undone. If you only want it out of the way, archive it instead.
          </>
        }
        confirmLabel="Delete project"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )

  return { edit: setEditing, archive, askDelete: setDeleting, dialogs }
}
