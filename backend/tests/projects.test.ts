import { clearDb, makeProject, makeTask, registerUser, startDb, stopDb } from './helpers';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('projects', () => {
  it('creates, lists, edits, archives, restores and filters', async () => {
    const a = await registerUser();
    const p = await makeProject(a, 'Website Redesign', { color: '#c4704f', startDate: '2026-01-01', deadline: '2026-03-01', description: 'New look' });
    await makeProject(a, 'Mobile App');

    const list = await a.get('/api/projects');
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta.total).toBe(2);

    const search = await a.get('/api/projects?search=website');
    expect(search.body.data.map((x: { name: string }) => x.name)).toEqual(['Website Redesign']);

    const edit = await a.patch(`/api/projects/${p.id}`).send({ name: 'Site v2', deadline: '2026-04-01' });
    expect(edit.body.data.name).toBe('Site v2');
    expect(edit.body.data.deadline).toBe('2026-04-01');

    const arch = await a.patch(`/api/projects/${p.id}`).send({ archived: true });
    expect(arch.body.data.archived).toBe(true);
    expect((await a.get('/api/projects')).body.data).toHaveLength(1);
    expect((await a.get('/api/projects?archived=true')).body.data).toHaveLength(1);
    expect((await a.get('/api/projects?archived=all')).body.data).toHaveLength(2);

    const restore = await a.patch(`/api/projects/${p.id}`).send({ archived: false });
    expect(restore.body.data.archived).toBe(false);
    expect(restore.body.data.archivedAt).toBeNull();
  });

  it('validates input, including deadline before start (create and partial update)', async () => {
    const a = await registerUser();
    expect((await a.post('/api/projects').send({ name: '' })).status).toBe(422);
    expect((await a.post('/api/projects').send({ name: 'X', color: 'green' })).status).toBe(422);
    const bad = await a.post('/api/projects').send({ name: 'X', startDate: '2026-05-01', deadline: '2026-04-01' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.deadline).toBeDefined();

    const p = await makeProject(a, 'Ok', { startDate: '2026-05-01', deadline: '2026-06-01' });
    const partial = await a.patch(`/api/projects/${p.id}`).send({ deadline: '2026-04-01' });
    expect(partial.status).toBe(422);
  });

  it('reports task counts and completion percentage', async () => {
    const a = await registerUser();
    const p = await makeProject(a);
    await makeTask(a, p.id, 'a', { status: 'done' });
    await makeTask(a, p.id, 'b', { status: 'in_progress' });
    await makeTask(a, p.id, 'c');
    await makeTask(a, p.id, 'd', { status: 'done' });
    const res = await a.get(`/api/projects/${p.id}`);
    expect(res.body.data).toMatchObject({ taskCount: 4, doneCount: 2, inProgressCount: 1, completion: 50 });
  });

  it('cascades deletion to tasks and leaves other projects intact', async () => {
    const a = await registerUser();
    const p = await makeProject(a, 'Doomed');
    const keep = await makeProject(a, 'Keep');
    await makeTask(a, p.id, 't1');
    await makeTask(a, p.id, 't2');
    await makeTask(a, keep.id, 'safe');

    const del = await a.delete(`/api/projects/${p.id}`);
    expect(del.status).toBe(200);
    expect(del.body.data.deletedTasks).toBe(2);
    expect((await a.get(`/api/projects/${p.id}`)).status).toBe(404);

    const tasks = await a.get('/api/tasks');
    expect(tasks.body.data.map((t: { title: string }) => t.title)).toEqual(['safe']);
  });

  it('paginates', async () => {
    const a = await registerUser();
    for (let i = 0; i < 5; i++) await makeProject(a, `P${i}`);
    const page2 = await a.get('/api/projects?limit=2&page=2');
    expect(page2.body.data).toHaveLength(2);
    expect(page2.body.meta).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect((await a.get('/api/projects?limit=1000')).status).toBe(422);
  });
});
