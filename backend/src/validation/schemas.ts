import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), 'Invalid date');

const optionalDay = day.nullable().optional();

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password needs a letter')
  .regex(/\d/, 'Password needs a number');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

const projectBase = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().trim().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #2f5d46').optional(),
  startDate: optionalDay,
  deadline: optionalDay,
});

const deadlineAfterStart = (v: { startDate?: string | null; deadline?: string | null }) =>
  !v.startDate || !v.deadline || v.deadline >= v.startDate;

export const createProjectSchema = projectBase.refine(deadlineAfterStart, {
  message: 'Deadline cannot be before the start date',
  path: ['deadline'],
});

export const updateProjectSchema = projectBase
  .partial()
  .extend({ archived: z.boolean().optional() })
  .refine(deadlineAfterStart, { message: 'Deadline cannot be before the start date', path: ['deadline'] });

const taskBase = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: optionalDay,
});

export const createTaskSchema = taskBase.extend({
  project: z.string().min(1, 'Project is required'),
});
export const createProjectTaskSchema = taskBase;
export const updateTaskSchema = taskBase.partial().extend({ project: z.string().optional() });

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
  /** Target index within the destination column, counted without the moved task. */
  index: z.number().int().min(0).max(100000),
});

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
};

export const listProjectsQuery = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(100).optional(),
  archived: z.enum(['true', 'false', 'all']).default('false'),
  today: z.string().optional(),
});

export const listTasksQuery = z.object({
  ...pagination,
  search: z.string().trim().max(100).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  project: z.string().optional(),
  overdue: bool.optional(),
  today: z.string().optional(),
  sort: z.enum(['position', 'dueDate', 'createdAt', 'updatedAt']).default('updatedAt'),
});

export const summaryQuery = z.object({ today: z.string().optional() });
