import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { AppError } from '../utils/AppError';
import { dayStart, resolveToday } from '../utils/dates';
import { escapeRegex, parseObjectId } from '../utils/objectId';
import { serializeProject } from './serializers';

type Counts = { total: number; done: number; inProgress: number; overdue: number };

async function countsFor(owner: string, projectIds: mongoose.Types.ObjectId[], today: Date): Promise<Map<string, Counts>> {
  const map = new Map<string, Counts>();
  if (!projectIds.length) return map;
  const rows = await Task.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(owner), project: { $in: projectIds } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [{ $and: [{ $ne: ['$status', 'done'] }, { $ne: ['$dueDate', null] }, { $lt: ['$dueDate', today] }] }, 1, 0],
          },
        },
      },
    },
  ]);
  for (const r of rows) map.set(String(r._id), { total: r.total, done: r.done, inProgress: r.inProgress, overdue: r.overdue });
  return map;
}

export async function listProjects(
  owner: string,
  q: { page: number; limit: number; search?: string; archived: 'true' | 'false' | 'all'; today?: string },
) {
  const filter: Record<string, unknown> = { owner: new mongoose.Types.ObjectId(owner) };
  if (q.archived !== 'all') filter.archived = q.archived === 'true';
  if (q.search) filter.name = { $regex: escapeRegex(q.search), $options: 'i' };

  const [items, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Project.countDocuments(filter),
  ]);
  const counts = await countsFor(owner, items.map((p) => p._id), resolveToday(q.today));
  return {
    items: items.map((p) => serializeProject(p, counts.get(String(p._id)) ?? { total: 0, done: 0, inProgress: 0, overdue: 0 })),
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  };
}

/** Loads a project only if it belongs to `owner`. Missing and foreign projects are indistinguishable (404). */
export async function getOwnedProject(owner: string, id: unknown) {
  const _id = parseObjectId(id, 'Project');
  const project = await Project.findOne({ _id, owner });
  if (!project) throw AppError.notFound('Project not found');
  return project;
}

export async function getProject(owner: string, id: unknown, today?: string) {
  const project = await getOwnedProject(owner, id);
  const counts = await countsFor(owner, [project._id], resolveToday(today));
  return serializeProject(project, counts.get(String(project._id)) ?? { total: 0, done: 0, inProgress: 0, overdue: 0 });
}

type ProjectInput = {
  name?: string;
  description?: string;
  color?: string;
  startDate?: string | null;
  deadline?: string | null;
  archived?: boolean;
};

export async function createProject(owner: string, input: ProjectInput & { name: string }) {
  const project = await Project.create({
    owner,
    name: input.name,
    description: input.description ?? '',
    ...(input.color ? { color: input.color } : {}),
    startDate: input.startDate ? dayStart(input.startDate) : null,
    deadline: input.deadline ? dayStart(input.deadline) : null,
  });
  return serializeProject(project, { total: 0, done: 0, inProgress: 0, overdue: 0 });
}

export async function updateProject(owner: string, id: unknown, input: ProjectInput) {
  const project = await getOwnedProject(owner, id);

  if (input.name !== undefined) project.name = input.name;
  if (input.description !== undefined) project.description = input.description;
  if (input.color !== undefined) project.color = input.color;
  if (input.startDate !== undefined) project.startDate = input.startDate ? dayStart(input.startDate) : null;
  if (input.deadline !== undefined) project.deadline = input.deadline ? dayStart(input.deadline) : null;
  if (input.archived !== undefined && input.archived !== project.archived) {
    project.archived = input.archived;
    project.archivedAt = input.archived ? new Date() : null;
  }

  // Validate the merged result so a partial update cannot produce deadline < start.
  if (project.startDate && project.deadline && project.deadline < project.startDate) {
    throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', { deadline: 'Deadline cannot be before the start date' });
  }
  await project.save();
  const counts = await countsFor(owner, [project._id], resolveToday());
  return serializeProject(project, counts.get(String(project._id)) ?? { total: 0, done: 0, inProgress: 0, overdue: 0 });
}

/** Deletes a project and all of its tasks.
 *  Tasks go first: if the second step fails the user is left with an empty project they can retry
 *  deleting, never with orphaned tasks pointing at a missing project. */
export async function deleteProject(owner: string, id: unknown) {
  const project = await getOwnedProject(owner, id);
  const { deletedCount } = await Task.deleteMany({ owner, project: project._id });
  await Project.deleteOne({ _id: project._id, owner });
  return { deletedTasks: deletedCount ?? 0 };
}
