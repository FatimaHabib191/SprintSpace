import type { Request, Response } from 'express';
import { uid } from '../middleware/auth';
import { parseBody, parseQuery } from '../middleware/validate';
import * as taskService from '../services/taskService';
import { createTaskSchema, listTasksQuery, moveTaskSchema, updateTaskSchema } from '../validation/schemas';

export async function list(req: Request, res: Response) {
  const q = parseQuery(listTasksQuery, req);
  const { items, meta } = await taskService.listTasks(uid(req), q);
  res.json({ data: items, meta });
}

export async function create(req: Request, res: Response) {
  const { project, ...input } = parseBody(createTaskSchema, req);
  res.status(201).json({ data: await taskService.createTask(uid(req), project, input) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await taskService.getTask(uid(req), req.params.id) });
}

export async function update(req: Request, res: Response) {
  const input = parseBody(updateTaskSchema, req);
  res.json({ data: await taskService.updateTask(uid(req), req.params.id, input) });
}

export async function remove(req: Request, res: Response) {
  await taskService.deleteTask(uid(req), req.params.id);
  res.status(204).end();
}

export async function move(req: Request, res: Response) {
  const { status, index } = parseBody(moveTaskSchema, req);
  res.json({ data: await taskService.moveTask(uid(req), req.params.id, status, index) });
}
