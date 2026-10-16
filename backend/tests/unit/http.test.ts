import request from 'supertest';
import { createApp } from '../../src/app';

// These requests are rejected before any database access, so they run without MongoDB.
const app = createApp();
const csrf = { 'X-Requested-With': 'sprintspace' };

describe('HTTP layer (no database required)', () => {
  it('serves health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it.each([
    ['GET', '/api/projects'],
    ['POST', '/api/projects'],
    ['GET', '/api/projects/64b64b64b64b64b64b64b64b'],
    ['PATCH', '/api/projects/64b64b64b64b64b64b64b64b'],
    ['DELETE', '/api/projects/64b64b64b64b64b64b64b64b'],
    ['GET', '/api/tasks'],
    ['POST', '/api/tasks'],
    ['PATCH', '/api/tasks/64b64b64b64b64b64b64b64b/move'],
    ['DELETE', '/api/tasks/64b64b64b64b64b64b64b64b'],
    ['GET', '/api/dashboard/summary'],
    ['GET', '/api/auth/me'],
  ])('%s %s requires authentication', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path).set(csrf);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects mutating requests without the CSRF header', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF');
  });

  it('validates registration input before touching the database', async () => {
    const res = await request(app).post('/api/auth/register').set(csrf).send({ name: '', email: 'nope', password: 'short' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['email', 'name', 'password']);
  });

  it('validates login input', async () => {
    const res = await request(app).post('/api/auth/login').set(csrf).send({});
    expect(res.status).toBe(422);
  });

  it('rejects forged / tampered cookies', async () => {
    const res = await request(app).get('/api/projects').set('Cookie', 'ss_token=forged.token.value');
    expect(res.status).toBe(401);
  });

  it('returns JSON errors for malformed bodies and unknown routes', async () => {
    const bad = await request(app).post('/api/auth/login').set(csrf).set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('BAD_JSON');
    // Unknown API paths don't reveal themselves to anonymous callers.
    expect((await request(app).get('/api/nope')).status).toBe(401);
    const missing = await request(app).get('/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('only echoes CORS credentials for allowed origins', async () => {
    const ok = await request(app).options('/api/projects').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'GET');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const evil = await request(app).options('/api/projects').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});
