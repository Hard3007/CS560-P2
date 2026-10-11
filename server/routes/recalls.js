import { Router } from 'express';
import { readRecalls } from '../db/recalls.js';

export const recallsRouter = Router();

recallsRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { page = '1', limit = '20' } = req.query;
  if (
    typeof page !== 'string' ||
    typeof limit !== 'string' ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(limit) ||
    !Number.isSafeInteger(Number(page) * Number(limit)) ||
    Number(limit) > 100
  ) {
    return res.status(400).json({
      error:
        'page must be a positive integer; limit must be between 1 and 100.',
    });
  }

  try {
    res.json(await readRecalls({ page: Number(page), limit: Number(limit) }));
  } catch {
    res.status(503).json({ error: 'Recall data is currently unavailable.' });
  }
});
