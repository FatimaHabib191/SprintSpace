import { api } from '@/lib/api'
import type { PageMeta, Project, ProjectInput, Summary, Task, TaskInput, TaskPriority, TaskStatus, User } from '@/lib/types'
import { todayStr } from '@/lib/utils'

type List<T> = { data: T[]; meta: PageMeta }
const today = () => todayStr()

export const authApi = {
  me: async () => (await api.get<{ data: { user: User } }>('/auth/me')).data.data.user,
  register: async (body: { name: string; email: string; password: string }) =>
    (await api.post<{ data: { user: User } }>('/auth/register', body)).data.data.user,
  login: async (body: { email: string; password: string }) =>
    (await api.post<{ data: { user: User } }>('/auth/login', body)).data.data.user,
  logout: async () => {
    await api.post('/auth/logout')
  },
  updateProfile: async (body: { name: string }) => (await api.patch<{ data: { user: User } }>('/auth/me', body)).data.data.user,
  changePassword: async (body: { currentPassword: string; newPassword: string }) => {
    await api.post('/auth/me/password', body)
  },
}

export interface ProjectListParams {
  search?: string
  archived?: 'true' | 'false' | 'all'
  page?: number
  limit?: number
}

export const projectApi = {
  list: async (params: ProjectListParams = {}) =>
    (await api.get<List<Project>>('/projects', { params: { limit: 100, ...params, today: today() } })).data,
  get: async (id: string) => (await api.get<{ data: Project }>(`/projects/${id}`, { params: { today: today() } })).data.data,
  create: async (body: ProjectInput) => (await api.post<{ data: Project }>('/projects', body)).data.data,
  update: async (id: string, body: Partial<ProjectInput> & { archived?: boolean }) =>
    (await api.patch<{ data: Project }>(`/projects/${id}`, body)).data.data,
  remove: async (id: string) => (await api.delete<{ data: { deletedTasks: number } }>(`/projects/${id}`)).data.data,
  tasks: async (id: string) => (await api.get<List<Task>>(`/projects/${id}/tasks`, { params: { limit: 500 } })).data.data,
  createTask: async (id: string, body: TaskInput) => (await api.post<{ data: Task }>(`/projects/${id}/tasks`, body)).data.data,
}

export interface TaskListParams {
  search?: string
  status?: TaskStatus
  priority?: TaskPriority
  project?: string
  overdue?: boolean
  page?: number
  limit?: number
  sort?: 'position' | 'dueDate' | 'createdAt' | 'updatedAt'
}

export const taskApi = {
  list: async (params: TaskListParams = {}) =>
    (await api.get<List<Task>>('/tasks', { params: { limit: 50, ...params, today: today() } })).data,
  get: async (id: string) => (await api.get<{ data: Task }>(`/tasks/${id}`)).data.data,
  update: async (id: string, body: Partial<TaskInput> & { project?: string }) =>
    (await api.patch<{ data: Task }>(`/tasks/${id}`, body)).data.data,
  remove: async (id: string) => {
    await api.delete(`/tasks/${id}`)
  },
  move: async (id: string, body: { status: TaskStatus; index: number }) =>
    (await api.patch<{ data: Task }>(`/tasks/${id}/move`, body)).data.data,
}

export const dashboardApi = {
  summary: async () => (await api.get<{ data: Summary }>('/dashboard/summary', { params: { today: today() } })).data.data,
}
