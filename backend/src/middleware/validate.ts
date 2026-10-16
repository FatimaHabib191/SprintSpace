import type { Request } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../utils/AppError';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', fields);
  }
  return result.data;
}

export const parseBody = <T extends ZodTypeAny>(schema: T, req: Request): z.infer<T> => parse(schema, req.body ?? {});
export const parseQuery = <T extends ZodTypeAny>(schema: T, req: Request): z.infer<T> => parse(schema, req.query);
