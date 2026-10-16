import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { Project } from './models/Project';
import { Task } from './models/Task';
import { User } from './models/User';

async function main() {
  await connectDb();
  // Make sure declared indexes exist (important on a fresh Atlas cluster).
  await Promise.all([User.init(), Project.init(), Task.init()]);
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`SprintSpace API listening on :${env.port} (${env.nodeEnv})`));

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
