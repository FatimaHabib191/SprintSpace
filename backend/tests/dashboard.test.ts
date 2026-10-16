import { clearDb, makeProject, makeTask, registerUser, startDb, stopDb } from './helpers';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const TODAY = '2026-06-01';

describe('dashboard summary', () => {
  it('returns honest zeros with no data', async () => {
    const a = await registerUser();
    const res = await a.get(`/api/dashboard/summary?today=${TODAY}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalProjects: 0, totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, completionRate: 0, projectProgress: [],
    });
    expect(res.body.data.byStatus.every((s: { count: number }) => s.count === 0)).toBe(true);
  });

  it('computes metrics from records and recalculates after every kind of mutation', async () => {
    const a = await registerUser();
    const p1 = await makeProject(a, 'Alpha');
    const p2 = await makeProject(a, 'Beta');
    const t1 = await makeTask(a, p1.id, 't1', { priority: 'urgent', dueDate: '2026-05-01' }); // overdue
    const t2 = await makeTask(a, p1.id, 't2', { status: 'done', priority: 'low', dueDate: '2026-05-01' }); // done, not overdue
    await makeTask(a, p1.id, 't3', { status: 'in_progress', priority: 'high' });
    await makeTask(a, p2.id, 't4', { priority: 'medium', dueDate: '2026-09-01' });

    const get = async () => (await a.get(`/api/dashboard/summary?today=${TODAY}`)).body.data;
    let s = await get();
    expect(s).toMatchObject({ totalProjects: 2, activeProjects: 2, totalTasks: 4, completedTasks: 1, inProgressTasks: 1, overdueTasks: 1, completionRate: 25 });
    expect(s.byStatus).toEqual([{ status: 'todo', count: 2 }, { status: 'in_progress', count: 1 }, { status: 'done', count: 1 }]);
    expect(s.byPriority).toEqual([
      { priority: 'low', count: 1 }, { priority: 'medium', count: 1 }, { priority: 'high', count: 1 }, { priority: 'urgent', count: 1 },
    ]);
    const alpha = s.projectProgress.find((p: { name: string }) => p.name === 'Alpha');
    expect(alpha).toMatchObject({ total: 3, done: 1, completion: 33 });

    // status change via drag-and-drop move
    await a.patch(`/api/tasks/${t1.id}/move`).send({ status: 'done', index: 0 });
    s = await get();
    expect(s).toMatchObject({ completedTasks: 2, overdueTasks: 0, completionRate: 50 });

    // edit: push due date into the past while not done
    await a.patch(`/api/tasks/${t2.id}`).send({ status: 'todo' });
    s = await get();
    expect(s).toMatchObject({ completedTasks: 1, overdueTasks: 1 });

    // delete task
    await a.delete(`/api/tasks/${t2.id}`);
    s = await get();
    expect(s).toMatchObject({ totalTasks: 3, overdueTasks: 0 });

    // archive project: still counted in totals, hidden from progress
    await a.patch(`/api/projects/${p2.id}`).send({ archived: true });
    s = await get();
    expect(s).toMatchObject({ totalProjects: 2, activeProjects: 1, totalTasks: 3 });
    expect(s.projectProgress.map((p: { name: string }) => p.name)).toEqual(['Alpha']);

    // delete project cascades
    await a.delete(`/api/projects/${p1.id}`);
    s = await get();
    expect(s).toMatchObject({ totalProjects: 1, totalTasks: 1, completedTasks: 0 });
  });

  it('only counts the signed-in user\'s data', async () => {
    const a = await registerUser('a@example.com', 'A');
    const b = await registerUser('b@example.com', 'B');
    const pa = await makeProject(a);
    await makeTask(a, pa.id, 'x');
    expect((await b.get('/api/dashboard/summary')).body.data.totalTasks).toBe(0);
  });
});
