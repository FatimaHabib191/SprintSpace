import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import { COOKIE_NAME, uid } from '../middleware/auth';
import { parseBody } from '../middleware/validate';
import { User } from '../models/User';
import * as authService from '../services/authService';
import { serializeUser } from '../services/serializers';
import { AppError } from '../utils/AppError';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../validation/schemas';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
});

function setSession(res: Response, userId: string) {
  res.cookie(COOKIE_NAME, authService.signToken(userId), { ...cookieOptions(), maxAge: SEVEN_DAYS });
}

export async function register(req: Request, res: Response) {
  const input = parseBody(registerSchema, req);
  const user = await authService.register(input);
  setSession(res, String(user._id));
  res.status(201).json({ data: { user: serializeUser(user) } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = parseBody(loginSchema, req);
  const user = await authService.login(email, password);
  setSession(res, String(user._id));
  res.json({ data: { user: serializeUser(user) } });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(uid(req)).lean();
  if (!user) throw AppError.unauthorized();
  res.json({ data: { user: serializeUser(user) } });
}

export async function updateMe(req: Request, res: Response) {
  const { name } = parseBody(updateProfileSchema, req);
  const user = await User.findByIdAndUpdate(uid(req), { name }, { new: true, runValidators: true }).lean();
  if (!user) throw AppError.unauthorized();
  res.json({ data: { user: serializeUser(user) } });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = parseBody(changePasswordSchema, req);
  await authService.changePassword(uid(req), currentPassword, newPassword);
  res.status(204).end();
}
