import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Task, type TaskStatus } from '../models/Task';
import { AppError } from '../utils/AppError';
import { dayStart, resolveToday } from '../utils/dates';
import { escapeRegex, parseObjectId } from '../utils/objectId';
import { GAP, placeInColumn } from '../utils/position';
import { getOwnedProject } from './projectService';
import { serializeTask } from './serializers';


type ListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: TaskStatus;
  priority?: string;
  project?: string;
  overdue?: boolean;
  today?: string;
  sort: 'position' | 'dueDate' | 'createdAt' | 'updatedAt';
};

export async function listTasks(owner: string, q: ListQuery, forcedProject?: mongoose.Types.ObjectId) {
  const filter: Record<string, unknown> = { owner: new mongoose.Types.ObjectId(owner) };
  if (forcedProject) filter.project = forcedProject;
  else if (q.project) filter.project = parseObjectId(q.project, 'Project');
  if (q.status) filter.status = q.status;
  if (q.priority) filter.priority = q.priority;
  if (q.search) {
    const rx = { $regex: escapeRegex(q.search), $options: 'i' };
    filter.$or = [{ title: rx }, { description: rx }];
  }
  if (q.overdue) {
    filter.status = { $ne: 'done' };
    filter.dueDate = { $ne: null, $lt: resolveToday(q.today) };
    if (q.status) filter.status = q.status === 'done' ? { $in: [] } : q.status;
  }

  const sort: Record<string, 1 | -1> =
    q.sort === 'position' ? { status: 1, position: 1 } : q.sort === 'dueDate' ? { dueDate: 1, _id: 1 } : { [q.sort]: -1 };

  const [items, total] = await Promise.all([
    Task.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).populate('project', 'name color').lean(),
    Task.countDocuments(filter),
  ]);
  return {
    items: items.map((t) => serializeTask(t)),
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  };
}

export async function getOwnedTask(owner: string, id: unknown) {
  const _id = parseObjectId(id, 'Task');
  const task = await Task.findOne({ _id, owner });
  if (!task) throw AppError.notFound('Task not found');
  return task;
}

export async function getTask(owner: string, id: unknown) {
  const task = await getOwnedTask(owner, id);
  const project = await Project.findOne({ _id: task.project, owner }).select('name color').lean();
  return serializeTask(task, project);
}

async function nextPosition(owner: string, project: mongoose.Types.ObjectId, status: TaskStatus): Promise<number> {
  const last = await Task.findOne({ owner, project, status }).sort({ position: -1 }).select('position').lean();
  return last ? last.position + GAP : GAP;
}

type TaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  project?: string;
};

export async function createTask(owner: string, projectId: unknown, input: TaskInput & { title: string }) {
  const project = await getOwnedProject(owner, projectId);
  const status = input.status ?? 'todo';
  const task = await Task.create({
    owner,
    project: project._id,
    title: input.title,
    description: input.description ?? '',
    status,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ? dayStart(input.dueDate) : null,
    position: await nextPosition(owner, project._id, status),
    completedAt: status === 'done' ? new Date() : null,
  });
  return serializeTask(task, project);
}

export async function updateTask(owner: string, id: unknown, input: TaskInput) {
  const task = await getOwnedTask(owner, id);
  let project = null as Awaited<ReturnType<typeof getOwnedProject>> | null;

  let relocate = false;
  if (input.project !== undefined && input.project !== String(task.project)) {
    project = await getOwnedProject(owner, input.project); // target project must also belong to the user
    task.project = project._id;
    relocate = true;
  }
  if (input.status !== undefined && input.status !== task.status) {
    task.status = input.status;
    task.completedAt = input.status === 'done' ? new Date() : null;
    relocate = true;
  }
  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.priority !== undefined) task.priority = input.priority;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate ? dayStart(input.dueDate) : null;
  if (relocate) task.position = await nextPosition(owner, task.project, task.status as TaskStatus);

  await task.save();
  project ??= await Project.findOne({ _id: task.project, owner });
  return serializeTask(task, project);
}

export async function deleteTask(owner: string, id: unknown) {
  const task = await getOwnedTask(owner, id);
  await Task.deleteOne({ _id: task._id, owner });
}

/** Moves a task to `status` at `index` (0-based, counted within the destination column without the task). */
export async function moveTask(owner: string, id: unknown, status: TaskStatus, index: number) {
  const task = await getOwnedTask(owner, id);

  const siblings = await Task.find({ owner, project: task.project, status, _id: { $ne: task._id } })
    .sort({ position: 1, _id: 1 })
    .select('position')
    .lean();

  const { position, needsRenumber: crowded, at } = placeInColumn(siblings.map((x) => x.position), index);

  if (task.status !== status) {
    task.status = status;
    task.completedAt = status === 'done' ? new Date() : null;
  }

  if (crowded) {
    // Float gap exhausted: renumber the whole column, inserting the moved task at `at`.
    const orderedIds = siblings.map((s) => s._id);
    orderedIds.splice(at, 0, task._id);
    await Task.bulkWrite(
      orderedIds.map((_id, i) => ({
        updateOne: { filter: { _id, owner }, update: { $set: { position: (i + 1) * GAP } } },
      })),
    );
    task.position = (at + 1) * GAP;
    await Task.updateOne({ _id: task._id, owner }, { $set: { status: task.status, completedAt: task.completedAt } });
    const fresh = await getOwnedTask(owner, id);
    return serializeTask(fresh);
  }

  task.position = position;
  await task.save();
  return serializeTask(task);
}
