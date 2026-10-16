const iso = (d?: Date | null) => (d ? d.toISOString() : null);
const day = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/* eslint-disable @typescript-eslint/no-explicit-any */
export const serializeUser = (u: any) => ({ id: String(u._id), name: u.name, email: u.email, createdAt: iso(u.createdAt) });

export const serializeProject = (p: any, counts?: { total: number; done: number; inProgress: number; overdue: number }) => ({
  id: String(p._id),
  name: p.name,
  description: p.description ?? '',
  color: p.color,
  startDate: day(p.startDate),
  deadline: day(p.deadline),
  archived: !!p.archived,
  archivedAt: iso(p.archivedAt),
  createdAt: iso(p.createdAt),
  updatedAt: iso(p.updatedAt),
  taskCount: counts?.total ?? 0,
  doneCount: counts?.done ?? 0,
  inProgressCount: counts?.inProgress ?? 0,
  overdueCount: counts?.overdue ?? 0,
  completion: counts && counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0,
});

export const serializeTask = (t: any, project?: any) => ({
  id: String(t._id),
  project: String(t.project?._id ?? t.project),
  projectName: project?.name ?? t.project?.name ?? undefined,
  projectColor: project?.color ?? t.project?.color ?? undefined,
  title: t.title,
  description: t.description ?? '',
  status: t.status,
  priority: t.priority,
  dueDate: day(t.dueDate),
  position: t.position,
  completedAt: iso(t.completedAt),
  createdAt: iso(t.createdAt),
  updatedAt: iso(t.updatedAt),
});
