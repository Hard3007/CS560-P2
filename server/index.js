import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, closeDatabase } from './db/connection.js';

try {
  await connectDatabase();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const server = createApp().listen(config.port, '0.0.0.0');
server.on('listening', () => {
  console.log(`RecallGuard listening on port ${config.port}.`);
});
server.on('error', async () => {
  console.error(
    'Server startup failed. Check PORT and whether it is already in use.',
  );
  await closeDatabase();
  process.exit(1);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
