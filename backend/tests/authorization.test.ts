import { clearDb, makeProject, makeTask, registerUser, startDb, stopDb } from './helpers';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('cross-user access is impossible', () => {
  it('hides, rejects and preserves another user\'s projects and tasks', async () => {
    const alice = await registerUser('alice@example.com', 'Alice');
    const mallory = await registerUser('mallory@example.com', 'Mallory');
    const p = await makeProject(alice, 'Secret');
    const t = await makeTask(alice, p.id, 'Private task');

    // Reads look exactly like "not found"
    expect((await mallory.get(`/api/projects/${p.id}`)).status).toBe(404);
    expect((await mallory.get(`/api/projects/${p.id}/tasks`)).status).toBe(404);
    expect((await mallory.get(`/api/tasks/${t.id}`)).status).toBe(404);

    // Writes are rejected
    expect((await mallory.patch(`/api/projects/${p.id}`).send({ name: 'Pwned' })).status).toBe(404);
    expect((await mallory.delete(`/api/projects/${p.id}`)).status).toBe(404);
    expect((await mallory.post(`/api/projects/${p.id}/tasks`).send({ title: 'Injected' })).status).toBe(404);
    expect((await mallory.post('/api/tasks').send({ title: 'Injected', project: p.id })).status).toBe(404);
    expect((await mallory.patch(`/api/tasks/${t.id}`).send({ title: 'Pwned' })).status).toBe(404);
    expect((await mallory.patch(`/api/tasks/${t.id}/move`).send({ status: 'done', index: 0 })).status).toBe(404);
    expect((await mallory.delete(`/api/tasks/${t.id}`)).status).toBe(404);

    // Lists and filters never leak
    expect((await mallory.get('/api/projects')).body.data).toHaveLength(0);
    expect((await mallory.get('/api/tasks')).body.data).toHaveLength(0);
    expect((await mallory.get(`/api/tasks?project=${p.id}`)).body.data).toHaveLength(0);
    expect((await mallory.get('/api/dashboard/summary')).body.data).toMatchObject({ totalProjects: 0, totalTasks: 0 });

    // Alice's data is untouched
    const still = await alice.get(`/api/tasks/${t.id}`);
    expect(still.body.data.title).toBe('Private task');
    expect((await alice.get(`/api/projects/${p.id}`)).body.data.name).toBe('Secret');
  });

  it('ignores a client-supplied owner in request bodies', async () => {
    const alice = await registerUser('alice@example.com', 'Alice');
    const mallory = await registerUser('mallory@example.com', 'Mallory');
    const aliceId = (await alice.get('/api/auth/me')).body.data.user.id;

    const p = await mallory.post('/api/projects').send({ name: 'Mine', owner: aliceId });
    expect(p.status).toBe(201);
    expect((await alice.get('/api/projects')).body.data).toHaveLength(0);
    expect((await mallory.get('/api/projects')).body.data).toHaveLength(1);
  });
});
