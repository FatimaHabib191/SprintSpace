import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { env } from '../src/config/env';
import { agent, app, clearDb, registerUser, startDb, stopDb } from './helpers';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('auth', () => {
  it('registers, sets an HttpOnly cookie, and never returns the password hash', async () => {
    const res = await agent().post('/api/auth/register').send({ name: 'Ada', email: 'ADA@Example.com', password: 'Passw0rdOK' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('ada@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Passw0rdOK/);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/ss_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('rejects duplicate emails and weak passwords with field errors', async () => {
    await registerUser();
    const dup = await agent().post('/api/auth/register').send({ name: 'Ada', email: 'ada@example.com', password: 'Passw0rdOK' });
    expect(dup.status).toBe(409);
    const weak = await agent().post('/api/auth/register').send({ name: 'B', email: 'b@example.com', password: 'short' });
    expect(weak.status).toBe(422);
    expect(weak.body.error.details.password).toBeDefined();
  });

  it('logs in with correct credentials and rejects wrong ones identically', async () => {
    await registerUser();
    const ok = await agent().post('/api/auth/login').send({ email: 'ada@example.com', password: 'Passw0rdOK' });
    expect(ok.status).toBe(200);
    const badPw = await agent().post('/api/auth/login').send({ email: 'ada@example.com', password: 'wrongpass1' });
    const noUser = await agent().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrongpass1' });
    expect(badPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(badPw.body.error.message).toBe(noUser.body.error.message);
  });

  it('protects routes, persists the session, and clears it on logout', async () => {
    const anon = await agent().get('/api/projects');
    expect(anon.status).toBe(401);

    const a = await registerUser();
    expect((await a.get('/api/auth/me')).body.data.user.email).toBe('ada@example.com');
    expect((await a.post('/api/auth/logout')).status).toBe(204);
    expect((await a.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects tampered and expired tokens', async () => {
    const bad = await request(app).get('/api/auth/me').set('Cookie', 'ss_token=not.a.jwt');
    expect(bad.status).toBe(401);

    const expired = jwt.sign({}, env.jwtSecret, { subject: '64b64b64b64b64b64b64b64b', expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Cookie', `ss_token=${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('rejects a valid token for a deleted account', async () => {
    const a = await registerUser();
    await mongoose.connection.collection('users').deleteMany({});
    expect((await a.get('/api/auth/me')).status).toBe(401);
  });

  it('requires the CSRF header on mutating requests', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF');
  });

  it('updates profile name and changes password', async () => {
    const a = await registerUser();
    expect((await a.patch('/api/auth/me').send({ name: 'Ada L.' })).body.data.user.name).toBe('Ada L.');
    expect((await a.post('/api/auth/me/password').send({ currentPassword: 'nope', newPassword: 'NewPassw0rd' })).status).toBe(400);
    expect((await a.post('/api/auth/me/password').send({ currentPassword: 'Passw0rdOK', newPassword: 'NewPassw0rd' })).status).toBe(204);
    const relog = await agent().post('/api/auth/login').send({ email: 'ada@example.com', password: 'NewPassw0rd' });
    expect(relog.status).toBe(200);
  });
});
