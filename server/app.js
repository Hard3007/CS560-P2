import express from 'express';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { checkDatabase } from './db/connection.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.get(['/health', '/api/health'], async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const database = await checkDatabase();
      if (config.requireDatabase && database !== 'connected') {
        return res.status(503).json({ status: 'unavailable', database });
      }
      res.json({ status: 'ok', database, revision: config.revision });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });

  app.use(
    express.static(fileURLToPath(new URL('../public/', import.meta.url))),
  );
  app.use((_req, res) => {
    res.status(404).type('text').send('Not found.');
  });
  return app;
}
