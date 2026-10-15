import { Router, json } from 'express';
import * as store from '../db/watchlist.js';
import { readRecall } from '../db/recalls.js';
export const statuses = ['Reviewing', 'Contacted Manufacturer', 'Resolved'];
export function watchlistFields(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !Object.keys(body).length ||
    Object.keys(body).some((key) => !['status', 'notes'].includes(key))
  )
    return null;
  if (Object.hasOwn(body, 'status') && !statuses.includes(body.status))
    return null;
  if (
    Object.hasOwn(body, 'notes') &&
    (typeof body.notes !== 'string' || body.notes.length > 2000)
  )
    return null;
  return { ...body };
}
export function createWatchlistRouter(
  repository = store,
  findRecall = readRecall,
) {
  const router = Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!req.user)
      return res.status(400).json({ error: 'X-User-Id is required.' });
    next();
  });
  router.use(json({ limit: '16kb' }));
  router.param('id', (_req, res, next, id) => {
    if (!/^[0-9a-f]{24}$/i.test(id))
      return res.status(400).json({ error: 'Invalid watchlist identifier.' });
    next();
  });
  router.get('/', async (req, res) =>
    res.json({ items: await repository.readWatchlist(req.user.userId) }),
  );
  router.post('/', async (req, res) => {
    const body = req.body;
    if (
      !body ||
      Object.keys(body).some((key) => !['source', 'sourceId'].includes(key)) ||
      !['cpsc', 'health-canada'].includes(body.source) ||
      typeof body.sourceId !== 'string' ||
      !/^[1-9]\d{0,19}$/.test(body.sourceId)
    )
      return res.status(400).json({ error: 'Choose a valid recall.' });
    const recall = await findRecall(body.source, body.sourceId);
    if (!recall) return res.status(404).json({ error: 'Recall not found.' });
    res.status(201).json(await repository.saveRecall(req.user, recall));
  });
  router.patch('/:id', async (req, res) => {
    const fields = watchlistFields(req.body);
    if (!fields)
      return res.status(400).json({
        error: 'Choose a valid status and notes of at most 2000 characters.',
      });
    const item = await repository.updateWatchlist(
      req.user.userId,
      req.params.id,
      fields,
    );
    if (!item)
      return res.status(404).json({ error: 'Watchlist item not found.' });
    res.json(item);
  });
  router.delete('/:id', async (req, res) => {
    if (!(await repository.deleteWatchlist(req.user.userId, req.params.id)))
      return res.status(404).json({ error: 'Watchlist item not found.' });
    res.status(204).end();
  });
  router.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Send valid JSON.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Watchlist data is too large.' });
    res.status(503).json({ error: 'Watchlist data is currently unavailable.' });
  });
  return router;
}
export const watchlistRouter = createWatchlistRouter();
