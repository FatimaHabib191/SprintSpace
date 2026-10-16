import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

const BCRYPT_ROUNDS = 12;
// Used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export function signToken(userId: string): string {
  return jwt.sign({}, env.jwtSecret, { subject: userId, expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await User.exists({ email: input.email });
  if (existing) throw AppError.conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });
  return user;
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Incorrect email or password', 'INVALID_CREDENTIALS');
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw AppError.unauthorized();
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new AppError(400, 'Current password is incorrect', 'INVALID_CREDENTIALS');
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
}
