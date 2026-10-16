import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { parseObjectId } from '../utils/objectId';

export const COOKIE_NAME = 'ss_token';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set only by `requireAuth`, derived from the verified JWT - never from client input. */
    userId?: string;
  }
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw AppError.unauthorized();

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    throw new AppError(401, expired ? 'Your session has expired. Please sign in again.' : 'Invalid session', expired ? 'SESSION_EXPIRED' : 'UNAUTHORIZED');
  }

  const id = parseObjectId(payload.sub, 'User');
  // Confirms the account still exists (e.g. not deleted after the token was issued).
  const exists = await User.exists({ _id: id });
  if (!exists) throw AppError.unauthorized('Account no longer exists');

  req.userId = String(id);
  next();
});

/** Lightweight CSRF defence for cookie auth: state-changing requests must carry a custom header,
 *  which browsers will not attach to cross-site form posts and which forces a CORS preflight. */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'sprintspace') {
    return next(new AppError(403, 'Missing required request header', 'CSRF'));
  }
  next();
}

export function uid(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}
