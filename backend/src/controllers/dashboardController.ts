import type { Request, Response } from 'express';
import { uid } from '../middleware/auth';
import { parseQuery } from '../middleware/validate';
import { getSummary } from '../services/dashboardService';
import { summaryQuery } from '../validation/schemas';

export async function summary(req: Request, res: Response) {
  const { today } = parseQuery(summaryQuery, req);
  res.json({ data: await getSummary(uid(req), today) });
}
