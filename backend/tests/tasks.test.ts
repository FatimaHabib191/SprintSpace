import { clearDb, makeProject, makeTask, registerUser, startDb, stopDb } from './helpers';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const titles = (res: { body: { data: { title: string }[] } }) => res.body.data.map((t) => t.title);

describe('tasks', () => {
  it('creates with defaults, reads, edits and deletes', async () => {
    const a = await registerUser();
    const p = await makeProject(a);
    const t = await makeTask(a, p.id, 'Write spec', { description: 'Draft', priority: 'high', dueDate: '2026-12-01' });

    const got = await a.get(`/api/tasks/${t.id}`);
    expect(got.body.data).toMatchObject({ title: 'Write spec', status: 'todo', priority: 'high', dueDate: '2026-12-01', description: 'Draft' });
    expect(got.body.data.projectName).toBe('Launch');

    const edited = await a.patch(`/api/tasks/${t.id}`).send({ title: 'Write the spec', priority: 'urgent', dueDate: null });
    expect(edited.body.data).toMatchObject({ title: 'Write the spec', priority: 'urgent', dueDate: null });

    expect((await a.delete(`/api/tasks/${t.id}`)).status).toBe(204);
    expect((await a.get(`/api/tasks/${t.id}`)).status).toBe(404);
  });

  it('validates fields', async () => {
    const a = await registerUser();
    const p = await makeProject(a);
    expect((await a.post(`/api/projects/${p.id}/tasks`).send({ title: '  ' })).status).toBe(422);
    expect((await a.post(`/api/projects/${p.id}/tasks`).send({ title: 'x', status: 'blocked' })).status).toBe(422);
    expect((await a.post(`/api/projects/${p.id}/tasks`).send({ title: 'x', priority: 'asap' })).status).toBe(422);
    expect((await a.post(`/api/projects/${p.id}/tasks`).send({ title: 'x', dueDate: '2026-02-31x' })).status).toBe(422);
    expect((await a.post('/api/tasks').send({ title: 'x' })).status).toBe(422);
    expect((await a.get('/api/tasks/not-an-id')).status).toBe(404);
  });

  it('filters by status, priority, project, search and overdue', async () => {
    const a = await registerUser();
    const p1 = await makeProject(a, 'One');
    const p2 = await makeProject(a, 'Two');
    await makeTask(a, p1.id, 'Fix login bug', { priority: 'urgent', dueDate: '2026-01-01' });
    await makeTask(a, p1.id, 'Old but done', { status: 'done', dueDate: '2026-01-01' });
    await makeTask(a, p1.id, 'Future', { priority: 'low', dueDate: '2099-01-01' });
    await makeTask(a, p2.id, 'Plan launch', { status: 'in_progress', description: 'login flow review' });

    expect(titles(await a.get('/api/tasks?status=in_progress'))).toEqual(['Plan launch']);
    expect(titles(await a.get('/api/tasks?priority=urgent'))).toEqual(['Fix login bug']);
    expect(titles(await a.get(`/api/tasks?project=${p2.id}`))).toEqual(['Plan launch']);
    expect((await a.get('/api/tasks?search=login')).body.data).toHaveLength(2);
    expect((await a.get('/api/tasks?search=.*')).body.data).toHaveLength(0); // regex chars are escaped

    const overdue = await a.get('/api/tasks?overdue=true&today=2026-06-01');
    expect(titles(overdue)).toEqual(['Fix login bug']); // done tasks are never overdue
    expect(titles(await a.get('/api/tasks?overdue=true&today=2025-01-01'))).toEqual([]);
  });

  it('moves a task to another project only if the user owns that project', async () => {
    const a = await registerUser();
    const b = await registerUser('bob@example.com', 'Bob');
    const p1 = await makeProject(a, 'A1');
    const p2 = await makeProject(a, 'A2');
    const foreign = await makeProject(b, 'B1');
    const t = await makeTask(a, p1.id, 'Mover');

    expect((await a.patch(`/api/tasks/${t.id}`).send({ project: p2.id })).body.data.project).toBe(p2.id);
    expect((await a.patch(`/api/tasks/${t.id}`).send({ project: foreign.id })).status).toBe(404);
  });
});

