export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const statusLabel = (s: TaskStatus) => STATUSES.find((x) => x.value === s)!.label
export const priorityLabel = (p: TaskPriority) => PRIORITIES.find((x) => x.value === p)!.label

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  startDate: string | null
  deadline: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  taskCount: number
  doneCount: number
  inProgressCount: number
  overdueCount: number
  completion: number
}

export interface Task {
  id: string
  project: string
  projectName?: string
  projectColor?: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  position: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Summary {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionRate: number
  byStatus: { status: TaskStatus; count: number }[]
  byPriority: { priority: TaskPriority; count: number }[]
  projectProgress: { projectId: string; name: string; color: string; total: number; done: number; completion: number }[]
}

export interface ProjectInput {
  name: string
  description?: string
  color?: string
  startDate?: string | null
  deadline?: string | null
}

export interface TaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
}
