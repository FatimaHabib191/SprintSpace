import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app';

let mongod: MongoMemoryServer | undefined;
export const app = createApp();

/** Set MONGODB_TEST_URI to run against an existing MongoDB (e.g. a local or Atlas test cluster);
 *  otherwise an in-memory server is downloaded and started. A throwaway database name is always used. */
export async function startDb() {
  const external = process.env.MONGODB_TEST_URI;
  if (external) {
    await mongoose.connect(external, { dbName: `sprintspace_test_${process.pid}_${Date.now()}` });
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function stopDb() {
  if (process.env.MONGODB_TEST_URI && mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

/** supertest agent that keeps cookies and always sends the CSRF header. */
export function agent() {
  const a = request.agent(app);
  a.set('X-Requested-With', 'sprintspace');
  return a;
}

export async function registerUser(email = 'ada@example.com', name = 'Ada') {
  const a = agent();
  const res = await a.post('/api/auth/register').send({ name, email, password: 'Passw0rdOK' });
  expect(res.status).toBe(201);
  return a;
}

export async function makeProject(a: ReturnType<typeof agent>, name = 'Launch', extra: object = {}) {
  const res = await a.post('/api/projects').send({ name, ...extra });
  expect(res.status).toBe(201);
  return res.body.data as { id: string };
}

export async function makeTask(a: ReturnType<typeof agent>, projectId: string, title: string, extra: object = {}) {
  const res = await a.post(`/api/projects/${projectId}/tasks`).send({ title, ...extra });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; position: number; status: string };
}