describe('kanban move & order persistence', () => {
  async function board() {
    const a = await registerUser();
    const p = await makeProject(a);
    const ids: Record<string, string> = {};
    for (const n of ['A', 'B', 'C']) ids[n] = (await makeTask(a, p.id, n)).id;
    const order = async (status = 'todo') =>
      titles(await a.get(`/api/projects/${p.id}/tasks?status=${status}`));
    return { a, p, ids, order };
  }

  it('lists a project board in column order by default', async () => {
    const { order } = await board();
    expect(await order()).toEqual(['A', 'B', 'C']);
  });

  it('reorders within a column and the order survives a fresh read', async () => {
    const { a, ids, order } = await board();
    expect((await a.patch(`/api/tasks/${ids.C}/move`).send({ status: 'todo', index: 0 })).status).toBe(200);
    expect(await order()).toEqual(['C', 'A', 'B']);
    await a.patch(`/api/tasks/${ids.A}/move`).send({ status: 'todo', index: 2 });
    expect(await order()).toEqual(['C', 'B', 'A']);
    await a.patch(`/api/tasks/${ids.B}/move`).send({ status: 'todo', index: 1 });
    expect(await order()).toEqual(['C', 'B', 'A']);
  });

  it('moves across columns at a specific index, updating status and completedAt', async () => {
    const { a, p, ids, order } = await board();
    const done1 = (await makeTask(a, p.id, 'D1', { status: 'done' })).id;
    await makeTask(a, p.id, 'D2', { status: 'done' });

    const res = await a.patch(`/api/tasks/${ids.B}/move`).send({ status: 'done', index: 1 });
    expect(res.body.data.status).toBe('done');
    expect(res.body.data.completedAt).not.toBeNull();
    expect(await order('done')).toEqual(['D1', 'B', 'D2']);
    expect(await order('todo')).toEqual(['A', 'C']);

    const back = await a.patch(`/api/tasks/${done1}/move`).send({ status: 'in_progress', index: 0 });
    expect(back.body.data.completedAt).toBeNull();
  });

  it('clamps out-of-range indexes and handles empty columns', async () => {
    const { a, ids, order } = await board();
    await a.patch(`/api/tasks/${ids.A}/move`).send({ status: 'in_progress', index: 50 });
    expect(await order('in_progress')).toEqual(['A']);
    await a.patch(`/api/tasks/${ids.B}/move`).send({ status: 'todo', index: 999 });
    expect(await order()).toEqual(['C', 'B']);
  });

  it('keeps order stable after many repeated inserts at the same spot (float gap renumbering)', async () => {
    const { a, p, ids, order } = await board();
    const extra: string[] = [];
    for (let i = 0; i < 45; i++) extra.push((await makeTask(a, p.id, `X${i}`, { status: 'in_progress' })).id);
    await a.patch(`/api/tasks/${ids.A}/move`).send({ status: 'in_progress', index: 1 });
    for (let i = 0; i < 45; i++) {
      const r = await a.patch(`/api/tasks/${extra[i]}/move`).send({ status: 'in_progress', index: 1 });
      expect(r.status).toBe(200);
    }
    const final = await order('in_progress');
    expect(final).toHaveLength(46);
    expect(final[0]).toBe('X0');
    expect(final[1]).toBe('X44');
    expect(new Set(final).size).toBe(46);
  }, 120000);

  it('rejects invalid move payloads', async () => {
    const { a, ids } = await board();
    expect((await a.patch(`/api/tasks/${ids.A}/move`).send({ status: 'nope', index: 0 })).status).toBe(422);
    expect((await a.patch(`/api/tasks/${ids.A}/move`).send({ status: 'todo', index: -1 })).status).toBe(422);
    expect((await a.patch(`/api/tasks/${ids.A}/move`).send({ status: 'todo' })).status).toBe(422);
  });
});
