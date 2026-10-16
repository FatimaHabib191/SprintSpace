import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { dashboardApi, projectApi, taskApi, type ProjectListParams, type TaskListParams } from '@/api/endpoints'
import type { Project, ProjectInput, Task, TaskInput, TaskStatus } from '@/lib/types'

export const keys = {
  projects: ['projects'] as const,
  projectList: (p: ProjectListParams) => ['projects', 'list', p] as const,
  project: (id: string) => ['projects', 'detail', id] as const,
  projectTasks: (id: string) => ['tasks', 'project', id] as const,
  tasks: ['tasks'] as const,
  taskList: (p: TaskListParams) => ['tasks', 'list', p] as const,
  task: (id: string) => ['tasks', 'detail', id] as const,
  summary: ['summary'] as const,
}

/** Anything that changes tasks or projects changes counts, completion and dashboard metrics. */
export function invalidateWork(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.projects }),
    qc.invalidateQueries({ queryKey: keys.tasks }),
    qc.invalidateQueries({ queryKey: keys.summary }),
  ])
}

export const useProjects = (params: ProjectListParams) =>
  useQuery({ queryKey: keys.projectList(params), queryFn: () => projectApi.list(params), placeholderData: keepPreviousData })

export const useProject = (id: string) => useQuery({ queryKey: keys.project(id), queryFn: () => projectApi.get(id), retry: false })

export const useProjectTasks = (id: string) => useQuery({ queryKey: keys.projectTasks(id), queryFn: () => projectApi.tasks(id) })

export const useTasks = (params: TaskListParams) =>
  useQuery({ queryKey: keys.taskList(params), queryFn: () => taskApi.list(params), placeholderData: keepPreviousData })

export const useSummary = () => useQuery({ queryKey: keys.summary, queryFn: dashboardApi.summary })

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (body: ProjectInput) => projectApi.create(body), onSuccess: () => invalidateWork(qc) })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<ProjectInput> & { archived?: boolean }) => projectApi.update(id, body),
    onSuccess: () => invalidateWork(qc),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectApi.remove(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: keys.project(id) })
      qc.removeQueries({ queryKey: keys.projectTasks(id) })
      return invalidateWork(qc)
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, ...body }: { projectId: string } & TaskInput) => projectApi.createTask(projectId, body),
    onSuccess: () => invalidateWork(qc),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<TaskInput> & { project?: string }) => taskApi.update(id, body),
    onSuccess: () => invalidateWork(qc),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => taskApi.remove(id), onSuccess: () => invalidateWork(qc) })
}

const GAP = 1024

/** Mirrors the server's position algorithm so the optimistic order matches what gets persisted. */
export function positionFor(column: Task[], index: number): number {
  const at = Math.min(index, column.length)
  const prev = column[at - 1]
  const next = column[at]
  if (prev && next) return (prev.position + next.position) / 2
  if (prev) return prev.position + GAP
  if (next) return next.position - GAP
  return GAP
}

interface MoveVars {
  task: Task
  status: TaskStatus
  /** Index in the destination column of ALL tasks (not just filtered ones), excluding the moved task. */
  index: number
}

/** Optimistic Kanban move: UI updates instantly, persists to the API, and rolls back on failure. */
export function useMoveTask(projectId: string, onError: (err: unknown, retry: () => void) => void) {
  const qc = useQueryClient()
  const key = keys.projectTasks(projectId)

  const mutation = useMutation({
    mutationFn: ({ task, status, index }: MoveVars) => taskApi.move(task.id, { status, index }),
    onMutate: async ({ task, status, index }) => {
      await qc.cancelQueries({ queryKey: key })
      const snapshot = qc.getQueryData<Task[]>(key)
      qc.setQueryData<Task[]>(key, (old = []) => {
        const column = old.filter((t) => t.status === status && t.id !== task.id).sort((a, b) => a.position - b.position)
        const position = positionFor(column, index)
        return old.map((t) =>
          t.id === task.id ? { ...t, status, position, completedAt: status === 'done' ? new Date().toISOString() : null } : t,
        )
      })
      return { snapshot }
    },
    onError: (err, vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot)
      onError(err, () => mutation.mutate(vars))
    },
    onSettled: () => invalidateWork(qc),
  })
  return mutation
}

export type { Project }
