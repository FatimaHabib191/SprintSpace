import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { Task, TASK_PRIORITIES, TASK_STATUSES } from '../models/Task';
import { resolveToday } from '../utils/dates';

export async function getSummary(owner: string, todayInput?: string) {
  const ownerId = new mongoose.Types.ObjectId(owner);
  const today = resolveToday(todayInput);

  const [totalProjects, activeProjects, taskFacets, projects] = await Promise.all([
    Project.countDocuments({ owner: ownerId }),
    Project.countDocuments({ owner: ownerId, archived: false }),
    Task.aggregate([
      { $match: { owner: ownerId } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                overdue: {
                  $sum: {
                    $cond: [{ $and: [{ $ne: ['$status', 'done'] }, { $ne: ['$dueDate', null] }, { $lt: ['$dueDate', today] }] }, 1, 0],
                  },
                },
              },
            },
          ],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          byProject: [
            {
              $group: {
                _id: '$project',
                total: { $sum: 1 },
                done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
              },
            },
          ],
        },
      },
    ]),
    Project.find({ owner: ownerId, archived: false }).select('name color').lean(),
  ]);

  const facet = taskFacets[0];
  const totals = facet.totals[0] ?? { total: 0, overdue: 0 };
  const statusMap = new Map<string, number>(facet.byStatus.map((r: { _id: string; count: number }) => [r._id, r.count]));
  const priorityMap = new Map<string, number>(facet.byPriority.map((r: { _id: string; count: number }) => [r._id, r.count]));
  const projectMap = new Map<string, { total: number; done: number }>(
    facet.byProject.map((r: { _id: mongoose.Types.ObjectId; total: number; done: number }) => [String(r._id), r]),
  );

  const done = statusMap.get('done') ?? 0;
  const inProgress = statusMap.get('in_progress') ?? 0;

  return {
    totalProjects,
    activeProjects,
    totalTasks: totals.total as number,
    completedTasks: done,
    inProgressTasks: inProgress,
    overdueTasks: totals.overdue as number,
    completionRate: totals.total > 0 ? Math.round((done / totals.total) * 100) : 0,
    byStatus: TASK_STATUSES.map((status) => ({ status, count: statusMap.get(status) ?? 0 })),
    byPriority: TASK_PRIORITIES.map((priority) => ({ priority, count: priorityMap.get(priority) ?? 0 })),
    projectProgress: projects
      .map((p) => {
        const c = projectMap.get(String(p._id)) ?? { total: 0, done: 0 };
        return {
          projectId: String(p._id),
          name: p.name,
          color: p.color,
          total: c.total,
          done: c.done,
          completion: c.total > 0 ? Math.round((c.done / c.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total),
  };
}
