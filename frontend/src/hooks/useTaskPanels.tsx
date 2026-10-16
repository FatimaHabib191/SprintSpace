import { useState } from 'react'
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import type { Task, TaskStatus } from '@/lib/types'

/** Wires the task detail panel and the create/edit dialog together for any page. */
export function useTaskPanels(defaults: { projectId?: string; lockProject?: boolean } = {}) {
  const [viewing, setViewing] = useState<Task | null>(null)
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState<{ status: TaskStatus } | null>(null)

  const panels = (
    <>
      <TaskDetailSheet
        task={viewing}
        onClose={() => setViewing(null)}
        onEdit={(t) => {
          setViewing(null)
          setEditing(t)
        }}
      />
      <TaskDialog
        open={!!editing || !!creating}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null)
            setCreating(null)
          }
        }}
        task={editing ?? undefined}
        defaultProjectId={defaults.projectId}
        defaultStatus={creating?.status}
        lockProject={defaults.lockProject}
      />
    </>
  )
  return { open: setViewing, create: (status: TaskStatus = 'todo') => setCreating({ status }), panels }
}
