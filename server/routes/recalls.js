import { Router } from 'express';
import { readRecalls, readRecallFilters, riskOptions } from '../db/recalls.js';

export const recallsRouter = Router();

function validDate(value) {
  if (value === '') return true;
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000')
  )
    return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  );
}

recallsRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const {
    page = '1',
    limit = '20',
    country = '',
    q = '',
    category = '',
    risk = '',
    sort = 'latest',
    updatedFrom = '',
    updatedTo = '',
  } = req.query;
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

  if (
    !['', 'US', 'CA'].includes(country) ||
    typeof q !== 'string' ||
    q.length > 120 ||
    typeof category !== 'string' ||
    category.length > 160 ||
    !['', ...riskOptions.map((item) => item.value)].includes(risk) ||
    !['latest', 'oldest'].includes(sort)
  )
    return res.status(400).json({
      error: 'Choose valid filters. Search is limited to 120 characters.',
    });

  if (
    !validDate(updatedFrom) ||
    !validDate(updatedTo) ||
    (updatedFrom && updatedTo && updatedFrom > updatedTo)
  )
    return res.status(400).json({
      error:
        'Use valid dates (YYYY-MM-DD), with the start on or before the end.',
    });

  try {
    res.json(
      await readRecalls({
        page: Number(page),
        limit: Number(limit),
        country,
        q: q.trim(),
        category: category.trim(),
        risk,
        sort,
        updatedFrom,
        updatedTo,
      }),
    );
  } catch {
    res.status(503).json({ error: 'Recall data is currently unavailable.' });
  }
});

recallsRouter.get('/filters', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.json(await readRecallFilters());
  } catch {
    res
      .status(503)
      .json({ error: 'Recall filters are currently unavailable.' });
  }
});
