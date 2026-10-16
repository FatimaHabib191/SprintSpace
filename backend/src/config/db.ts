import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(uri = env.mongoUri): Promise<void> {
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
