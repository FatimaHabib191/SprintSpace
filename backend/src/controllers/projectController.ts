import type { Request, Response } from 'express';
import { uid } from '../middleware/auth';
import { parseBody, parseQuery } from '../middleware/validate';
import * as projectService from '../services/projectService';
import * as taskService from '../services/taskService';
import {
  createProjectSchema,
  createProjectTaskSchema,
  listProjectsQuery,
  listTasksQuery,
  updateProjectSchema,
} from '../validation/schemas';

export async function list(req: Request, res: Response) {
  const q = parseQuery(listProjectsQuery, req);
  const { items, meta } = await projectService.listProjects(uid(req), q);
  res.json({ data: items, meta });
}

export async function create(req: Request, res: Response) {
  const input = parseBody(createProjectSchema, req);
  res.status(201).json({ data: await projectService.createProject(uid(req), input) });
}

export async function get(req: Request, res: Response) {
  const today = typeof req.query.today === 'string' ? req.query.today : undefined;
  res.json({ data: await projectService.getProject(uid(req), req.params.id, today) });
}

export async function update(req: Request, res: Response) {
  const input = parseBody(updateProjectSchema, req);
  res.json({ data: await projectService.updateProject(uid(req), req.params.id, input) });
}

export async function remove(req: Request, res: Response) {
  const result = await projectService.deleteProject(uid(req), req.params.id);
  res.json({ data: result });
}

export async function listTasks(req: Request, res: Response) {
  const owner = uid(req);
  const project = await projectService.getOwnedProject(owner, req.params.id);
  const q = parseQuery(listTasksQuery, req);
  const { items, meta } = await taskService.listTasks(owner, { ...q, sort: req.query.sort ? q.sort : 'position' }, project._id);
  res.json({ data: items, meta });
}

export async function createTask(req: Request, res: Response) {
  const input = parseBody(createProjectTaskSchema, req);
  res.status(201).json({ data: await taskService.createTask(uid(req), req.params.id, input) });
}
