import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController';
import * as dashboard from '../controllers/dashboardController';
import * as projects from '../controllers/projectController';
import * as tasks from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';
import { asyncHandler as h } from '../utils/asyncHandler';

const isTest = process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in a few minutes.' } },
});

const router = Router();

router.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));

// Auth
router.post('/auth/register', authLimiter, h(auth.register));
router.post('/auth/login', authLimiter, h(auth.login));
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, h(auth.me));
router.patch('/auth/me', requireAuth, h(auth.updateMe));
router.post('/auth/me/password', requireAuth, authLimiter, h(auth.changePassword));

// Everything below requires a valid session
router.use(requireAuth);

router.get('/projects', h(projects.list));
router.post('/projects', h(projects.create));
router.get('/projects/:id', h(projects.get));
router.patch('/projects/:id', h(projects.update));
router.delete('/projects/:id', h(projects.remove));
router.get('/projects/:id/tasks', h(projects.listTasks));
router.post('/projects/:id/tasks', h(projects.createTask));

router.get('/tasks', h(tasks.list));
router.post('/tasks', h(tasks.create));
router.get('/tasks/:id', h(tasks.get));
router.patch('/tasks/:id', h(tasks.update));
router.delete('/tasks/:id', h(tasks.remove));
router.patch('/tasks/:id/move', h(tasks.move));

router.get('/dashboard/summary', h(dashboard.summary));

export default router;
