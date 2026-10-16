import mongoose from 'mongoose';
import { AppError } from './AppError';

/** Validates an ObjectId from a URL/body and returns it, or throws 404 (never leaks existence). */
export function parseObjectId(value: unknown, label = 'Resource'): mongoose.Types.ObjectId {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value) || String(new mongoose.Types.ObjectId(value)) !== value) {
    throw AppError.notFound(`${label} not found`);
  }
  return new mongoose.Types.ObjectId(value);
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
